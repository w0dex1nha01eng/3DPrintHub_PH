// 这里只比尺寸，不用加载 Three.js。
export function assertModelFits(dimensions, limits = [220, 220, 250]) {
  if (!Array.isArray(dimensions) || dimensions.length !== 3 || !dimensions.every((value) => Number.isFinite(value) && value >= 0) || Math.max(...dimensions) <= 0) {
    throw new Error('模型尺寸无效，不能上传。')
  }
  // 每个文件单独比三条轴，比较前不四舍五入。
  if (dimensions.some((value, axis) => value > limits[axis])) {
    const axes = ['X', 'Y', 'Z']
    const exceeded = dimensions.map((value, axis) => value > limits[axis] ? `${axes[axis]}=${value} > ${limits[axis]}` : '').filter(Boolean)
    throw new Error(`超出 K1C 单模型尺寸上限：${exceeded.join('，')} mm。上限为 220 × 220 × 250 mm（X/Y/Z）。`)
  }
}
