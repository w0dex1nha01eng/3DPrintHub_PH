"""读取 3MF，并按原始坐标检查尺寸。"""
from pathlib import PurePosixPath
from io import BytesIO
from zipfile import BadZipFile, ZipFile
import xml.etree.ElementTree as ET

import lib3mf
import numpy as np
from fastapi import HTTPException

from .stl import assert_dimensions, parse_slots

CORE = "{http://schemas.microsoft.com/3dmanufacturing/core/2015/02}"
# 这些上限和前端一致，防止小压缩包解开后占满内存。
MAX_EXPANDED = 128 * 1024 * 1024
MAX_XML = 32 * 1024 * 1024
MAX_ENTRIES = 2048
MAX_INSTANCES = 4096
MAX_TRIANGLES = 500_000
MAX_VERTICES = 1_500_000
UNITS = {"micron": .001, "millimeter": 1, "centimeter": 10, "inch": 25.4, "foot": 304.8, "meter": 1000}
REVIEWABLE_PARSE_REASONS = (
    "expanded archive too large",
    "XML too large",
    "expanded mesh too large",
    "assembly too complex",
    "beam lattice geometry unsupported",
    "mixed part units unsupported",
    "mesh geometry required",
    "incomplete components",
)


def unsafe_zip_entry(item):
    name = item.filename
    return (name.startswith("/") or "\\" in name or ":" in name
            or ".." in PurePosixPath(name).parts or item.flag_bits & 1
            or item.compress_type not in (0, 8))


def local_name(tag):
    return tag.rsplit("}", 1)[-1].lower()


def read_parts(path):
    parts, names, total, xml_size = {}, set(), 0, 0
    with ZipFile(path) as package:
        entries = package.infolist()
        if len(entries) > MAX_ENTRIES:
            raise ValueError("too many entries")
        for item in entries:
            name = item.filename
            if name in names or unsafe_zip_entry(item):
                raise ValueError("unsafe package path")
            names.add(name)
            total += item.file_size
            if total > MAX_EXPANDED or item.compress_type not in (0, 8):
                raise ValueError("expanded archive too large or unsupported compression")
            is_xml = name.lower().endswith((".model", ".xml", ".rels"))
            if is_xml:
                xml_size += item.file_size
                if xml_size > MAX_XML:
                    raise ValueError("XML too large")
            # 在内存里逐个检查，不把包内文件落到磁盘。
            with package.open(item) as source:
                content = source.read(item.file_size + 1)
                if len(content) != item.file_size:
                    raise ValueError("invalid expanded length")
            if not is_xml:
                continue
            if b"<!DOCTYPE" in content.upper() or b"<!ENTITY" in content.upper() or b"\x00" in content:
                raise ValueError("DTD and non UTF-8 XML unsupported")
            content.decode("utf-8-sig")
            document = ET.iterparse(BytesIO(content), events=("start", "end"))
            depth = 0
            for event, _node in document:
                depth += 1 if event == "start" else -1
                if depth > 100:
                    raise ValueError("XML nesting too deep")
            root = document.root
            if name.lower().endswith(".rels") and any(e.get("TargetMode", "").lower() == "external" for e in root):
                raise ValueError("external relationships unsupported")
            if name.lower().endswith(".model"):
                if root.tag != CORE + "model" or root.get("unit", "millimeter") not in UNITS:
                    raise ValueError("invalid model root or unit")
                # 晶格可能伸到网格外，先交给人工确认。
                if any(node.tag.rsplit("}", 1)[-1].lower() == "beamlattice" for node in root.iter()):
                    raise ValueError("beam lattice geometry unsupported")
                parts["/" + name] = root
    return parts


def transform(text):
    result = np.eye(4)
    if text is not None:
        values = np.array([float(value) for value in text.split()])
        if values.size != 12 or not np.isfinite(values).all():
            raise ValueError("invalid transform")
        result[:, :3] = values.reshape(4, 3)
    return result


def inspect_3mf(path):
    with parse_slots:
        try:
            parts = read_parts(path)
            wrapper = lib3mf.get_wrapper()
            model = wrapper.CreateModel()
            reader = model.QueryReader("3mf")
            # SDK 负责格式和零件引用，包里的切片参数不用。
            reader.ReadFromFile(str(path))
            root = parts[model.RootModelPart().GetPath()]
            unit = UNITS[root.get("unit", "millimeter")]
            raw_objects = {}
            for part, document in parts.items():
                if UNITS[document.get("unit", "millimeter")] != unit:
                    raise ValueError("mixed part units unsupported")
                for obj in document.findall(f"{CORE}resources/{CORE}object"):
                    key = (part, int(obj.attrib["id"]))
                    if key in raw_objects:
                        raise ValueError("duplicate object")
                    raw_objects[key] = obj
            minimum, maximum = np.full(3, np.inf), np.full(3, -np.inf)
            instances = triangles = vertex_count = 0
            meshes = {}

            def visit(obj, matrix, ancestors):
                nonlocal instances, triangles, vertex_count, minimum, maximum
                instances += 1
                key = (obj.PackagePart().GetPath(), obj.GetModelResourceID())
                if instances > MAX_INSTANCES or len(ancestors) >= 32:
                    raise ValueError("assembly too complex")
                if key in ancestors:
                    raise ValueError("cyclic assembly unsupported")
                raw = raw_objects[key]
                if obj.IsMeshObject():
                    mesh = model.GetMeshObjectByID(obj.GetUniqueResourceID())
                    triangles += mesh.GetTriangleCount()
                    vertex_count += mesh.GetVertexCount()
                    if triangles > MAX_TRIANGLES or vertex_count > MAX_VERTICES:
                        raise ValueError("expanded mesh too large")
                    if key not in meshes:
                        vertices = np.array([[float(v.attrib[axis]) for axis in ("x", "y", "z")]
                                             for v in raw.findall(f"{CORE}mesh/{CORE}vertices/{CORE}vertex")])
                        faces = np.array([[int(t.attrib[axis]) for axis in ("v1", "v2", "v3")]
                                          for t in raw.findall(f"{CORE}mesh/{CORE}triangles/{CORE}triangle")])
                        if (len(vertices) != mesh.GetVertexCount() or len(faces) != mesh.GetTriangleCount()
                                or len(vertices) < 3 or len(faces) == 0 or not np.isfinite(vertices).all()
                                or np.min(faces) < 0 or np.max(faces) >= len(vertices)):
                            raise ValueError("invalid mesh")
                        meshes[key] = vertices
                    points = (meshes[key] @ matrix[:3, :3] + matrix[3, :3]) * unit
                    if not np.isfinite(points).all():
                        raise ValueError("invalid transformed vertices")
                    minimum = np.minimum(minimum, points.min(axis=0))
                    maximum = np.maximum(maximum, points.max(axis=0))
                elif obj.IsComponentsObject():
                    components = model.GetComponentsObjectByID(obj.GetUniqueResourceID())
                    raw_components = raw.findall(f"{CORE}components/{CORE}component")
                    if len(raw_components) != components.GetComponentCount():
                        raise ValueError("incomplete components")
                    for index, component in enumerate(raw_components):
                        child = components.GetComponent(index).GetObjectResource()
                        visit(child, transform(component.get("transform")) @ matrix, ancestors | {key})
                else:
                    raise ValueError("mesh geometry required")

            items = model.GetBuildItems()
            raw_items = root.findall(f"{CORE}build/{CORE}item")
            if not raw_items or len(raw_items) != items.Count():
                raise ValueError("missing build geometry")
            for raw in raw_items:
                items.MoveNext()
                visit(items.GetCurrent().GetObjectResource(), transform(raw.get("transform")), set())
            size = maximum - minimum
            if not np.isfinite(size).all() or np.max(size) <= 0:
                raise ValueError("empty geometry")
        except Exception as error:
            raise HTTPException(422, "无法读取有效的 3MF 模型，或模型结构超出支持范围。请导出单个装配的 3MF/STL；不能上传仅含切片指令的文件。") from error
        return assert_dimensions(size)


def can_queue_for_manual_3mf_review(path, error):
    """复杂但结构还算可信的文件可以留给人工看。"""
    cause = error.__cause__
    reason = str(cause or error)
    if not any(text in reason for text in REVIEWABLE_PARSE_REASONS):
        return False
    try:
        with ZipFile(path) as package:
            entries = package.infolist()
            if not entries or len(entries) > MAX_ENTRIES:
                return False
            seen, has_reviewable_model = set(), False
            for item in entries:
                if item.filename in seen or unsafe_zip_entry(item):
                    return False
                seen.add(item.filename)
                if not item.filename.lower().endswith(".model"):
                    continue
                with package.open(item) as source:
                    if item.file_size <= MAX_XML:
                        content = source.read(item.file_size + 1)
                        if len(content) != item.file_size or b"<!DOCTYPE" in content.upper() or b"<!ENTITY" in content.upper() or b"\x00" in content:
                            return False
                        root = ET.fromstring(content.decode("utf-8-sig"))
                        has_build_item = any(local_name(node.tag) == "item" for node in root.iter())
                        has_reviewable_model = local_name(root.tag) == "model" and root.get("unit", "millimeter") in UNITS and has_build_item
                    else:
                        head = source.read(65536)
                        has_reviewable_model = b"\x00" not in head and b"<" in head and b"model" in head.lower()
                if has_reviewable_model:
                    return True
    except (BadZipFile, ET.ParseError, OSError, UnicodeError, ValueError):
        return False
    return False
