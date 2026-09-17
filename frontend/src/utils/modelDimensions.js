import { STLLoader } from 'three/addons/loaders/STLLoader.js'
export { assertModelFits } from './modelLimits.js'

// 尺寸检查不依赖预览，大文件也照常检查。
export function readSTLDimensions(buffer) {
  let geometry
  try {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 84) throw new Error('invalid STL')
    const header = new DataView(buffer)
    const expected = 84 + header.getUint32(80, true) * 50
    const ascii = expected !== buffer.byteLength && /^\s*solid/i.test(new TextDecoder().decode(buffer.slice(0, 80)))
    // 先看长度，坏文件就别继续占内存了。
    if (!ascii && expected !== buffer.byteLength) throw new Error('invalid binary length')
    geometry = new STLLoader().parse(buffer)
    const positions = geometry.getAttribute('position')
    if (!positions || positions.count < 3 || positions.count % 3 !== 0) throw new Error('invalid triangles')
    for (const value of positions.array) if (!Number.isFinite(value)) throw new Error('invalid vertex')
    geometry.computeBoundingBox()
    const { min, max } = geometry.boundingBox
    let dimensions = [max.x - min.x, max.y - min.y, max.z - min.z]
    if (ascii) {
      // ASCII 顶点再用原始数值算一遍，避免 Float32 把轻微超限抹掉。
      const source = new TextDecoder().decode(buffer)
      const lows = [Infinity, Infinity, Infinity]
      const highs = [-Infinity, -Infinity, -Infinity]
      let count = 0
      for (const match of source.matchAll(/\bvertex\s+(\S+)\s+(\S+)\s+(\S+)/g)) {
        const values = match.slice(1).map(Number)
        if (!values.every(Number.isFinite)) throw new Error('invalid vertex')
        values.forEach((value, axis) => { lows[axis] = Math.min(lows[axis], value); highs[axis] = Math.max(highs[axis], value) })
        count++
      }
      if (count !== positions.count) throw new Error('incomplete geometry')
      dimensions = highs.map((value, axis) => value - lows[axis])
    }
    if (!dimensions.every(Number.isFinite) || Math.max(...dimensions) <= 0) throw new Error('invalid bounds')
    return dimensions
  } catch {
    throw new Error('无法读取有效的 STL 模型，请检查文件后重新导出。')
  } finally { geometry?.dispose() }
}
