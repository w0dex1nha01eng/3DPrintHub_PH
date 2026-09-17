import { createRouter, createWebHistory } from 'vue-router'
import { adminSession } from './stores/adminSession.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/settings' },
    { path: '/login', component: () => import('./views/AdminLoginView.vue'), meta: { title: '管理员登录', public: true } },
    { path: '/settings', component: () => import('./views/SettingsView.vue'), meta: { title: '耗材管理' } },
    { path: '/content', component: () => import('./views/ContentView.vue'), meta: { title: '客户端内容' } },
    { path: '/files', component: () => import('./views/FilesView.vue'), meta: { title: '模型文件' } },
    { path: '/orders', component: () => import('./views/AdminOrderList.vue'), meta: { title: '订单管理' } },
    { path: '/orders/:id', component: () => import('./views/AdminOrderDetail.vue'), meta: { title: '订单详情' } },
    { path: '/:pathMatch(.*)*', redirect: '/settings' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
router.beforeEach((to) => {
  if (!to.meta.public && !adminSession.state.authenticated) return { path: '/login', query: { redirect: to.fullPath } }
})
router.afterEach((to) => { document.title = `${to.meta.title} | PrintHub 管理后台` })
export default router
