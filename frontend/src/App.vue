<script setup>
import { onMounted, onUnmounted } from 'vue'
import AppShell from './components/AppShell.vue'
import OrderProvider from './components/order/OrderProvider.vue'
import { catalogState, refreshCatalog } from './stores/catalogStore.js'

let timer
function reloadCatalog() { if (!document.hidden) refreshCatalog().catch(() => {}) }
onMounted(() => {
  reloadCatalog()
  window.addEventListener('focus', reloadCatalog)
  document.addEventListener('visibilitychange', reloadCatalog)
  // 页面开着时偶尔刷新一下，下单前再确认一次。
  timer = setInterval(reloadCatalog, 60000)
})
onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('focus', reloadCatalog)
  document.removeEventListener('visibilitychange', reloadCatalog)
})
</script>

<template>
  <OrderProvider>
    <AppShell>
      <p v-if="catalogState.error" class="error-banner" role="alert">{{ catalogState.error }} <button type="button" class="text-link" :disabled="catalogState.loading" @click="reloadCatalog">重新加载配置</button></p>
      <p v-else-if="!catalogState.ready" class="muted" role="status">正在加载打印配置…</p>
      <RouterView />
    </AppShell>
  </OrderProvider>
</template>
