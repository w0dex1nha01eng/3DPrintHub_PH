<script setup>
import { ArrowRight } from 'lucide-vue-next'
import NoticePanel from '../components/NoticePanel.vue'
import SectionHeading from '../components/SectionHeading.vue'
import { site } from '../config/site.js'
</script>

<template>
  <div class="page-heading"><div><h1>打印须知</h1></div></div>
  <section class="guide-notices"><NoticePanel /></section>
  <section class="content-section"><SectionHeading title="常见问题" /><div class="faq-list"><details v-for="(item, index) in site.questions" :key="index"><summary>{{ item.question }}</summary><p>{{ item.answer }}</p></details></div></section>
  <RouterLink to="/" class="button button-primary">返回下单<ArrowRight :size="16" /></RouterLink>
</template>
