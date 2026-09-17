import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // 管理端独立入口、路由和 dist；仅复用客户工程的基础组件、样式、请求函数。
    base: '/admin/',
    plugins: [vue()],
    resolve: {
      alias: { '@client': fileURLToPath(new URL('../frontend/src', import.meta.url)) },
      dedupe: ['vue', 'vue-router', 'axios', 'lucide-vue-next'],
    },
    server: {
      fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
      proxy: { '/api': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:8000', changeOrigin: true } },
    },
  }
})
