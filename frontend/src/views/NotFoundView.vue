<script setup>
import { ArrowLeft } from 'lucide-vue-next'
</script>
<template><div class="empty-state"><span class="not-found-number">404</span><h1>页面不存在</h1><p>这个地址可能已更改。</p><RouterLink class="button button-primary" to="/"><ArrowLeft :size="16" />返回打印服务</RouterLink></div></template>
