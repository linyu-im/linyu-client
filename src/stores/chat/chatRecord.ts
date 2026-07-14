import { defineStore } from 'pinia'
import { SceneType, type SceneType as SceneTypeValue } from '@/constants/common'

type ChatRecordStore = {
  sessionId: string
  peerId: string
  peerName: string
  sceneType: SceneTypeValue
}

export const useChatRecordStore = defineStore('chatRecord', {
  persist: false,
  share: {
    enable: true,
    initialize: true
  },
  state: (): ChatRecordStore => ({
    sessionId: '',
    peerId: '',
    peerName: '',
    sceneType: SceneType.User
  }),
  actions: {
    openRecord(sessionId: string, peerId: string, peerName: string, sceneType: SceneTypeValue) {
      this.$patch((state) => {
        state.sessionId = sessionId
        state.peerId = peerId
        state.peerName = peerName
        state.sceneType = sceneType
      })
    },
    reset() {
      this.$patch((state) => {
        state.sessionId = ''
        state.peerId = ''
        state.peerName = ''
        state.sceneType = SceneType.User
      })
    }
  }
})
