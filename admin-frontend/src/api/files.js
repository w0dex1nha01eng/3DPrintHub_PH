import { request } from '@client/utils/request.js'
export const getFiles = (params, auth) => request.get('/admin/files', { params, auth })
export const deleteFile = (id, auth) => request.delete(`/admin/files/${encodeURIComponent(id)}`, { auth })
