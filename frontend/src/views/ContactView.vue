<script setup>
import { ArrowRight } from 'lucide-vue-next'
import { site } from '../config/site.js'
import ContactInfo from '../components/ContactInfo.vue'
</script>

<template>
  <div class="page-heading"><div><h1>联系我们</h1></div></div>
  <section class="contact-surface"><ContactInfo /><p class="muted">{{ site.copy.contact_note }}</p><RouterLink to="/" class="button button-primary">提交打印需求<ArrowRight :size="16" /></RouterLink></section>
</template>
