export interface HomePage {
  name: string
  path: string
  loader: () => Promise<unknown>
}

export const HOME_PAGES: HomePage[] = [
  {
    name: 'message',
    path: '/home/message',
    loader: () => import('@/views/homeWindow/pages/message.vue')
  },
  {
    name: 'contacts',
    path: '/home/contacts',
    loader: () => import('@/views/homeWindow/pages/contacts.vue')
  },
  {
    name: 'moment',
    path: '/home/moment',
    loader: () => import('@/views/homeWindow/pages/moment.vue')
  },
  {
    name: 'application',
    path: '/home/application',
    loader: () => import('@/views/homeWindow/pages/application.vue')
  },
  {
    name: 'drive',
    path: '/home/drive',
    loader: () => import('@/views/homeWindow/pages/drive.vue')
  },
  {
    name: 'ai',
    path: '/home/ai',
    loader: () => import('@/views/homeWindow/pages/ai.vue')
  }
]

export const HOME_PAGE_NAMES = HOME_PAGES.map((item) => item.name)

const scheduleIdle = (task: () => void) => {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(task, { timeout: 2000 })
    return
  }
  setTimeout(task, 300)
}

export const prefetchHomePages = (currentName?: string) => {
  const loaders = HOME_PAGES.filter((item) => item.name !== currentName).map((item) => item.loader)

  const loadNext = (index: number) => {
    if (index >= loaders.length) return
    void loaders[index]().finally(() => {
      scheduleIdle(() => loadNext(index + 1))
    })
  }

  scheduleIdle(() => loadNext(0))
}
