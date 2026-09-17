<script setup>
import { ref } from 'vue'
import { Search, LoaderCircle, ClipboardList } from 'lucide-vue-next'
import { lookupOrder } from '../api/order.js'
import { useOrder } from '../stores/orderStore.js'
import { formatDate, formatMoney } from '../utils/validators.js'
import FormField from '../components/FormField.vue'
import OrderStatusBadge from '../components/OrderStatusBadge.vue'
import OrderTimeline from '../components/OrderTimeline.vue'

const { state } = useOrder()
const orderNo = ref(state.receipt?.order_no || '')
const token = ref(state.receipt?.query_token || '')
const loading = ref(false)
const error = ref('')
const result = ref(null)

async function search() {
  if (loading.value) return
  result.value = null
  if (!orderNo.value.trim() || !token.value.trim()) { error.value = '请填写订单编号和查询凭证。'; return }
  loading.value = true
  error.value = ''
  try { result.value = await lookupOrder(orderNo.value.trim(), token.value.trim()) }
  catch (cause) { error.value = cause.message }
  finally { loading.value = false }
}
</script>

<template>
  <div class="page-heading"><div><h1>订单查询</h1></div></div>
  <form class="lookup-form" @submit.prevent="search"><FormField label="订单编号" for-id="order-no"><input id="order-no" v-model="orderNo" autocomplete="off" placeholder="下单后获得的订单编号" maxlength="64" /></FormField><FormField label="查询凭证" for-id="query-token"><input id="query-token" v-model="token" autocomplete="off" placeholder="订单凭证中的查询码" maxlength="256" /></FormField><button class="button button-primary" :disabled="loading"><LoaderCircle v-if="loading" class="spin" :size="17" /><Search v-else :size="17" />查询订单</button></form>
  <p v-if="error" class="error-banner" role="alert">{{ error }}</p>
  <section v-if="result" class="order-result" aria-live="polite"><div class="section-heading"><h2>{{ result.order_no }}</h2><OrderStatusBadge :status="result.status" /></div><OrderTimeline :status="result.status" /><dl class="detail-grid"><div><dt>提交时间</dt><dd>{{ formatDate(result.created_at) }}</dd></div><div><dt>打印材料</dt><dd>{{ result.material || '待确认' }}</dd></div><div><dt>打印数量</dt><dd>{{ result.quantity }} 件 / 模型</dd></div><div><dt>最终报价</dt><dd>{{ formatMoney(result.final_price) }}</dd></div></dl></section>
  <div v-else-if="!loading" class="empty-state"><ClipboardList :size="36" :stroke-width="1.2" /><h2>你的下一件作品，进行到哪了？</h2><p>订单编号与查询凭证可在提交成功后下载的文件中找到。</p></div>
  <div v-else class="loading-state" role="status"><LoaderCircle :size="24" class="spin" />正在查询订单</div>
</template>
