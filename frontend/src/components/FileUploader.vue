<script setup>
import { ref } from 'vue'
import { Upload, FileBox, X, Check, LoaderCircle, AlertCircle } from 'lucide-vue-next'
import { formatBytes } from '../utils/file.js'
import { site, printVolumeLabel } from '../config/site.js'
import IconButton from './IconButton.vue'

defineProps({ files: { type: Array, default: () => [] }, activeId: String, error: String, disabled: Boolean })
const emit = defineEmits(['select', 'remove', 'activate'])
const input = ref(null)
const dragging = ref(false)

function onSelect(event) {
  emit('select', Array.from(event.target.files || []))
  event.target.value = ''
}

function onDrop(event, disabled) {
  dragging.value = false
  if (!disabled) emit('select', Array.from(event.dataTransfer.files))
}
</script>

<template>
  <div class="uploader">
    <div class="drop-zone" :class="{ dragging, disabled }" @dragover.prevent="dragging = !disabled" @dragleave.prevent="dragging = false" @drop.prevent="onDrop($event, disabled)">
      <div class="upload-symbol"><Upload :size="22" :stroke-width="1.6" /></div>
      <div class="drop-copy"><strong>拖入 STL / 3MF 模型文件</strong><span>最多 {{ site.maxFiles }} 个文件，单个不超过 {{ formatBytes(site.maxFileSize) }}</span></div>
      <button type="button" class="button button-outline button-small" :disabled="disabled" @click="input.click()">选择文件</button>
      <input ref="input" class="sr-only" type="file" accept=".stl,.3mf" multiple tabindex="-1" aria-label="选择 STL 或 3MF 文件" :disabled="disabled" @change="onSelect" />
    </div>
    <p class="upload-limits">K1C · 单模型 X/Y/Z ≤ {{ printVolumeLabel }}</p>
    <p v-if="error" class="field-error upload-error" role="alert"><AlertCircle :size="15" />{{ error }}</p>
    <ul v-if="files.length" class="file-list" aria-label="已选择模型">
      <li v-for="item in files" :key="item.id" class="file-item" :class="{ selected: activeId === item.id, 'invalid-model': item.validation === 'invalid', 'review-model': item.validation === 'review' || item.reviewRequired }">
        <button type="button" class="file-select" :aria-pressed="activeId === item.id" @click="emit('activate', item.id)">
          <FileBox :size="22" /><span><strong :title="item.file.name">{{ item.file.name }}</strong><small>{{ formatBytes(item.file.size) }} <span v-if="item.status === 'uploading'">· 上传中 {{ item.progress }}%</span><span v-else-if="item.status === 'uploaded' && item.reviewRequired">· 已上传 · 待人工确认</span><span v-else-if="item.status === 'uploaded'">· 已上传</span><span v-else-if="item.status === 'failed'">· 上传失败</span><span v-else-if="item.validation === 'checking'">· 正在检查尺寸</span><span v-else-if="item.validation === 'valid'">· 尺寸合格</span><span v-else-if="item.validation === 'review'">· 待人工确认</span><span v-else>· 不可上传</span></small><small v-if="item.dimensions">X/Y/Z {{ item.dimensions.map((value) => Number(value.toFixed(5))).join(' × ') }} mm</small><small v-else-if="item.validation === 'review' || item.reviewRequired">尺寸待人工确认</small></span>
        </button>
        <LoaderCircle v-if="item.status === 'uploading' || item.validation === 'checking'" class="spin" :size="16" />
        <Check v-else-if="item.status === 'uploaded'" class="text-green" :size="16" />
        <IconButton :label="`移除 ${item.file.name}`" :disabled="disabled" @click="emit('remove', item.id)"><X :size="16" /></IconButton>
        <p v-if="item.validationError" class="file-validation-error" role="alert">{{ item.validationError }}</p>
        <p v-if="item.reviewMessage" class="file-review-message" role="status">{{ item.reviewMessage }}</p>
        <progress v-if="item.status === 'uploading'" :value="item.progress" max="100" :aria-label="`${item.file.name} 上传进度`"></progress>
      </li>
    </ul>
  </div>
</template>
