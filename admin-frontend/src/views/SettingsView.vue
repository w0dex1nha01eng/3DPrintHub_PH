<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Plus, Trash2, Box } from 'lucide-vue-next'
import { useCatalogEditor } from '../composables/useCatalogEditor.js'
import EditorHeading from '../components/EditorHeading.vue'
import FilamentFields from '../components/FilamentFields.vue'
import IconButton from '@client/components/IconButton.vue'
import { formatBytes } from '@client/utils/file.js'

const { state, dirty, actions, reload } = useCatalogEditor()
const selectedId = ref('')
const selected = computed(() => state.draft?.materials.find((item) => item.id === selectedId.value))
const stocks = computed(() => state.draft?.colors.filter((item) => item.material_id === selectedId.value) || [])
watch(() => state.draft?.materials.map((item) => item.id), (ids) => { if (!ids?.includes(selectedId.value)) selectedId.value = ids?.[0] || '' }, { immediate: true })
const removal = ref(null)
const dialog = ref(null)
async function requestRemoval(group, item) { removal.value = { group, id: item.id, name: item.name }; await nextTick(); dialog.value.showModal() }
function closeDialog() { dialog.value.close(); removal.value = null }
function remove() { actions.remove(removal.value.group, removal.value.id); closeDialog() }
function addType() { actions.addMaterial(); selectedId.value = state.draft.materials.at(-1).id }
</script>

<template>
  <form class="catalog-editor" @submit.prevent="actions.save">
    <EditorHeading title="耗材管理" :state="state" :dirty="dirty" @reload="reload">{{ state.draft ? `${state.draft.materials.length} 个种类 · ${state.draft.colors.length} 条耗材` : '打印耗材' }}</EditorHeading>
    <fieldset v-if="state.draft" :disabled="state.loading || state.saving">
      <div class="catalog-section-heading"><h2>耗材种类</h2><button type="button" class="button button-outline button-small" :disabled="state.draft.materials.length >= 50 || state.draft.colors.length >= 500" @click="addType"><Plus :size="16" />添加种类</button></div>
      <div class="material-type-selector"><label for="material-type">当前种类</label><select id="material-type" v-model="selectedId"><option v-for="item in state.draft.materials" :key="item.id" :value="item.id">{{ item.name || '未命名种类' }}{{ item.enabled ? '' : '（已停用）' }}</option></select></div>
      <section v-if="selected" class="catalog-section">
        <div class="material-row-heading"><label class="enable-option"><input v-model="selected.enabled" type="checkbox" />启用种类</label><span class="record-id">{{ selected.id }}</span><IconButton label="删除当前种类" @click="requestRemoval('materials', selected)"><Trash2 :size="16" /></IconButton></div>
        <div class="type-fields"><label>种类名称<input v-model="selected.name" maxlength="32" required /></label><label>适用场景<input v-model="selected.label" maxlength="32" /></label><label>种类特点<input v-model="selected.tags" maxlength="64" /></label><label>种类说明<textarea v-model="selected.description" maxlength="200" rows="2"></textarea></label></div>
        <div class="catalog-section-heading"><h2>{{ selected.name || '当前种类' }} · 具体耗材</h2><button type="button" class="button button-outline button-small" :disabled="state.draft.colors.length >= 500" @click="actions.addColor(selectedId)"><Plus :size="16" />添加耗材</button></div>
        <FilamentFields v-for="(item, index) in stocks" :key="item.id" :item="item" :index="index" @remove="requestRemoval('colors', $event)" />
        <p v-if="!stocks.length" class="muted empty-stock">暂无耗材</p>
      </section>
      <section class="printer-specification"><Box :size="25" :stroke-width="1.5" /><div><h2>Creality K1C</h2><p>单模型 X/Y/Z ≤ 220 × 220 × 250 mm</p></div><div><strong>{{ formatBytes(state.limits.max_file_size) }} / 文件</strong><span>每单最多 {{ state.limits.max_files }} 个模型</span></div></section>
    </fieldset>
  </form>
  <dialog ref="dialog" class="delete-dialog" aria-labelledby="delete-title" @cancel="removal = null"><template v-if="removal"><h2 id="delete-title">删除{{ removal.group === 'materials' ? '种类及其全部耗材' : '耗材' }}“{{ removal.name || '未命名' }}”？</h2><p>保存配置后生效，历史订单不受影响。</p><div class="button-row"><button type="button" class="button button-outline" @click="closeDialog">取消</button><button type="button" class="button button-danger" @click="remove"><Trash2 :size="16" />删除</button></div></template></dialog>
</template>
