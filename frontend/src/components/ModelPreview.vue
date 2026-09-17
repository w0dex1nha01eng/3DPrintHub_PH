<script setup>
import { ref } from 'vue'
import { Maximize, RotateCw, Pause, ZoomIn, ZoomOut, Scan, Box, LoaderCircle } from 'lucide-vue-next'
import { useModelPreview } from '../composables/useModelPreview.js'
import IconButton from './IconButton.vue'

const props = defineProps({ file: Object, color: { type: String, default: '#eeeeea' } })
const container = ref(null)
const { state, fit, zoom, toggleRotate, toggleWireframe } = useModelPreview(container, props)
</script>

<template>
  <div class="model-preview" :data-preview-state="state.phase">
    <div class="preview-caption"><span><Box :size="14" />模型预览</span><span v-if="file" class="preview-tag">{{ file.name.split('.').pop().toUpperCase() }}</span></div>
    <div ref="container" class="model-canvas"></div>
    <div v-if="state.phase === 'loading'" class="preview-message"><LoaderCircle class="spin" :size="23" /><span>模型加载中</span></div>
    <div v-else-if="state.phase !== 'ready'" class="preview-message"><Box :size="28" /><span>{{ state.message }}</span></div>
    <div v-if="file" class="preview-toolbar" role="toolbar" aria-label="三维预览工具">
      <IconButton label="适应画面" :disabled="state.phase !== 'ready'" @click="fit"><Maximize :size="16" /></IconButton>
      <IconButton label="放大" :disabled="state.phase !== 'ready'" @click="zoom(0.85)"><ZoomIn :size="17" /></IconButton>
      <IconButton label="缩小" :disabled="state.phase !== 'ready'" @click="zoom(1.15)"><ZoomOut :size="17" /></IconButton>
      <span class="toolbar-divider"></span>
      <IconButton :label="state.rotating ? '暂停旋转' : '自动旋转'" :aria-pressed="state.rotating" :disabled="state.phase !== 'ready'" @click="toggleRotate"><component :is="state.rotating ? Pause : RotateCw" :size="16" /></IconButton>
      <IconButton label="线框模式" :aria-pressed="state.wireframe" :disabled="state.phase !== 'ready'" @click="toggleWireframe"><Scan :size="16" /></IconButton>
    </div>
    <div v-if="file" class="preview-base"><span>XYZ <span class="muted">/</span> mm</span><span>{{ state.triangles.toLocaleString() }} 个三角面</span></div>
  </div>
  <dl v-if="file || state.dimensions" class="model-metrics"><div><dt>模型尺寸 <span>按毫米解读</span></dt><dd>{{ state.dimensions ? state.dimensions.join(' × ') : '—' }}<small v-if="state.dimensions"> mm</small></dd></div><div><dt>三角面</dt><dd>{{ state.triangles ? state.triangles.toLocaleString() : '—' }}</dd></div></dl>
</template>
