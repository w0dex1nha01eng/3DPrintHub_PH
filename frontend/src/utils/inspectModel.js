// 一个个解析，几个大文件一起跑很容易吃满内存。
let queue = Promise.resolve()
const cache = new WeakMap()

export function inspectModel(file) {
  return inspectModelData(file)
}

// 检查和预览共用这次结果。
export function inspectModelData(file) {
  if (cache.has(file)) return cache.get(file)
  const pending = queue.then(() => new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/modelInspector.worker.js', import.meta.url), { type: 'module' })
    // 超时就报错，不能顺手跳过尺寸检查。
    const timer = setTimeout(() => finish(new Error('模型解析超时，请简化模型后重试。')), 120000)
    function finish(error, result) {
      clearTimeout(timer)
      worker.terminate()
      if (error) reject(error)
      else resolve(result)
    }
    worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data)
    worker.onerror = () => finish(new Error('模型校验失败，请重新选择文件。'))
    worker.postMessage(file)
  }))
  cache.set(file, pending)
  queue = pending.catch(() => {})
  return pending
}
