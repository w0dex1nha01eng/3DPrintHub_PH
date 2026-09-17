import { request } from '../utils/request.js'

export function uploadModel(file, { onProgress, signal } = {}) {
  const body = new FormData()
  body.append('file', file)
  return request.post('/files/upload', body, {
    timeout: 5 * 60 * 1000,
    signal,
    onUploadProgress: (event) => onProgress?.(Math.min(99, Math.round((event.loaded / (event.total || file.size)) * 100))),
  })
}

export function downloadModel(id, auth) {
  return request.get(`/admin/files/${encodeURIComponent(id)}/download`, { responseType: 'blob', auth })
}
