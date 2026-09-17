import { onMounted, onUnmounted } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { getCatalog, saveCatalog } from '../api/catalog.js'
import { adminSession } from '../stores/adminSession.js'
import { createCatalogEditor } from '../stores/catalogEditor.js'

// 两个配置页共用保存逻辑，但各自留自己的草稿。
export function useCatalogEditor() {
  const router = useRouter()
  const editor = createCatalogEditor({
    get: () => getCatalog(adminSession.getAuth()),
    save: (payload) => saveCatalog(payload, adminSession.getAuth()),
    onError: (error) => { if (error.status === 401) { adminSession.logout(); router.replace('/login') } },
  })
  function confirmLeave() { return !editor.dirty.value || !adminSession.state.authenticated || window.confirm('有未保存的配置，确定放弃修改吗？') }
  function beforeUnload(event) { if (editor.dirty.value) { event.preventDefault(); event.returnValue = '' } }
  onBeforeRouteLeave(confirmLeave)
  onMounted(() => { editor.actions.load(); window.addEventListener('beforeunload', beforeUnload) })
  onUnmounted(() => window.removeEventListener('beforeunload', beforeUnload))
  return { ...editor, reload: () => { if (confirmLeave()) editor.actions.load() } }
}
