<script setup>
import { useRoute, useRouter } from 'vue-router'
import { Box, ClipboardList, SlidersHorizontal, ArrowUpRight, LogOut, FileBox, FilePenLine } from 'lucide-vue-next'
import { adminSession } from './stores/adminSession.js'

const route = useRoute()
const router = useRouter()
const clientUrl = import.meta.env.VITE_CLIENT_URL || (import.meta.env.DEV ? 'http://127.0.0.1:5173/' : '/')
async function logout() {
  // 先让路由问完，取消离开时别把登录状态清掉。
  const failure = await router.push('/login')
  if (!failure) adminSession.logout()
}
</script>

<template>
  <div class="admin-shell">
    <header class="management-header">
      <RouterLink to="/" class="management-brand"><Box :size="25" /><strong>PrintHub</strong><span>管理后台</span></RouterLink>
      <div class="management-account"><a :href="clientUrl" class="text-link">客户端<ArrowUpRight :size="15" /></a><button v-if="adminSession.state.authenticated" type="button" class="icon-button" title="退出登录" aria-label="退出登录" @click="logout"><LogOut :size="18" /></button></div>
    </header>
    <div class="management-body" :class="{ 'login-layout': route.meta.public }">
      <nav v-if="!route.meta.public" class="management-nav" aria-label="管理导航">
        <RouterLink to="/settings" :class="{ active: route.path === '/settings' }"><SlidersHorizontal :size="18" />耗材管理</RouterLink>
        <RouterLink to="/content" :class="{ active: route.path === '/content' }"><FilePenLine :size="18" />客户端内容</RouterLink>
        <RouterLink to="/files" :class="{ active: route.path === '/files' }"><FileBox :size="18" />模型文件</RouterLink>
        <RouterLink to="/orders" :class="{ active: route.path.startsWith('/orders') }"><ClipboardList :size="18" />订单管理</RouterLink>
        <span class="management-user">{{ adminSession.state.username }}</span>
      </nav>
      <main class="management-content"><RouterView :key="route.path" /></main>
    </div>
  </div>
</template>
