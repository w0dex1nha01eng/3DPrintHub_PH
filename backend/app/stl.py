from threading import BoundedSemaphore

import numpy as np
import trimesh
from fastapi import HTTPException

from .config import PRINT_VOLUME_MM

# 大模型一个个解析，省点内存。
parse_slots = BoundedSemaphore(1)


def inspect_stl(path):
    with parse_slots:
        try:
            # 不自动修模型，原文件有问题就直接提示。
            mesh = trimesh.load_mesh(path, file_type="stl", process=False, allow_remote=False)
            vertices = np.asarray(mesh.vertices)
            if len(mesh.faces) == 0 or vertices.shape[0] < 3 or not np.isfinite(vertices).all():
                raise ValueError("invalid vertices")
            size = vertices.max(axis=0) - vertices.min(axis=0)
            if not np.isfinite(size).all() or np.max(size) <= 0:
                raise ValueError("invalid bounds")
        except Exception as error:
            raise HTTPException(422, "无法读取有效的 STL 模型，请检查文件后重新导出。") from error

        return assert_dimensions(size)


def assert_dimensions(size):
    # 两种格式都按原方向逐轴比较，不先四舍五入。
    if np.any(size > np.array(PRINT_VOLUME_MM)):
        measured = " × ".join(f"{value:.8f}".rstrip("0").rstrip(".") for value in size)
        raise HTTPException(422, f"单模型尺寸 {measured} mm 超出 K1C 上限 220 × 220 × 250 mm（X/Y/Z）。")
    return size.tolist()
