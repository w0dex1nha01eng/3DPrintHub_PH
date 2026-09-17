<script setup>
import { Save, RefreshCw, Check, LoaderCircle } from 'lucide-vue-next'
import IconButton from '@client/components/IconButton.vue'
defineProps({ title: String, state: Object, dirty: Boolean })
defineEmits(['reload'])
</script>

<template>
  <header class="settings-heading"><div><h1>{{ title }}</h1><p class="muted"><slot /></p></div><div class="button-row"><span v-if="dirty" class="unsaved-label">未保存</span><span v-else-if="state.message" class="saved-label" role="status"><Check :size="14" />{{ state.message }}</span><IconButton label="重新加载配置" :disabled="state.loading || state.saving" @click="$emit('reload')"><RefreshCw :size="17" :class="{ spin: state.loading }" /></IconButton><button type="submit" class="button button-primary" :disabled="!dirty || state.loading || state.saving"><LoaderCircle v-if="state.saving" :size="16" class="spin" /><Save v-else :size="16" />保存配置</button></div></header>
  <p v-if="state.error" class="error-banner" role="alert">{{ state.error }}</p>
  <div v-if="state.loading && !state.draft" class="loading-state" role="status"><LoaderCircle class="spin" :size="24" />正在加载配置</div>
</template>
