<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, FileBox, LoaderCircle, Save, RefreshCw } from 'lucide-vue-next'
import { getAdminOrder, updateOrderStatus } from '@client/api/order.js'
import { adminSession } from '../stores/adminSession.js'
import { orderStatuses } from '@client/constants/orderStatus.js'
import { formatDate, formatMoney } from '@client/utils/validators.js'
import { formatBytes } from '@client/utils/file.js'
import { filamentLabel } from '@client/utils/filaments.js'
import ModelFileActions from '../components/ModelFileActions.vue'
import OrderStatusBadge from '@client/components/OrderStatusBadge.vue'
import OrderTimeline from '@client/components/OrderTimeline.vue'

const route = useRoute()
const router = useRouter()
const order = ref(null)
const status = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const message = ref('')

function report(cause) {
  error.value = cause.message
  if (cause.status === 401) { adminSession.logout(); router.replace('/login') }
}
async function load() {
  loading.value = true
  error.value = ''
  try { order.value = await getAdminOrder(route.params.id, adminSession.getAuth()); status.value = order.value.status }
  catch (cause) { report(cause) }
  finally { loading.value = false }
}
async function save() {
  saving.value = true
  error.value = ''
  message.value = ''
  try { await updateOrderStatus(order.value.id, status.value, adminSession.getAuth()); order.value.status = status.value; message.value = '订单状态已保存。' }
  catch (cause) { report(cause) }
  finally { saving.value = false }
}
function dimensionLabel(file) {
  return Array.isArray(file.dimensions_mm) ? `${file.dimensions_mm.join(' × ')} mm` : '尺寸待人工确认'
}
onMounted(load)
</script>

<template>
  <RouterLink to="/orders" class="text-link back-link"><ArrowLeft :size="16" />返回订单列表</RouterLink>
  <p v-if="error" class="error-banner" role="alert">{{ error }}</p>
  <div v-if="loading" class="loading-state" role="status"><LoaderCircle class="spin" :size="24" />正在加载订单</div>
  <template v-else-if="order">
    <div class="page-heading"><div><h1>{{ order.order_no }}</h1><p>{{ formatDate(order.created_at) }}</p></div><OrderStatusBadge :status="order.status" /></div>
    <OrderTimeline :status="order.status" />
    <section class="content-section"><h2>订单信息</h2><dl class="detail-grid"><div><dt>联系人</dt><dd>{{ order.customer_name }}</dd></div><div><dt>联系方式</dt><dd>{{ order.contact }}</dd></div><div><dt>学号 / 工号</dt><dd>{{ order.campus_id || '未填写' }}</dd></div><div><dt>材料 / 颜色</dt><dd>{{ order.catalog_snapshot?.material?.name || order.material }} / {{ order.catalog_snapshot?.color?.name || order.color }}</dd></div><div><dt>打印数量</dt><dd>{{ order.quantity }} 件 / 模型</dd></div><div><dt>最终价格</dt><dd>{{ formatMoney(order.final_price) }}</dd></div></dl><div class="order-note"><span class="muted">备注</span><p>{{ order.note || '无备注' }}</p></div></section>
    <section v-if="order.catalog_snapshot?.color" class="order-stock-detail"><h2>下单耗材快照</h2><div class="filament-preview"><span class="filament-swatch" :style="{ background: order.catalog_snapshot.color.hex }"></span><div><strong>{{ filamentLabel(order.catalog_snapshot.color) }}</strong><p>{{ order.catalog_snapshot.color.features }}</p><small>{{ formatMoney(order.catalog_snapshot.color.price ?? order.catalog_snapshot.material.price) }} / 克</small></div></div></section>
    <section class="content-section"><h2>模型文件</h2><div v-for="file in order.files || []" :key="file.id" class="model-file-row"><FileBox :size="23" /><div class="model-file-info"><strong>{{ file.original_name }}</strong><small>{{ formatBytes(file.file_size) }} · {{ dimensionLabel(file) }}</small></div><ModelFileActions :file="file" @deleted="file.deleted_at = $event.deleted_at" /></div><p v-if="!order.files?.length" class="muted">暂无关联文件。</p></section>
    <form class="status-editor" @submit.prevent="save"><label for="order-status">订单状态</label><select id="order-status" v-model="status" :disabled="saving"><option v-for="(entry, key) in orderStatuses" :key="key" :value="key">{{ entry.label }}</option></select><button class="button button-primary" :disabled="saving || status === order.status"><LoaderCircle v-if="saving" class="spin" :size="16" /><Save v-else :size="16" />保存状态</button><p v-if="message" role="status" class="text-green">{{ message }}</p></form>
  </template>
  <button v-else class="button button-outline" @click="load"><RefreshCw :size="16" />重新加载</button>
</template>
