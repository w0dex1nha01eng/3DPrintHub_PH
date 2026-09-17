<script setup>
import { computed } from 'vue'
import { ArrowRight, LoaderCircle, LockKeyhole } from 'lucide-vue-next'
import { useOrder } from '../../stores/orderStore.js'
import { colors } from '../../config/site.js'
import { catalogState } from '../../stores/catalogStore.js'

const { state, actions } = useOrder()
const material = computed(() => colors.find((item) => item.id === state.form.color && item.material_id === state.form.material))
const blockedFile = computed(() => state.files.some((item) => item.validation === 'checking' || item.validation === 'invalid'))
</script>

<template>
  <div class="order-summary">
    <div class="quote-line"><span>材料参考单价</span><strong>{{ material ? `¥${(material.price / 100).toFixed(2)}` : '待选择' }}<small v-if="material"> / 克</small></strong></div>
    <p class="quote-note">最终价格将在模型审核后与你确认。</p>
    <label class="consent"><input type="checkbox" :checked="state.form.accepted" :disabled="state.phase !== 'idle'" @change="actions.update('accepted', $event.target.checked)" /><span>我已阅读并了解 <RouterLink to="/guide">打印须知</RouterLink></span></label>
    <p v-if="state.errors.accepted" class="field-error" role="alert">{{ state.errors.accepted }}</p>
    <p v-if="state.errors.files" class="field-error" role="alert">{{ state.errors.files }}</p>
    <p v-if="state.error" class="error-banner" role="alert">{{ state.error }}</p>
    <button type="submit" class="button button-primary submit-button" :disabled="state.phase !== 'idle' || !catalogState.ready || blockedFile">
      <LoaderCircle v-if="state.phase !== 'idle'" :size="18" class="spin" />
      <span>{{ state.phase === 'checking' ? '正在检查配置与模型…' : state.phase === 'uploading' ? '模型上传中…' : state.phase === 'submitting' ? '正在提交订单…' : '提交打印需求' }}</span><ArrowRight v-if="state.phase === 'idle'" :size="18" />
    </button>
    <div class="privacy-note"><LockKeyhole :size="12" />模型与联系方式仅用于本次打印服务</div>
  </div>
</template>
