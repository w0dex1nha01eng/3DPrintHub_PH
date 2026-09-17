import { reactive } from 'vue'

const siteName = 'PrintHub'

// K1C 的可打印范围，单位是 mm。换机器时记得同步后端。
export const PRINT_VOLUME_MM = Object.freeze([220, 220, 250])
export const printVolumeLabel = '220 × 220 × 250 mm'

export const site = reactive({
  name: siteName,
  // 页面启动后会换成后端给的限制。
  maxFileSize: 100 * 1024 * 1024,
  // 大文件不做预览，尺寸还是会检查。
  maxPreviewSize: 20 * 1024 * 1024,
  maxFiles: 5,
  // 本地管理端走 5174，上线后走 /admin/。
  adminUrl: import.meta.env.VITE_ADMIN_URL || (import.meta.env.DEV ? 'http://127.0.0.1:5174/admin/' : '/admin/'),
  contact: {
    name: siteName,
    location: '',
    hours: '',
    wechat: '',
    qq: '',
    email: '',
    phone: '',
  },
  copy: {},
  questions: [],
})

// 耗材和价格都以后端为准，连不上时不拿旧价格继续下单。
export const materials = reactive([])
export const colors = reactive([])

export const notices = reactive([
  { title: '模型与尺寸', text: '支持 STL / 3MF。标准模型会自动检查 X/Y/Z 是否不超过 220 × 220 × 250 mm；结构复杂的 3MF 可提交后由我们确认尺寸和可打印性。', icon: 'box' },
  { title: '报价与排期', text: '参考单价按克计费。实际耗材、支撑与打印时长经切片确认后，再沟通最终价格和交付时间。', icon: 'clock' },
  { title: '打印与取件', text: 'FDM 成品存在层纹，薄壁和悬垂结构会影响成型。打印完成后按约定地点校内自取。', icon: 'package' },
])
