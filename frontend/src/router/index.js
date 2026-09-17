import { createRouter, createWebHistory } from 'vue-router'
import { site } from '../config/site.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('../views/HomeView.vue'), meta: { title: '新建打印' } },
    { path: '/orders', component: () => import('../views/OrderLookupView.vue'), meta: { title: '订单查询' } },
    { path: '/materials', component: () => import('../views/MaterialsView.vue'), meta: { title: '材料与价格' } },
    { path: '/guide', component: () => import('../views/GuideView.vue'), meta: { title: '打印须知' } },
    { path: '/contact', component: () => import('../views/ContactView.vue'), meta: { title: '联系我们' } },
    // 老书签还可以用，实际会跳到独立管理端。
    { path: '/admin/:pathMatch(.*)*', beforeEnter: () => { window.location.assign(site.adminUrl); return false } },
    { path: '/:pathMatch(.*)*', component: () => import('../views/NotFoundView.vue'), meta: { title: '页面不存在' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => { document.title = `${to.meta.title || '打印服务'} | ${site.name}` })

export default router
