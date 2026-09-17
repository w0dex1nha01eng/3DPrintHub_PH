<script setup>
import { provide } from 'vue'
import { createOrderStore, orderKey } from '../../stores/orderStore.js'

provide(orderKey, createOrderStore())
</script>

<template><slot /></template>
