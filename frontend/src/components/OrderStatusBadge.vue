<script setup>
import { computed } from 'vue'
import { orderStatuses } from '../constants/orderStatus.js'
const props = defineProps({ status: String })
const entry = computed(() => orderStatuses[props.status] || { label: '状态待更新', tone: 'neutral' })
</script>

<template><span class="status-badge" :class="`tone-${entry.tone}`"><span></span>{{ entry.label }}</span></template>
