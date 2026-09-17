<script setup>
import { computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import { rgbToHex, hexToRgb } from '@client/utils/filaments.js'
import IconButton from '@client/components/IconButton.vue'
const props = defineProps({ item: Object, index: Number })
defineEmits(['remove'])
const preview = computed(() => { try { return rgbToHex(props.item.rgb) } catch { return null } })
function pickColor(event) { props.item.rgb = hexToRgb(event.target.value) }
</script>

<template>
  <article class="filament-editor-row" :class="{ 'option-disabled': !item.enabled }" :aria-label="`具体耗材 ${index + 1}`">
    <div class="material-row-heading"><span class="material-row-number">{{ String(index + 1).padStart(2, '0') }}</span><label class="enable-option"><input v-model="item.enabled" type="checkbox" />启用</label><span class="record-id">{{ item.id }}</span><IconButton :label="`删除具体耗材 ${item.name || index + 1}`" @click="$emit('remove', item)"><Trash2 :size="16" /></IconButton></div>
    <div class="stock-fields">
      <label>品牌<input v-model="item.brand" maxlength="64" /></label>
      <label>型号<input v-model="item.model" maxlength="64" /></label>
      <label>颜色名称<input v-model="item.name" maxlength="32" required /></label>
      <label>色号<input v-model="item.color_code" maxlength="64" /></label>
      <label>每克价格（元）<input v-model="item.priceYuan" type="number" min="0" max="1000" step="0.01" inputmode="decimal" required /></label>
      <div class="rgb-editor"><span>RGB 预览</span><div class="rgb-controls"><input type="color" :value="preview || item.hex" aria-label="颜色选择器" @input="pickColor" /><label v-for="(channel, axis) in ['R', 'G', 'B']" :key="channel">{{ channel }}<input v-model="item.rgb[axis]" type="number" min="0" max="255" step="1" required :aria-label="channel" /></label></div><small :class="{ 'field-error': !preview }">{{ preview?.toUpperCase() || 'RGB 须为 0–255 整数' }}</small></div>
      <label class="stock-features">特性<textarea v-model="item.features" rows="2" maxlength="300"></textarea></label>
    </div>
  </article>
</template>
