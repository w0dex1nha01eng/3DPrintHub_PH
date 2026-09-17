import { colors, materials } from '../config/site.js'

export function validateOrder(form, files = []) {
  const errors = {}
  if (!files.length) errors.files = '请至少选择一个 STL 或 3MF 模型。'
  if (!form.customer_name?.trim()) errors.customer_name = '请填写姓名或称呼。'
  else if (form.customer_name.trim().length > 64) errors.customer_name = '姓名不能超过 64 个字符。'
  if (!form.contact?.trim()) errors.contact = '请填写手机、微信、QQ 或邮箱。'
  else if (form.contact.trim().length < 3 || form.contact.trim().length > 128) errors.contact = '联系方式应为 3 到 128 个字符。'
  if ((form.campus_id || '').length > 64) errors.campus_id = '校内身份信息不能超过 64 个字符。'
  if (!materials.some((m) => m.id === form.material)) errors.material = '请选择打印材料。'
  if (!colors.some((c) => c.id === form.color && c.material_id === form.material)) errors.color = '请选择当前种类下的具体耗材。'
  if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 1 || Number(form.quantity) > 100) errors.quantity = '数量应为 1 到 100 的整数。'
  if ((form.note || '').length > 1000) errors.note = '备注不能超过 1000 个字符。'
  if (!form.accepted) errors.accepted = '请先确认打印须知。'
  return errors
}

export function formatMoney(cents) {
  return cents == null ? '待确认' : `¥${(cents / 100).toFixed(2)}`
}

export function formatDate(value) {
  if (!value) return '暂无'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '暂无' : new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
