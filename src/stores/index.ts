import { createPersistedState } from 'pinia-plugin-persistedstate'
import { PiniaSharedState } from 'pinia-shared-state'
import { createPinia } from 'pinia'

export const pinia = createPinia()

pinia
  .use(
    createPersistedState({
      auto: true
    })
  )
  .use(
    PiniaSharedState({
      enable: false,
      initialize: false,
      type: 'native'
    })
  )
