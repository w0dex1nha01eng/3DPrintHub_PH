import { request } from '../utils/request.js'

export function createOrder(payload) {
  return request.post('/orders', payload)
}

export function lookupOrder(orderNo, token) {
  return request.get(`/orders/${encodeURIComponent(orderNo)}`, { headers: { 'X-Order-Token': token } })
}

export function getAdminOrders(params, auth) {
  return request.get('/admin/orders', { params, auth })
}

export function getAdminOrder(id, auth) {
  return request.get(`/admin/orders/${encodeURIComponent(id)}`, { auth })
}

export function updateOrderStatus(id, status, auth) {
  return request.put(`/admin/orders/${encodeURIComponent(id)}/status`, { status }, { auth })
}
