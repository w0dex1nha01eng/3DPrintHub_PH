import axios from 'axios'

export class ApiError extends Error {
  constructor(message, status = 0, code = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export const request = axios.create({ baseURL: '/api', timeout: 30000 })

request.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') return response.data
    const body = response.data
    if (!body || typeof body !== 'object' || typeof body.code !== 'number') {
      throw new ApiError('服务返回的数据格式不正确，请稍后重试。', response.status)
    }
    if (body.code !== 0) throw new ApiError(body.message || '请求未完成，请重试。', response.status, body.code)
    return body.data
  },
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    const status = error.response?.status || 0
    const messages = {
      401: '身份验证失败，请重新登录或检查查询凭证。',
      403: '当前凭证无权访问这条记录。',
      404: error.config?.method === 'get' && /^\/(orders|admin\/orders|admin\/files)\//.test(error.config?.url || '')
        ? '未找到对应记录，请核对信息。'
        : '打印服务暂未就绪，请稍后重试。',
      413: '文件超过服务器允许的大小。',
      429: '请求过于频繁，请稍后重试。',
    }
    const message = messages[status] || (status >= 500 || !status
      ? '暂时无法连接打印服务，请稍后重试。'
      : error.response?.data?.message || '请求未完成，请检查填写内容。')
    return Promise.reject(new ApiError(message, status, error.response?.data?.code))
  },
)
