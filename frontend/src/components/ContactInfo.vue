<script setup>
import { MapPin, Clock3, MessageCircle, Mail, Phone } from 'lucide-vue-next'
import { site } from '../config/site.js'
</script>

<template>
  <div class="contact-info">
    <div><MapPin :size="18" /><span><small>校内取件地点</small><strong>{{ site.contact.location || '下单后由我们确认' }}</strong></span></div>
    <div><Clock3 :size="18" /><span><small>服务时间</small><strong>{{ site.contact.hours || '以我们确认为准' }}</strong></span></div>
    <div><MessageCircle :size="18" /><span><small>微信</small><strong>{{ site.contact.wechat || '暂未公布' }}</strong></span></div>
    <div v-if="site.contact.qq"><MessageCircle :size="18" /><span><small>QQ</small><strong>{{ site.contact.qq }}</strong></span></div>
    <div v-if="site.contact.email"><Mail :size="18" /><span><small>邮箱</small><a :href="`mailto:${site.contact.email}`">{{ site.contact.email }}</a></span></div>
    <div v-if="site.contact.phone"><Phone :size="18" /><span><small>电话</small><a :href="`tel:${site.contact.phone}`">{{ site.contact.phone }}</a></span></div>
  </div>
</template>
