<script setup>
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import { orderStatuses, statusSequence } from '../constants/orderStatus.js'
const props = defineProps({ status: String })
const current = computed(() => statusSequence.indexOf(props.status))
</script>

<template>
  <p v-if="status === 'cancelled'" class="muted">此订单已取消。</p>
  <ol v-else class="order-timeline" aria-label="订单进度">
    <li v-for="(step, index) in statusSequence" :key="step" :class="{ done: index < current, current: index === current }" :aria-current="index === current ? 'step' : undefined"><span class="timeline-dot"><Check v-if="index < current" :size="13" /><span v-else>{{ index + 1 }}</span></span><span>{{ orderStatuses[step].label }}</span></li>
  </ol>
</template>
