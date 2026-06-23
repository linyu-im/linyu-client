import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { HOME_PAGES } from '@/router/home'

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
    children: HOME_PAGES.map((item) => ({
      path: item.path,
      name: item.name,
      component: item.loader
    }))
  },
  {
    path: '/tray',
    name: 'tray',
    component: () => import('@/views/trayWindow/index.vue')
  },
  {
    path: '/emotion',
    name: 'emotion',
    component: () => import('@/views/emotionWindow/index.vue')
  },
  {
    path: '/set',
    name: 'set',
    component: () => import('@/views/SetWindow/index.vue')
  },
  {
    path: '/feedback',
    name: 'feedback',
    component: () => import('@/views/feedbackWindow/index.vue')
  },
  {
    path: '/screenshot',
    name: 'screenshot',
    component: () => import('@/views/screenshotWindow/index.vue')
  },
  {
    path: '/imgViewer',
    name: 'imgViewer',
    component: () => import('@/views/imgViewerWindow/index.vue')
  },
  {
    path: '/videoViewer',
    name: 'videoViewer',
    component: () => import('@/views/videoViewerWindow/index.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
