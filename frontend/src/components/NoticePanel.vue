<script setup>
import { Box, Clock3, PackageCheck } from 'lucide-vue-next'
import { notices } from '../config/site.js'
const icons = { box: Box, clock: Clock3, package: PackageCheck }
</script>

<template>
  <div class="notice-list">
    <div v-for="notice in notices" :key="notice.title" class="notice-item"><component :is="icons[notice.icon]" :size="19" :stroke-width="1.6" /><div><h3>{{ notice.title }}</h3><p>{{ notice.text }}</p></div></div>
  </div>
</template>
