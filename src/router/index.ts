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
  },
  {
    path: '/filePreview',
    name: 'filePreview',
    component: () => import('@/views/filePreviewWindow/index.vue')
  },
  {
    path: '/chatRecord',
    name: 'chatRecord',
    component: () => import('@/views/chatRecordWindow/index.vue')
  },
  {
    path: '/addContacts',
    name: 'addContacts',
    component: () => import('@/views/addContactsWindow/index.vue')
  },
  {
    path: '/groupNotice',
    name: 'groupNotice',
    component: () => import('@/views/groupNoticeWindow/index.vue')
  },
  {
    path: '/messageRemind',
    name: 'messageRemind',
    component: () => import('@/views/messageRemindWindows/index.vue')
  },
  {
    path: '/call',
    name: 'call',
    redirect: '/call/video',
    component: () => import('@/views/audioVideoCallWindow/index.vue'),
    children: [
      {
        path: 'video',
        name: 'callVideo',
        component: () => import('@/views/audioVideoCallWindow/pages/video.vue')
      },
      {
        path: 'audio',
        name: 'callAudio',
        component: () => import('@/views/audioVideoCallWindow/pages/audio.vue')
      }
    ]
  },
  {
    path: '/chatSession',
    name: 'chatSession',
    component: () => import('@/views/chatSessionWindow/index.vue')
  },
  {
    path: '/moment',
    name: 'momentWindow',
    component: () => import('@/views/momentWindow/index.vue')
  },
  {
    path: '/pluginRuntime',
    name: 'pluginRuntimeWindow',
    component: () => import('@/views/pluginRuntimeWindow/index.vue')
  },
  {
    path: '/plugin',
    name: 'pluginUiWindow',
    component: () => import('@/views/pluginUiWindow/index.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
