<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Download, Trash2, LoaderCircle } from 'lucide-vue-next'
import { downloadModel } from '@client/api/upload.js'
import { downloadBlob } from '@client/utils/file.js'
import { deleteFile } from '../api/files.js'
import { adminSession } from '../stores/adminSession.js'
import IconButton from '@client/components/IconButton.vue'
const props = defineProps({ file: Object })
const emit = defineEmits(['deleted'])
const router = useRouter()
const busy = ref('')
const error = ref('')
const dialog = ref(null)
function report(cause) {
  error.value = cause.message
  if (cause.status === 401) { adminSession.logout(); router.replace('/login') }
}
async function download() {
  if (busy.value || props.file.deleted_at) return
  busy.value = 'download'; error.value = ''
  try { downloadBlob(await downloadModel(props.file.id, adminSession.getAuth()), props.file.original_name) }
  catch (cause) { report(cause) }
  finally { busy.value = '' }
}
async function remove() {
  if (busy.value) return
  busy.value = 'delete'; error.value = ''
  try {
    const result = await deleteFile(props.file.id, adminSession.getAuth())
    dialog.value.close()
    emit('deleted', result)
  } catch (cause) { report(cause) }
  finally { busy.value = '' }
}
</script>

<template>
  <div class="model-file-actions"><span v-if="file.deleted_at" class="muted">已删除</span><template v-else><IconButton :label="`下载 ${file.original_name}`" :disabled="!!busy" @click="download"><LoaderCircle v-if="busy === 'download'" class="spin" :size="16" /><Download v-else :size="16" /></IconButton><IconButton :label="`删除 ${file.original_name}`" :disabled="!!busy" @click="error = ''; dialog.showModal()"><Trash2 :size="16" /></IconButton></template><p v-if="error && !dialog?.open" class="field-error" role="alert">{{ error }}</p></div>
  <dialog ref="dialog" class="delete-dialog" :aria-label="`删除模型 ${file.original_name}`" @cancel="busy && $event.preventDefault()"><h2>删除“{{ file.original_name }}”？</h2><p>将永久删除服务器上的模型原文件（STL / 3MF），无法恢复。关联订单和文件记录仍会保留。</p><p v-if="error" class="field-error" role="alert">{{ error }}</p><div class="button-row"><button type="button" class="button button-outline" :disabled="!!busy" @click="dialog.close()">取消</button><button type="button" class="button button-danger" :disabled="!!busy" @click="remove"><LoaderCircle v-if="busy" class="spin" :size="16" /><Trash2 v-else :size="16" />确认删除文件</button></div></dialog>
</template>
