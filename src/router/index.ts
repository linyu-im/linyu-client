import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/loginWindow/index.vue')
  },
  {
    path: '/home',
    name: 'home',
    redirect: '/home/message',
    component: () => import('@/views/homeWindow/index.vue'),
    children: [
      {
        path: '/home/message',
        name: 'message',
        component: () => import('@/views/homeWindow/pages/message.vue')
      },
      {
        path: '/home/contacts',
        name: 'contacts',
        component: () => import('@/views/homeWindow/pages/contacts.vue')
      },
      {
        path: '/home/moment',
        name: 'moment',
        component: () => import('@/views/homeWindow/pages/moment.vue')
      },
      {
        path: '/home/application',
        name: 'application',
        component: () => import('@/views/homeWindow/pages/application.vue')
      },
      {
        path: '/home/drive',
        name: 'drive',
        component: () => import('@/views/homeWindow/pages/drive.vue')
      },
      {
        path: '/home/ai',
        name: 'ai',
        component: () => import('@/views/homeWindow/pages/ai.vue')
      }
    ]
  },
  {
    path: '/tray',
    name: 'tray',
    component: () => import('@/views/trayWindow/index.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
