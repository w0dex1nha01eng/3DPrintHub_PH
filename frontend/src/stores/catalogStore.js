import { reactive, readonly } from 'vue'
import { request } from '../utils/request.js'
import { colors, materials, notices, PRINT_VOLUME_MM, site } from '../config/site.js'

const state = reactive({ ready: false, loading: false, error: '', revision: null })
export const catalogState = readonly(state)
let pending = null

function cleanCopy(value) {
  if (typeof value === 'string') return value.replaceAll('工作室', '我们')
  if (Array.isArray(value)) return value.map(cleanCopy)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanCopy(item)]))
  return value
}

export function applyCatalog(data) {
  if (!Array.isArray(data?.materials) || !data.materials.length || !Array.isArray(data.colors) || !data.colors.length
    || !data.materials.every((item) => typeof item.id === 'string' && typeof item.name === 'string' && Number.isInteger(item.price) && item.price >= 0)
    || !data.colors.every((item) => typeof item.id === 'string' && typeof item.name === 'string' && /^#[0-9a-f]{6}$/i.test(item.hex)
      && data.materials.some((material) => material.id === item.material_id) && Number.isInteger(item.price) && item.price >= 0)
    || !data.materials.every((material) => data.colors.some((item) => item.material_id === material.id))
    || !data.content?.contact || !data.content.copy || !Array.isArray(data.content.notices) || !Array.isArray(data.content.questions)
    || !Number.isInteger(data.limits?.max_file_size) || data.limits.max_file_size <= 0
    || !Number.isInteger(data.limits?.max_files) || data.limits.max_files <= 0
    || !Array.isArray(data.limits.dimensions_mm) || data.limits.dimensions_mm.length !== 3
    || data.limits.dimensions_mm.some((value, axis) => value !== PRINT_VOLUME_MM[axis])) {
    throw new Error('打印配置格式或机型限制不一致，请联系管理员。')
  }
  // 不换数组本身，已经打开的页面也能跟着更新。
  materials.splice(0, materials.length, ...data.materials)
  colors.splice(0, colors.length, ...data.colors)
  const content = cleanCopy(data.content)
  Object.assign(site.contact, content.contact)
  site.copy = content.copy
  site.questions = content.questions
  notices.splice(0, notices.length, ...content.notices)
  site.maxFileSize = data.limits.max_file_size
  site.maxFiles = data.limits.max_files
  state.revision = data.revision
  state.ready = true
  state.error = ''
}

export function refreshCatalog() {
  if (pending) return pending
  state.loading = true
  pending = request.get('/catalog').then(applyCatalog).catch((error) => {
    state.ready = false
    state.error = error.message || '无法加载打印配置。'
    throw error
  }).finally(() => { state.loading = false; pending = null })
  return pending
}
