import { site } from '../config/site.js'

export function validateFile(file) {
  if (!file || !/\.(stl|3mf)$/i.test(file.name)) return '请选择 .stl 或 .3mf 格式的模型文件。'
  if (!file.size) return '文件为空，请重新导出模型。'
  if (file.size > site.maxFileSize) return `单个文件不能超过 ${Number((site.maxFileSize / 1024 / 1024).toFixed(2))} MB。`
  return ''
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '未知大小'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.replace(/[\\/:*?"<>|]/g, '_')
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
