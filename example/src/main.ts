import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import routes from 'vite-plugin-pages/client'
import App from './App.vue'
import './index.css'

console.log(routes)

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)

app.use(router)

app.mount('#app')
