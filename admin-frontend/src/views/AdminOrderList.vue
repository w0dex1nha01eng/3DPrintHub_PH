<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, RefreshCw, ChevronLeft, ChevronRight, ArrowUpRight, LogOut, ClipboardList, LoaderCircle } from 'lucide-vue-next'
import { getAdminOrders } from '@client/api/order.js'
import { adminSession } from '../stores/adminSession.js'
import { orderStatuses } from '@client/constants/orderStatus.js'
import { formatDate, formatMoney } from '@client/utils/validators.js'
import OrderStatusBadge from '@client/components/OrderStatusBadge.vue'
import IconButton from '@client/components/IconButton.vue'

const router = useRouter()
const orders = ref([])
const total = ref(0)
const page = ref(1)
const status = ref('')
const query = ref('')
const loading = ref(false)
const error = ref('')
let ticket = 0

async function load(reset = false) {
  if (reset) page.value = 1
  const current = ++ticket
  loading.value = true
  error.value = ''
  try {
    const result = await getAdminOrders({ page: page.value, page_size: 10, status: status.value || undefined, q: query.value.trim() || undefined }, adminSession.getAuth())
    if (current !== ticket) return
    if (!Array.isArray(result?.items) || typeof result.total !== 'number') throw new Error('订单列表格式不正确。')
    orders.value = result.items
    total.value = result.total
  } catch (cause) {
    if (current !== ticket) return
    error.value = cause.message
    orders.value = []
    if (cause.status === 401) logout()
  } finally { if (current === ticket) loading.value = false }
}
function logout() { adminSession.logout(); router.replace('/login') }
function changePage(next) { page.value = next; load() }
onMounted(load)
</script>

<template>
  <div class="page-heading"><div><h1>订单管理</h1><p>{{ adminSession.state.username }} · 管理台</p></div><button class="button button-outline" @click="logout"><LogOut :size="16" />退出登录</button></div>
  <form class="admin-filters" @submit.prevent="load(true)"><div class="search-input"><Search :size="17" /><input v-model="query" aria-label="搜索订单" placeholder="订单编号、姓名或联系方式" /></div><select v-model="status" aria-label="筛选订单状态" @change="load(true)"><option value="">全部状态</option><option v-for="(entry, key) in orderStatuses" :key="key" :value="key">{{ entry.label }}</option></select><button class="button button-outline">查询</button><IconButton label="刷新订单" :disabled="loading" @click="load()"><RefreshCw :size="17" :class="{ spin: loading }" /></IconButton></form>
  <p v-if="error" class="error-banner" role="alert">{{ error }}</p>
  <div v-if="loading" class="loading-state" role="status"><LoaderCircle :size="24" class="spin" />正在加载订单</div>
  <div v-else-if="orders.length" class="admin-table-wrap"><table class="admin-table"><thead><tr><th>订单编号 / 提交时间</th><th>联系人</th><th>材料 / 数量</th><th>订单状态</th><th>最终价格</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="order in orders" :key="order.id"><td><RouterLink :to="`/orders/${order.id}`" class="order-number">{{ order.order_no }}</RouterLink><small>{{ formatDate(order.created_at) }}</small></td><td>{{ order.customer_name }}<small>{{ order.contact }}</small></td><td>{{ order.catalog_snapshot?.material?.name || order.material }}<small>{{ order.quantity }} 件 / 模型</small></td><td><OrderStatusBadge :status="order.status" /></td><td>{{ formatMoney(order.final_price) }}</td><td><RouterLink :to="`/orders/${order.id}`" class="icon-button" :aria-label="`查看订单 ${order.order_no}`"><ArrowUpRight :size="18" /></RouterLink></td></tr></tbody></table></div>
  <div v-else-if="!error" class="empty-state"><ClipboardList :size="36" :stroke-width="1.2" /><h2>暂无符合条件的订单</h2><p>新提交的打印需求会显示在这里。</p></div>
  <div v-if="!loading && !error" class="pagination"><span>共 {{ total }} 个订单</span><div><IconButton label="上一页" :disabled="page <= 1" @click="changePage(page - 1)"><ChevronLeft :size="17" /></IconButton><span>{{ page }} / {{ Math.max(1, Math.ceil(total / 10)) }}</span><IconButton label="下一页" :disabled="page * 10 >= total" @click="changePage(page + 1)"><ChevronRight :size="17" /></IconButton></div></div>
</template>
