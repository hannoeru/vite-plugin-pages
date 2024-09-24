import routes from '~pages'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

// @ts-expect-error no routes type
import reactRoutes from '~admin-pages'
import './index.css'

// eslint-disable-next-line no-console
console.log('vue:', routes)

// eslint-disable-next-line no-console
console.log('react:', reactRoutes)

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)

app.use(router)

app.mount('#app')
