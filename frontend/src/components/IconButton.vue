<script setup>
defineProps({ label: { type: String, required: true } })
</script>

<template>
  <button type="button" class="icon-button" :aria-label="label" :title="label"><slot /></button>
</template>
