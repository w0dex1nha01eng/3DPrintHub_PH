<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ShieldCheck, ArrowRight, LoaderCircle } from 'lucide-vue-next'
import { adminSession } from '../stores/adminSession.js'
import FormField from '@client/components/FormField.vue'

const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  if (loading.value) return
  if (!username.value.trim() || !password.value) { error.value = '请填写管理员账号和密码。'; return }
  error.value = ''
  loading.value = true
  try {
    await adminSession.login(username.value, password.value)
    password.value = ''
    const target = route.query.redirect
    await router.replace(typeof target === 'string' && /^\/(?:settings|content|files|orders(?:\/\d+)?)$/.test(target) ? target : '/settings')
  } catch (cause) { error.value = cause.message }
  finally { loading.value = false }
}
</script>

<template>
  <div class="login-surface"><ShieldCheck :size="32" :stroke-width="1.4" /><h1>管理员登录</h1><p class="muted">PrintHub</p><form @submit.prevent="login"><FormField label="管理员账号" for-id="username"><input id="username" v-model="username" autocomplete="username" maxlength="128" /></FormField><FormField label="密码" for-id="password"><input id="password" v-model="password" type="password" autocomplete="current-password" maxlength="256" /></FormField><p v-if="error" class="error-banner" role="alert">{{ error }}</p><button class="button button-primary" :disabled="loading"><LoaderCircle v-if="loading" class="spin" :size="17" />登录<ArrowRight v-if="!loading" :size="17" /></button></form></div>
</template>
