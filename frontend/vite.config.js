import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    worker: { format: 'es' },
    // 官方 WASM 模块使用顶层 await；生产资源随站点打包，内网不依赖 CDN。
    optimizeDeps: { exclude: ['@3mfconsortium/lib3mf'] },
    server: {
      proxy: { '/api': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:8000', changeOrigin: true } },
    },
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks: { 'model-viewer': ['three', 'three/addons/loaders/STLLoader.js', 'three/addons/controls/OrbitControls.js'] },
        },
      },
    },
  }
})
