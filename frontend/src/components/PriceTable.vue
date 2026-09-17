<script setup>
import { materials, colors, site } from '../config/site.js'
import { filamentsFor, filamentLabel } from '../utils/filaments.js'
</script>

<template>
  <div class="price-table-wrap">
    <table class="price-table">
      <thead><tr><th>耗材 / 品牌 / 型号 / 色号</th><th>特性</th><th class="align-right">每克价格</th></tr></thead>
      <tbody v-for="material in materials" :key="material.id">
        <tr class="price-group"><th colspan="3" scope="colgroup">{{ material.name }}</th></tr>
        <tr v-for="item in filamentsFor(material.id, colors)" :key="item.id"><td><span class="material-dot" :style="{ background: item.hex }"></span><strong>{{ filamentLabel(item) }}</strong></td><td>{{ item.features || material.label }}</td><td class="align-right"><strong>¥{{ (item.price / 100).toFixed(2) }}</strong><small> / 克</small></td></tr>
      </tbody>
    </table>
    <p class="muted price-caption">{{ site.copy.pricing_note }}</p>
  </div>
</template>
