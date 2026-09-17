import { request } from '@client/utils/request.js'

export const getCatalog = (auth) => request.get('/admin/catalog', { auth })
export const saveCatalog = (payload, auth) => request.put('/admin/catalog', payload, { auth })
