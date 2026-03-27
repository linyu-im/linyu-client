import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/loginWindow/index.vue')
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/homeWindow/index.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
