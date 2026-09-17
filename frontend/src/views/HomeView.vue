<script setup>
import { computed, nextTick, ref } from 'vue'
import { Check, Download, ArrowRight } from 'lucide-vue-next'
import { useOrder } from '../stores/orderStore.js'
import { colors, site } from '../config/site.js'
import { downloadBlob } from '../utils/file.js'
import FileUploader from '../components/FileUploader.vue'
import ModelPreview from '../components/ModelPreview.vue'
import PrintOptions from '../components/order/PrintOptions.vue'
import ContactFields from '../components/order/ContactFields.vue'
import OrderSummary from '../components/order/OrderSummary.vue'
import SectionHeading from '../components/SectionHeading.vue'

const { state, actions } = useOrder()
const formElement = ref(null)
const activeFile = computed(() => state.files.find((item) => item.id === state.activeId)?.file)
const selectedColor = computed(() => colors.find((color) => color.id === state.form.color)?.hex)
const defaultHeroTitle = '新建打印'
const genericHeroTitles = new Set(['', '新建打印'])
const heroTitle = computed(() => {
  const title = (site.copy.home_title || '').trim()
  return genericHeroTitles.has(title) ? defaultHeroTitle : title
})

async function submit() {
  const success = await actions.submit()
  if (!success) {
    await nextTick()
    formElement.value?.querySelector('[aria-invalid="true"]')?.focus()
  }
}

function saveReceipt() {
  const receipt = `${site.name} 订单\n订单编号：${state.receipt.order_no}\n查询凭证：${state.receipt.query_token}\n请妥善保存查询凭证。`
  downloadBlob(new Blob([receipt], { type: 'text/plain;charset=utf-8' }), `${state.receipt.order_no}.txt`)
}
</script>

<template>
  <div class="page-heading compact-heading"><div><h1 id="home-title">{{ heroTitle }}</h1></div></div>
  <section v-if="state.receipt" class="receipt-surface" aria-live="polite">
    <span class="success-symbol"><Check :size="28" /></span><h2>打印需求已提交</h2><p>我们将在审核模型后与你联系。</p>
    <dl class="receipt-details"><div><dt>订单编号</dt><dd>{{ state.receipt.order_no }}</dd></div><div><dt>查询凭证</dt><dd>{{ state.receipt.query_token }}</dd></div></dl>
    <p class="muted">请下载并保存订单凭证，查询打印进度时需要使用。</p>
    <div class="button-row"><button class="button button-primary" @click="saveReceipt"><Download :size="16" />下载订单凭证</button><RouterLink to="/orders" class="button button-outline">查询进度<ArrowRight :size="16" /></RouterLink><button class="button button-plain" @click="actions.reset">继续下单</button></div>
  </section>
  <form v-else id="order-form" ref="formElement" class="order-workspace marketplace-workspace" novalidate @submit.prevent="submit">
    <section class="model-section workspace-panel">
      <SectionHeading title="模型文件"><span class="muted file-counter">{{ state.files.length }} / {{ site.maxFiles }}</span></SectionHeading>
      <FileUploader :files="state.files" :active-id="state.activeId" :error="state.fileError || state.errors.files" :disabled="state.phase !== 'idle'" @select="actions.addFiles" @remove="actions.removeFile" @activate="actions.selectFile" />
      <ModelPreview v-if="activeFile" :file="activeFile" :color="selectedColor" />
      <div class="model-note"><span class="note-mark">i</span><p>按原始尺寸检查，不自动缩放或排版；提交后仍需人工审核可打印性。</p></div>
    </section>
    <div class="form-section workspace-panel control-panel"><fieldset :disabled="state.phase !== 'idle'"><PrintOptions /><ContactFields /></fieldset><OrderSummary /></div>
  </form>
</template>
