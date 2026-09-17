// colors 是旧字段名，现在里面放的是具体耗材。
export function filamentsFor(materialId, items) {
  return items.filter((item) => item.material_id === materialId)
}

export function filamentLabel(item) {
  return [item.brand, item.model, item.name, item.color_code].filter(Boolean).join(' / ')
}

export function hexToRgb(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error('颜色应为六位 HEX 色值。')
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16))
}

export function rgbToHex(values) {
  // RGB 只收 0 到 255 的整数，不偷偷改用户的输入。
  if (values.length !== 3 || values.some((value) => !/^\d{1,3}$/.test(String(value)) || Number(value) > 255)) {
    throw new Error('RGB 的 R、G、B 均须为 0 到 255 的整数。')
  }
  return `#${values.map((value) => Number(value).toString(16).padStart(2, '0')).join('')}`
}
