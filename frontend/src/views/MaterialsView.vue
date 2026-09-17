<script setup>
import { ArrowRight, Layers3, CircleHelp } from 'lucide-vue-next'
import { materials, site } from '../config/site.js'
import PriceTable from '../components/PriceTable.vue'
import SectionHeading from '../components/SectionHeading.vue'
</script>

<template>
  <div class="page-heading"><div><h1>材料与价格</h1></div><RouterLink class="button button-primary" to="/">新建打印<ArrowRight :size="16" /></RouterLink></div>
  <div class="material-catalog">
    <article v-for="material in materials" :key="material.id" class="material-card">
      <div class="material-catalog-symbol" :style="{ background: material.color }"><Layers3 :size="38" :stroke-width="1.1" /></div>
      <div class="material-card-heading"><h2>{{ material.name }}</h2><span>{{ material.label }}</span></div>
      <p>{{ material.description }}</p><small>{{ material.tags }}</small><div class="material-price">¥{{ (material.price / 100).toFixed(2) }}<span> / 克起</span></div>
    </article>
  </div>
  <section class="content-section"><SectionHeading title="计价说明" /><PriceTable /><div class="inline-note"><CircleHelp :size="18" /><p>{{ site.copy.pricing_details }}</p></div></section>
</template>
