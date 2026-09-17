import { reactive, readonly } from 'vue'
import { getCatalog } from '../api/catalog.js'

const state = reactive({ username: '', authenticated: false })
// 仅放内存
let credentials = null

export const adminSession = {
  state: readonly(state),
  getAuth: () => credentials,
  async login(username, password) {
    const next = { username: username.trim(), password }
    await getCatalog(next)
    credentials = next
    state.username = next.username
    state.authenticated = true
  },
  logout() {
    credentials = null
    state.username = ''
    state.authenticated = false
  },
}
