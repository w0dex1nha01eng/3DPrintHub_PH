<script setup>
import { useOrder } from '../../stores/orderStore.js'
import FormField from '../FormField.vue'
import SectionHeading from '../SectionHeading.vue'

const { state, actions } = useOrder()
</script>

<template>
  <section class="contact-fields">
    <SectionHeading title="联系与备注" />
    <div class="field-grid">
      <FormField label="姓名或称呼" for-id="customer_name" :error="state.errors.customer_name">
        <input id="customer_name" autocomplete="name" maxlength="64" placeholder="怎么称呼你" :value="state.form.customer_name" :aria-invalid="!!state.errors.customer_name" aria-describedby="customer_name-error" @input="actions.update('customer_name', $event.target.value)" />
      </FormField>
      <FormField label="学号 / 工号" for-id="campus_id" hint="选填" :error="state.errors.campus_id">
        <input id="campus_id" maxlength="64" placeholder="校内身份信息" :value="state.form.campus_id" @input="actions.update('campus_id', $event.target.value)" />
      </FormField>
    </div>
    <FormField label="联系方式" for-id="contact" :error="state.errors.contact">
      <input id="contact" maxlength="128" placeholder="手机 / 微信 / QQ / 邮箱" :value="state.form.contact" :aria-invalid="!!state.errors.contact" aria-describedby="contact-error" @input="actions.update('contact', $event.target.value)" />
    </FormField>
    <FormField label="打印备注" for-id="note" hint="选填" :error="state.errors.note">
      <textarea id="note" maxlength="1000" rows="3" placeholder="用途、尺寸、期望取件时间或其他要求" :value="state.form.note" @input="actions.update('note', $event.target.value)"></textarea>
    </FormField>
  </section>
</template>
