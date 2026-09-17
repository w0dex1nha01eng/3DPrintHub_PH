<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, RefreshCw, LoaderCircle, FileBox, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { getFiles } from '../api/files.js'
import { adminSession } from '../stores/adminSession.js'
import { formatBytes } from '@client/utils/file.js'
import { formatDate } from '@client/utils/validators.js'
import IconButton from '@client/components/IconButton.vue'
import ModelFileActions from '../components/ModelFileActions.vue'
const router = useRouter()
const rows = ref([]), total = ref(0), page = ref(1), q = ref(''), status = ref('active')
const loading = ref(false), error = ref(''), message = ref('')
async function load(reset = false) {
  if (loading.value) return
  if (reset) page.value = 1
  loading.value = true; error.value = ''
  try {
    const data = await getFiles({ page: page.value, page_size: 20, q: q.value, status: status.value }, adminSession.getAuth())
    rows.value = data.items; total.value = data.total
    if (!rows.value.length && page.value > 1) { page.value--; loading.value = false; return load() }
  } catch (cause) {
    error.value = cause.message
    if (cause.status === 401) { adminSession.logout(); router.replace('/login') }
  } finally { loading.value = false }
}
function deleted(file) { const row = rows.value.find((item) => item.id === file.id); if (row) row.deleted_at = file.deleted_at; message.value = '模型文件已删除，订单记录已保留。'; load() }
function dimensionLabel(file) {
  return Array.isArray(file.dimensions_mm) ? `${file.dimensions_mm.join(' × ')} mm` : '尺寸待人工确认'
}
onMounted(() => load())
</script>

<template>
  <header class="settings-heading"><div><h1>模型文件</h1><p class="muted">{{ total }} 条记录</p></div><IconButton label="刷新文件列表" :disabled="loading" @click="load()"><RefreshCw :size="17" :class="{ spin: loading }" /></IconButton></header>
  <form class="file-filters" @submit.prevent="load(true)"><label>文件名 / 订单号<input v-model="q" maxlength="128" type="search" /></label><label>文件状态<select v-model="status" @change="load(true)"><option value="active">现存文件</option><option value="unbound">未关联订单</option><option value="deleted">已删除</option><option value="all">全部记录</option></select></label><button class="button button-primary" :disabled="loading"><Search :size="16" />查询</button></form>
  <p v-if="error" class="error-banner" role="alert">{{ error }}</p><p v-if="message" class="text-green" role="status">{{ message }}</p>
  <div v-if="loading" class="loading-state" role="status"><LoaderCircle class="spin" :size="24" />正在加载文件</div>
  <div v-else class="model-file-list"><article v-for="file in rows" :key="file.id" class="model-file-row"><FileBox :size="24" /><div class="model-file-info"><strong>{{ file.original_name }}</strong><small>{{ formatBytes(file.file_size) }} · {{ dimensionLabel(file) }}</small><RouterLink v-if="file.order_id" :to="`/orders/${file.order_id}`" class="text-link">{{ file.order_no }}</RouterLink><span v-else class="muted">未关联订单</span><small v-if="file.deleted_at">删除于 {{ formatDate(file.deleted_at) }}</small></div><ModelFileActions :file="file" @deleted="deleted" /></article><div v-if="!rows.length" class="empty-state"><FileBox :size="32" /><p>暂无符合条件的模型文件</p></div></div>
  <div class="file-pagination"><IconButton label="上一页" :disabled="loading || page <= 1" @click="page--; load()"><ChevronLeft :size="16" /></IconButton><span>{{ page }} / {{ Math.max(1, Math.ceil(total / 20)) }}</span><IconButton label="下一页" :disabled="loading || page * 20 >= total" @click="page++; load()"><ChevronRight :size="16" /></IconButton></div>
</template>
