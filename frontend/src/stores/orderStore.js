import { inject, markRaw, reactive, readonly } from 'vue'
import { createOrder } from '../api/order.js'
import { uploadModel } from '../api/upload.js'
import { site, materials, colors, PRINT_VOLUME_MM } from '../config/site.js'
import { validateFile } from '../utils/file.js'
import { validateOrder } from '../utils/validators.js'
import { inspectModel } from '../utils/inspectModel.js'
import { assertModelFits } from '../utils/modelLimits.js'
import { refreshCatalog } from './catalogStore.js'
import { filamentsFor } from '../utils/filaments.js'

export const orderKey = Symbol('order')
const emptyForm = () => ({ customer_name: '', campus_id: '', contact: '', material: materials[0]?.id || '', color: filamentsFor(materials[0]?.id, colors)[0]?.id || '', quantity: 1, note: '', accepted: false })
const validFileStates = new Set(['valid', 'review'])

function normalizeInspection(result) {
  if (Array.isArray(result)) return { dimensions: result, reviewRequired: false, message: '' }
  return { dimensions: result?.dimensions || null, reviewRequired: !!result?.reviewRequired, message: result?.message || '' }
}

export function createOrderStore(dependencies = {}) {
  const api = { uploadModel, createOrder, inspectModel, refreshCatalog, ...dependencies }
  const state = reactive({ form: emptyForm(), files: [], activeId: null, errors: {}, fileError: '', error: '', phase: 'idle', receipt: null })
  const checks = new Map()

  function checkFile(item) {
    const pending = api.inspectModel(item.file).then((result) => {
      const data = normalizeInspection(result)
      item.dimensions = data.dimensions
      item.reviewRequired = data.reviewRequired
      item.reviewMessage = data.message
      if (data.reviewRequired) {
        item.validation = 'review'
        return
      }
      assertModelFits(data.dimensions, PRINT_VOLUME_MM)
      item.validation = 'valid'
    }).catch((error) => {
      item.validation = 'invalid'
      item.validationError = error.message || '模型校验失败。'
      item.reviewRequired = false
      item.reviewMessage = ''
    })
    checks.set(item.id, pending)
    pending.finally(() => checks.delete(item.id))
  }

  const actions = {
    update(field, value) {
      if (state.phase !== 'idle' || !(field in state.form)) return
      state.form[field] = value
      // 用户自己换种类时才帮他选第一条耗材。
      if (field === 'material') {
        state.form.color = filamentsFor(value, colors)[0]?.id || ''
        delete state.errors.color
      }
      delete state.errors[field]
    },
    addFiles(files) {
      if (state.phase !== 'idle') return
      const errors = []
      for (const file of files) {
        const error = validateFile(file)
        if (error) { errors.push(`${file.name}：${error}`); continue }
        if (state.files.some((item) => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)) continue
        if (state.files.length >= site.maxFiles) { errors.push(`每个订单最多包含 ${site.maxFiles} 个模型。`); break }
        const id = crypto.randomUUID()
        state.files.push({ id, file: markRaw(file), progress: 0, status: 'ready', uploaded: null, dimensions: null, reviewRequired: false, reviewMessage: '', validation: 'checking', validationError: '' })
        checkFile(state.files[state.files.length - 1])
        state.activeId = id
      }
      state.fileError = errors.join(' ')
      if (state.files.length) delete state.errors.files
    },
    selectFile(id) { state.activeId = id },
    removeFile(id) {
      if (state.phase !== 'idle') return
      state.files = state.files.filter((item) => item.id !== id)
      if (state.activeId === id) state.activeId = state.files[0]?.id || null
    },
    reset() {
      if (state.phase !== 'idle') return
      Object.assign(state, { form: emptyForm(), files: [], activeId: null, errors: {}, error: '', fileError: '', receipt: null })
    },
    async submit() {
      if (state.phase !== 'idle' || state.receipt) return false
      state.error = ''
      state.phase = 'checking'
      try {
        // 先查完这一批，再开始上传。
        await api.refreshCatalog()
        state.errors = validateOrder(state.form, state.files)
        if (state.files.length > site.maxFiles) state.errors.files = `每个订单最多 ${site.maxFiles} 个模型。`
        if (Object.keys(state.errors).length) return false
        for (const item of state.files) {
          await checks.get(item.id)
          const error = validateFile(item.file) || item.validationError
          if (error || !validFileStates.has(item.validation)) throw new Error(`${item.file.name}：${error || '模型尚未通过尺寸校验。'}`)
          if (item.validation === 'valid') assertModelFits(item.dimensions, PRINT_VOLUME_MM)
        }
        state.phase = 'uploading'
        for (const item of state.files) {
          const expiry = Date.parse(item.uploaded?.upload_expires_at)
          if (item.uploaded && Number.isFinite(expiry) && expiry > Date.now() + 60000) continue
          item.status = 'uploading'
          item.progress = 0
          item.uploaded = null
          try {
            const uploaded = await api.uploadModel(item.file, { onProgress: (progress) => { item.progress = progress } })
            if (uploaded?.id == null || !uploaded.upload_token) throw new Error('上传服务未返回有效的文件凭证。')
            item.uploaded = uploaded
            item.reviewRequired = item.reviewRequired || !!uploaded.review_required
            item.status = 'uploaded'
            item.progress = 100
          } catch (error) {
            item.status = 'failed'
            throw error
          }
        }
        state.phase = 'submitting'
        const { accepted, ...form } = state.form
        const result = await api.createOrder({
          ...form,
          customer_name: form.customer_name.trim(),
          contact: form.contact.trim(),
          campus_id: form.campus_id.trim(),
          note: form.note.trim(),
          quantity: Number(form.quantity),
          file_bindings: state.files.map((item) => ({ file_id: item.uploaded.id, upload_token: item.uploaded.upload_token })),
        })
        if (!result?.order_no || !result.query_token) throw new Error('服务未返回完整的订单凭证，请联系我们确认提交结果。')
        state.receipt = result
        return true
      } catch (error) {
        state.error = error.message || '提交未完成，请稍后重试。'
        return false
      } finally {
        state.phase = 'idle'
      }
    },
  }

  return { state: readonly(state), actions }
}

export function useOrder() {
  const context = inject(orderKey)
  if (!context) throw new Error('OrderProvider is required')
  return context
}
