import { readSTLDimensions } from '../utils/modelDimensions.js'
import { site } from '../config/site.js'

self.onmessage = async ({ data: file }) => {
  const is3mf = /\.3mf$/i.test(file.name)
  try {
    const buffer = await file.arrayBuffer()
    if (is3mf) {
      const { read3MF } = await import('../utils/threeMF.js')
      const result = await read3MF(buffer, { preview: file.size <= site.maxPreviewSize })
      self.postMessage(result, result.positions ? [result.positions.buffer] : [])
    } else {
      self.postMessage({ dimensions: readSTLDimensions(buffer) })
    }
  } catch (error) {
    if (is3mf && error.reviewRequired) {
      self.postMessage({ dimensions: null, positions: null, triangles: 0, reviewRequired: true, message: '3MF 结构较复杂，提交后由我们人工确认尺寸和可打印性。' })
    } else self.postMessage({ error: error.message || '模型解析失败，不能上传。' })
  }
}
