import { computed, reactive, ref } from 'vue'
import { hexToRgb, rgbToHex } from '@client/utils/filaments.js'

export function yuanToCents(input) {
  // 页面填元，保存时换成分。多出来的小数直接提示。
  const text = String(input).trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('单价应为非负金额，最多两位小数。')
  const [yuan, decimal = ''] = text.split('.')
  const cents = Number(yuan) * 100 + Number(decimal.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents > 100000) throw new Error('材料单价不能超过 1000 元/克。')
  return cents
}

export function catalogPayload(draft) {
  for (const key of ['materials', 'colors']) {
    const items = draft[key]
    if (!items.some((item) => item.enabled)) throw new Error('至少保留一种启用的耗材和颜色。')
    const names = items.map((item) => item.name.trim().toLowerCase())
    if (names.some((name) => !name) || (key === 'materials' && new Set(names).size !== names.length)) throw new Error('名称不能为空，种类名称不能重复。')
  }
  if (draft.materials.some((item) => /tpu/i.test(item.id) || /tpu/i.test(item.name)) || draft.colors.some((item) => /tpu/i.test(item.model))) throw new Error('本服务不提供 TPU 耗材。')
  const colors = draft.colors.map(({ priceYuan, rgb, ...item }) => ({ ...item, name: item.name.trim(), hex: rgbToHex(rgb), price: yuanToCents(priceYuan) }))
  if (colors.some((item) => !draft.materials.some((material) => material.id === item.material_id))) throw new Error('具体耗材必须归属于存在的种类。')
  const materials = draft.materials.map((item) => {
    const prices = colors.filter((color) => color.material_id === item.id && color.enabled).map((color) => color.price)
    if (item.enabled && !prices.length) throw new Error('每种启用的材料至少保留一条启用的具体耗材。')
    return { ...item, name: item.name.trim(), price: prices.length ? Math.min(...prices) : item.price }
  })
  return {
    revision: draft.revision,
    materials, colors,
    content: JSON.parse(JSON.stringify(draft.content)),
  }
}

export function createCatalogEditor(api) {
  const state = reactive({ draft: null, limits: null, loading: false, saving: false, error: '', message: '' })
  const baseline = ref('')
  // 输入框有时会把字符串变成数字，比较时先统一一下。
  function snapshot(draft) {
    return JSON.stringify(draft, (key, value) => {
      if (key === 'rgb') return value.map(String)
      if (key === 'priceYuan') { try { return yuanToCents(value) } catch { return value } }
      return value
    })
  }
  const dirty = computed(() => state.draft !== null && snapshot(state.draft) !== baseline.value)

  function apply(data) {
    state.draft = {
      revision: data.revision,
      materials: data.materials.map((item) => ({ ...item })),
      colors: data.colors.map(({ price, ...item }) => ({ ...item, priceYuan: (price / 100).toFixed(2), rgb: hexToRgb(item.hex) })),
      content: JSON.parse(JSON.stringify(data.content)),
    }
    state.limits = data.limits
    baseline.value = snapshot(state.draft)
  }

  const actions = {
    async load() {
      if (state.loading || state.saving) return
      state.loading = true
      state.error = ''; state.message = ''
      try { apply(await api.get()) }
      catch (error) { state.error = error.message; api.onError?.(error) }
      finally { state.loading = false }
    },
    async save() {
      if (!dirty.value || state.loading || state.saving) return false
      state.saving = true
      state.error = ''; state.message = ''
      try {
        const data = await api.save(catalogPayload(state.draft))
        // 后端确认后再更新底稿，保存失败时还能继续改。
        apply(data)
        state.message = '配置已保存'
        return true
      } catch (error) { state.error = error.message; api.onError?.(error); return false }
      finally { state.saving = false }
    },
    addMaterial() {
      if (!state.draft || state.saving || state.loading || state.draft.materials.length >= 50) return
      const id = `mat_${crypto.randomUUID().slice(0, 8)}`
      state.draft.materials.push({ id, name: '', label: '', price: 0, description: '', color: '#bad0e2', tags: '', enabled: true })
      actions.addColor(id)
      state.message = ''
    },
    addColor(materialId = state.draft?.materials[0]?.id) {
      if (!state.draft || state.saving || state.loading || state.draft.colors.length >= 500) return
      state.draft.colors.push({ id: `color_${crypto.randomUUID().slice(0, 8)}`, material_id: materialId, name: '', hex: '#87b1ce', rgb: [135, 177, 206], brand: '', model: '', color_code: '', features: '', priceYuan: '0.00', enabled: true })
      state.message = ''
    },
    remove(group, id) {
      if (!state.draft || state.saving || state.loading) return
      state.draft[group] = state.draft[group].filter((item) => item.id !== id)
      if (group === 'materials') state.draft.colors = state.draft.colors.filter((item) => item.material_id !== id)
      state.message = ''
    },
  }
  return { state, dirty, actions }
}
