<script setup>
defineProps({ label: String, forId: String, error: String, hint: String })
</script>

<template>
  <div class="form-field" :class="{ 'has-error': error }">
    <label :for="forId">{{ label }}<span v-if="hint" class="field-hint">{{ hint }}</span></label>
    <slot :error-id="`${forId}-error`" />
    <span v-if="error" :id="`${forId}-error`" class="field-error" role="alert">{{ error }}</span>
  </div>
</template>
