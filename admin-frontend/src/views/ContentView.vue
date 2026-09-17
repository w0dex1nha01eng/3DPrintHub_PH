<script setup>
import { Plus, Trash2 } from 'lucide-vue-next'
import { useCatalogEditor } from '../composables/useCatalogEditor.js'
import EditorHeading from '../components/EditorHeading.vue'
import IconButton from '@client/components/IconButton.vue'
const { state, dirty, actions, reload } = useCatalogEditor()
const contactFields = [
  ['name', '联系人 / 服务名称', 64], ['location', '校内取件地点', 200], ['hours', '服务时间', 128],
  ['wechat', '微信', 128], ['qq', 'QQ', 32], ['email', '邮箱', 128], ['phone', '电话', 32],
]
const copyFields = [
  ['home_title', '下单页标题', 40], ['home_intro', '下单页说明', 300], ['materials_intro', '材料页说明', 300],
  ['pricing_note', '价格表备注', 500], ['pricing_details', '计价说明', 1000], ['guide_intro', '须知页说明', 300],
  ['contact_intro', '联系页说明', 300], ['contact_note', '联系页备注', 500],
]
</script>

<template>
  <form @submit.prevent="actions.save">
    <EditorHeading title="客户端内容" :state="state" :dirty="dirty" @reload="reload">联系方式 · 页面文案 · 打印须知</EditorHeading>
    <fieldset v-if="state.draft" :disabled="state.loading || state.saving">
      <section class="catalog-section"><div class="catalog-section-heading"><h2>联系方式</h2></div><div class="content-fields"><label v-for="[key, label, max] in contactFields" :key="key">{{ label }}<input v-model="state.draft.content.contact[key]" :type="key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'" :maxlength="max" :required="key === 'name'" /></label></div></section>
      <section class="catalog-section"><div class="catalog-section-heading"><h2>页面文案</h2></div><div class="content-fields"><label v-for="[key, label, max] in copyFields" :key="key">{{ label }}<textarea v-model="state.draft.content.copy[key]" :maxlength="max" :required="key === 'home_title'" rows="3"></textarea></label></div></section>
      <section class="catalog-section"><div class="catalog-section-heading"><h2>打印须知</h2><button type="button" class="button button-outline button-small" :disabled="state.draft.content.notices.length >= 20" @click="state.draft.content.notices.push({ title: '', text: '', icon: 'box' })"><Plus :size="16" />添加须知</button></div><div v-for="(item, index) in state.draft.content.notices" :key="index" class="content-entry"><label>标题<input v-model="item.title" required maxlength="64" /></label><label>图标<select v-model="item.icon"><option value="box">模型</option><option value="clock">排期</option><option value="package">取件</option></select></label><IconButton :label="`删除须知 ${index + 1}`" @click="state.draft.content.notices.splice(index, 1)"><Trash2 :size="16" /></IconButton><label class="entry-body">内容<textarea v-model="item.text" required maxlength="1000" rows="3"></textarea></label></div></section>
      <section class="catalog-section"><div class="catalog-section-heading"><h2>常见问题</h2><button type="button" class="button button-outline button-small" :disabled="state.draft.content.questions.length >= 30" @click="state.draft.content.questions.push({ question: '', answer: '' })"><Plus :size="16" />添加问题</button></div><div v-for="(item, index) in state.draft.content.questions" :key="index" class="content-entry question-entry"><label>问题<input v-model="item.question" required maxlength="128" /></label><IconButton :label="`删除问题 ${index + 1}`" @click="state.draft.content.questions.splice(index, 1)"><Trash2 :size="16" /></IconButton><label class="entry-body">回答<textarea v-model="item.answer" required maxlength="1000" rows="3"></textarea></label></div></section>
    </fieldset>
  </form>
</template>
