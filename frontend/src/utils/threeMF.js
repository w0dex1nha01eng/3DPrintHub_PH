import { Unzip, UnzipInflate } from 'fflate'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { Matrix4, Vector3 } from 'three'

// 这些上限和后端保持一致，主要是防压缩包把内存撑满。
const MAX_EXPANDED = 128 * 1024 * 1024
const MAX_XML = 32 * 1024 * 1024
const MAX_ENTRIES = 2048
const MAX_INSTANCES = 4096
const MAX_TRIANGLES = 500000
const MAX_VERTICES = 1500000
const MAX_PREVIEW_TRIANGLES = 250000
const units = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 }
const message = '无法读取有效的 3MF 模型，或模型结构超出支持范围。请导出单个装配的 3MF/STL；不能上传仅含切片指令的文件。'
const reviewableReasons = [
  'expanded archive too large',
  'XML too large',
  'expanded mesh too large',
  'assembly too complex',
  'beam lattice geometry unsupported',
  'mixed part units',
  'mesh geometry required',
  'incomplete components',
]

function canQueueForManualReview(cause) {
  const reason = String(cause?.message || cause || '')
  return reviewableReasons.some((text) => reason.includes(text))
}

function readParts(bytes) {
  const parts = new Map()
  const names = new Set()
  let expanded = 0, xmlSize = 0, finished = 0
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, maxNestedTags: 100,
    parseAttributeValue: false, processEntities: false,
    isArray: (name) => ['object', 'vertex', 'triangle', 'component', 'item', 'Relationship'].includes(name) })
  const unzip = new Unzip((file) => {
    const name = file.name
    if (names.has(name) || names.size >= MAX_ENTRIES || name.startsWith('/') || /[\\:]/.test(name) || name.split('/').includes('..')) throw new Error('unsafe package')
    names.add(name)
    const xml = /\.(model|xml|rels)$/i.test(name)
    const chunks = []
    let size = 0
    file.ondata = (error, data, final) => {
      if (error) throw error
      size += data.length
      expanded += data.length
      if (xml) xmlSize += data.length
      if (expanded > MAX_EXPANDED || xmlSize > MAX_XML) throw new Error('expanded archive too large')
      if (xml) chunks.push(data)
      if (!final) return
      finished++
      if (file.originalSize !== undefined && size !== file.originalSize) throw new Error('incomplete archive')
      if (!xml) return
      const content = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) { content.set(chunk, offset); offset += chunk.length }
      const text = new TextDecoder('utf-8', { fatal: true }).decode(content)
      if (/<!DOCTYPE|<!ENTITY|\u0000/i.test(text) || XMLValidator.validate(text) !== true) throw new Error('unsafe XML')
      const document = parser.parse(text)
      if (/\.rels$/i.test(name) && document.Relationships?.Relationship?.some((r) => r['@_TargetMode']?.toLowerCase() === 'external')) throw new Error('external relationship')
      if (/\.model$/i.test(name)) {
        if (!document.model || !Object.hasOwn(units, document.model['@_unit'] || 'millimeter')) throw new Error('invalid model')
        const nodes = [document.model]
        while (nodes.length) {
          const node = nodes.pop()
          for (const [tag, value] of Object.entries(node)) {
            if (tag.toLowerCase() === 'beamlattice') throw new Error('beam lattice geometry unsupported')
            if (value && typeof value === 'object') nodes.push(value)
          }
        }
        parts.set('/' + name, document.model)
      }
    }
    file.start()
  })
  unzip.register(UnzipInflate)
  // 分块解压，超限时可以早点停。
  for (let start = 0; start < bytes.length; start += 16384) unzip.push(bytes.subarray(start, start + 16384), start + 16384 >= bytes.length)
  if (finished !== names.size || !parts.size) throw new Error('incomplete archive')
  return parts
}

function transform(text) {
  if (text === undefined) return new Matrix4()
  const values = text.trim().split(/\s+/).map(Number)
  if (values.length !== 12 || !values.every(Number.isFinite)) throw new Error('invalid transform')
  // 3MF 和 Three.js 的矩阵方向不一样，这里转一下。
  const v = values
  return new Matrix4().set(v[0], v[3], v[6], v[9], v[1], v[4], v[7], v[10], v[2], v[5], v[8], v[11], 0, 0, 0, 1)
}

export async function read3MF(buffer, { preview = true } = {}) {
  const handles = []
  const keep = (handle) => { handles.push(handle); return handle }
  let sdk
  try {
    const bytes = new Uint8Array(buffer)
    const parts = readParts(bytes)
    // 只有读 3MF 时才加载 WASM。
    const { default: initialize } = await import('@3mfconsortium/lib3mf')
    // 虚拟程序名用纯英文，中文目录下更稳。
    sdk = await initialize({ thisProgram: '/model-inspector' })
    const wrapper = keep(new sdk.CWrapper())
    const model = keep(wrapper.CreateModel())
    const reader = keep(model.QueryReader('3mf'))
    sdk.FS.writeFile('/input.3mf', bytes)
    reader.ReadFromFile('/input.3mf')
    const root = parts.get(keep(model.RootModelPart()).GetPath())
    const unit = units[root['@_unit'] || 'millimeter']
    const rawObjects = new Map()
    for (const [part, document] of parts) {
      if (units[document['@_unit'] || 'millimeter'] !== unit) throw new Error('mixed part units')
      for (const object of document.resources?.object || []) {
        const key = part + '#' + Number(object['@_id'])
        if (rawObjects.has(key)) throw new Error('duplicate object')
        rawObjects.set(key, object)
      }
    }
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
    const meshes = new Map(), instances = []
    let visits = 0, triangles = 0, vertexCount = 0
    const point = new Vector3()
    function visit(object, matrix, ancestors) {
      const key = keep(object.PackagePart()).GetPath() + '#' + object.GetModelResourceID()
      visits += 1
      if (visits > MAX_INSTANCES || ancestors.size >= 32) throw new Error('assembly too complex')
      if (ancestors.has(key)) throw new Error('cyclic assembly unsupported')
      const raw = rawObjects.get(key)
      if (object.IsMeshObject()) {
        const mesh = keep(model.GetMeshObjectByID(object.GetUniqueResourceID()))
        triangles += mesh.GetTriangleCount()
        vertexCount += mesh.GetVertexCount()
        if (triangles > MAX_TRIANGLES || vertexCount > MAX_VERTICES) throw new Error('expanded mesh too large')
        if (!meshes.has(key)) {
          // 坐标从 XML 取原值，免得 Float32 漏掉一点点超限。
          const vertices = (raw.mesh?.vertices?.vertex || []).map((v) => ['x', 'y', 'z'].map((axis) => Number(v['@_' + axis])))
          const faces = (raw.mesh?.triangles?.triangle || []).map((t) => ['v1', 'v2', 'v3'].map((axis) => Number(t['@_' + axis])))
          if (vertices.length !== mesh.GetVertexCount() || faces.length !== mesh.GetTriangleCount() || vertices.length < 3 || !faces.length
            || vertices.some((v) => !v.every(Number.isFinite)) || faces.some((f) => !f.every((i) => Number.isInteger(i) && i >= 0 && i < vertices.length))) throw new Error('invalid mesh')
          meshes.set(key, { vertices, faces })
        }
        const geometry = meshes.get(key)
        for (const v of geometry.vertices) {
          point.fromArray(v).applyMatrix4(matrix).multiplyScalar(unit)
          for (let axis = 0; axis < 3; axis++) {
            const value = point.getComponent(axis)
            if (!Number.isFinite(value)) throw new Error('invalid transformed vertex')
            min[axis] = Math.min(min[axis], value)
            max[axis] = Math.max(max[axis], value)
          }
        }
        if (preview && triangles <= MAX_PREVIEW_TRIANGLES) instances.push({ ...geometry, matrix })
      } else if (object.IsComponentsObject()) {
        const components = keep(model.GetComponentsObjectByID(object.GetUniqueResourceID()))
        const children = raw.components?.component || []
        if (children.length !== components.GetComponentCount()) throw new Error('incomplete components')
        for (let i = 0; i < children.length; i++) {
          const child = keep(keep(components.GetComponent(i)).GetObjectResource())
          visit(child, matrix.clone().multiply(transform(children[i]['@_transform'])), new Set([...ancestors, key]))
        }
      } else throw new Error('mesh geometry required')
    }
    const build = keep(model.GetBuildItems())
    const rawItems = root.build?.item || []
    if (!rawItems.length || rawItems.length !== Number(build.Count())) throw new Error('missing build geometry')
    for (const item of rawItems) {
      build.MoveNext()
      visit(keep(keep(build.GetCurrent()).GetObjectResource()), transform(item['@_transform']), new Set())
    }
    const dimensions = max.map((value, axis) => value - min[axis])
    if (!dimensions.every(Number.isFinite) || Math.max(...dimensions) <= 0) throw new Error('empty geometry')
    let positions = null
    if (preview && triangles <= MAX_PREVIEW_TRIANGLES) {
      positions = new Float32Array(triangles * 9)
      let index = 0
      for (const instance of instances) for (const face of instance.faces) for (const vertex of face) {
        point.fromArray(instance.vertices[vertex]).applyMatrix4(instance.matrix).multiplyScalar(unit)
        // 先移回原点，远处的小模型预览不会糊掉。
        for (let axis = 0; axis < 3; axis++) positions[index++] = point.getComponent(axis) - min[axis]
      }
    }
    return { dimensions, positions, triangles }
  } catch (cause) {
    const error = new Error(message, { cause })
    error.reviewRequired = canQueueForManualReview(cause)
    throw error
  } finally {
    for (const handle of handles.reverse()) handle.delete()
    if (sdk?.FS.analyzePath('/input.3mf').exists) sdk.FS.unlink('/input.3mf')
  }
}
