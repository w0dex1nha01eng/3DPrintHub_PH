<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Box, ClipboardList, Layers3, BookOpen, MessageCircle, ShieldCheck, ArrowUpRight, Menu, X, ChevronRight, Plus } from 'lucide-vue-next'
import { site } from '../config/site.js'
import IconButton from './IconButton.vue'

const route = useRoute()
const open = ref(false)
const title = computed(() => route.meta.title || '打印服务')
const links = [
  { path: '/', title: '新建打印', icon: Plus },
  { path: '/orders', title: '订单查询', icon: ClipboardList },
  { path: '/materials', title: '材料与价格', icon: Layers3 },
  { path: '/guide', title: '打印须知', icon: BookOpen },
  { path: '/contact', title: '联系我们', icon: MessageCircle },
]
watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <div class="app-shell">
    <button v-if="open" class="nav-scrim" aria-label="关闭导航" @click="open = false"></button>
    <aside id="main-sidebar" class="sidebar" :class="{ 'is-open': open }">
      <RouterLink to="/" class="brand" :aria-label="`${site.name}首页`">
        <span class="brand-icon"><Box :size="25" :stroke-width="1.6" /></span>
        <strong>{{ site.name }}</strong>
      </RouterLink>
      <div class="nav-group-label">打印服务</div>
      <nav aria-label="主要导航">
        <RouterLink v-for="link in links" :key="link.path" :to="link.path" class="nav-link" :class="{ active: route.path === link.path }">
          <component :is="link.icon" :size="18" /><span>{{ link.title }}</span><ChevronRight v-if="route.path === link.path" class="nav-chevron" :size="14" />
        </RouterLink>
      </nav>
    </aside>
    <div class="app-body">
      <header class="topbar">
        <div class="breadcrumb">
          <IconButton class="mobile-menu" :label="open ? '关闭导航' : '打开导航'" :aria-expanded="open" aria-controls="main-sidebar" @click="open = !open"><component :is="open ? X : Menu" :size="20" /></IconButton>
          <span class="breadcrumb-root">工作台</span><ChevronRight :size="13" /><span>{{ title }}</span>
        </div>
        <a :href="site.adminUrl" class="admin-link"><ShieldCheck :size="16" /><span>管理入口</span><ArrowUpRight :size="14" /></a>
      </header>
      <main id="main-content" class="main-content"><slot /></main>
    </div>
  </div>
</template>
