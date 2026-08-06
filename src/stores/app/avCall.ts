import { defineStore } from 'pinia'
import type { AvCallType } from '@/types/api/avCall'

export type AvCallStatus = 'idle' | 'calling' | 'connected' | 'ended'

type AvCallStore = {
  sessionId: string
  sceneType: 'user' | 'group'
  callType: AvCallType
  peerId: string
  displayName: string
  status: AvCallStatus
  /** 最近一次房间成员 change 的 sessionId（跨窗共享） */
  roomChangeSessionId: string
  /** 递增以触发各窗状态栏刷新 */
  roomChangeSeq: number
}

export const useAvCallStore = defineStore('avCall', {
  persist: false,
  share: { enable: true, initialize: true },
  state: (): AvCallStore => ({
    sessionId: '',
    sceneType: 'user',
    callType: 'video',
    peerId: '',
    displayName: '',
    status: 'idle',
    roomChangeSessionId: '',
    roomChangeSeq: 0
  }),
  actions: {
    setCallContext(input: {
      sessionId: string
      sceneType: 'user' | 'group'
      callType: AvCallType
      peerId: string
      displayName: string
      status?: AvCallStatus
    }) {
      this.$patch((state) => {
        state.sessionId = input.sessionId
        state.sceneType = input.sceneType
        state.callType = input.callType
        state.peerId = input.peerId
        state.displayName = input.displayName
        state.status = input.status ?? 'calling'
      })
    },
    setStatus(status: AvCallStatus) {
      this.$patch((state) => {
        state.status = status
      })
    },
    /** 通知各聊天窗：房间成员可能已变，需延迟刷新状态栏 */
    notifyRoomChange(sessionId: string) {
      const id = sessionId.trim()
      if (!id) return
      this.$patch((state) => {
        state.roomChangeSessionId = id
        state.roomChangeSeq += 1
      })
    },
    clear() {
      this.$patch((state) => {
        state.sessionId = ''
        state.sceneType = 'user'
        state.callType = 'video'
        state.peerId = ''
        state.displayName = ''
        state.status = 'idle'
      })
    }
  }
})
