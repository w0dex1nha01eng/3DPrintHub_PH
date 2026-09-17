import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './styles/main.css'

createApp(App).use(router).mount('#app')
