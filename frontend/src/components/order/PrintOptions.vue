<script setup>
import { computed, watch } from 'vue'
import { Check, Minus, Plus } from 'lucide-vue-next'
import { materials, colors } from '../../config/site.js'
import { useOrder } from '../../stores/orderStore.js'
import SectionHeading from '../SectionHeading.vue'
import FormField from '../FormField.vue'
import IconButton from '../IconButton.vue'
import { filamentLabel, filamentsFor } from '../../utils/filaments.js'

const { state, actions } = useOrder()
// 只给空表单选默认值，已有选择不自动替换。
watch(() => materials[0]?.id, (id) => { if (id && !state.form.material) actions.update('material', id) }, { immediate: true })
const options = computed(() => filamentsFor(state.form.material, colors))
const selected = computed(() => options.value.find((item) => item.id === state.form.color))
watch(() => options.value[0]?.id, (id) => { if (id && !state.form.color) actions.update('color', id) }, { immediate: true })
</script>

<template>
  <section class="print-options">
    <SectionHeading title="打印参数" />
    <fieldset class="material-fieldset">
      <legend class="field-label">耗材种类</legend>
      <div class="material-options">
        <label v-for="material in materials" :key="material.id" class="material-option" :class="{ selected: state.form.material === material.id }">
          <input type="radio" name="material" :value="material.id" :checked="state.form.material === material.id" @change="actions.update('material', material.id)" />
          <span class="material-option-top"><strong>{{ material.name }}</strong><Check v-if="state.form.material === material.id" :size="13" /></span>
          <span>{{ material.label }}</span><small>¥{{ (material.price / 100).toFixed(2) }} / 克起</small>
        </label>
      </div>
    </fieldset>
    <p v-if="state.errors.material" class="field-error">{{ state.errors.material }}</p>
    <div class="filament-picker">
      <label for="filament" class="field-label">具体耗材</label>
      <select id="filament" :value="state.form.color" :aria-invalid="!!state.errors.color" @change="actions.update('color', $event.target.value)">
        <option v-if="!selected" value="" disabled>请选择耗材</option>
        <option v-for="item in options" :key="item.id" :value="item.id">{{ filamentLabel(item) }} · ¥{{ (item.price / 100).toFixed(2) }}/克</option>
      </select>
      <div v-if="selected" class="filament-preview">
        <span class="filament-swatch" :style="{ backgroundColor: selected.hex }" :aria-label="`预览颜色 ${selected.hex}`"></span>
        <div class="filament-copy">
          <div class="filament-title"><strong>{{ filamentLabel(selected) }}</strong><small>{{ selected.hex.toUpperCase() }}</small></div>
          <p v-if="selected.features">{{ selected.features }}</p>
        </div>
      </div>
    </div>
    <p v-if="state.errors.color" class="field-error">{{ state.errors.color }}</p>
    <FormField label="打印数量" for-id="quantity" :error="state.errors.quantity" hint="每个模型">
      <div class="quantity-control">
        <IconButton label="减少数量" :disabled="Number(state.form.quantity) <= 1" @click="actions.update('quantity', Number(state.form.quantity) - 1)"><Minus :size="15" /></IconButton>
        <input id="quantity" type="number" min="1" max="100" step="1" :value="state.form.quantity" :aria-invalid="!!state.errors.quantity" aria-describedby="quantity-error" @input="actions.update('quantity', $event.target.value)" />
        <IconButton label="增加数量" :disabled="Number(state.form.quantity) >= 100" @click="actions.update('quantity', Number(state.form.quantity) + 1)"><Plus :size="15" /></IconButton>
        <span>件 / 模型</span>
      </div>
    </FormField>
  </section>
</template>
