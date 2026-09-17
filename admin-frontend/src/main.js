import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import '@client/styles/main.css'
import './styles/admin.css'

createApp(App).use(router).mount('#app')
