import { useChatStore } from '@/stores/chat/chat'
import { useMessageDbStore } from '@/stores/message/messageDb'
import { useMessageRemindStore } from '@/stores/message/messageRemind'
import { Message } from '@/types/api/message'
import { useSendingMessagesStore } from '@/stores/message/sendingMessages'
import { useUserStore } from '@/stores/user/user'
import { defineStore } from 'pinia'

export const useWebSocketStore = defineStore('websocket', {
  persist: false,
  state: () => ({
    lastServerMessage: null as Message | null
  }),
  actions: {
    receiveMsg(msg: Message | null) {
      if (!msg) return

      // 通知 Chat 页同步消息列表
      useChatStore().onReceiveMessage(msg)

      // 保存消息到本地数据库
      useMessageDbStore().saveMessages([msg])

      // 保存消息到消息提醒列表
      useMessageRemindStore().pushFromMessage(msg)

      const currentUserId = useUserStore().authInfo.userId
      if (msg.fromId === currentUserId) {
        const pending = useSendingMessagesStore().getMessages(msg.toId)
        // 如果消息正在发送，则不处理
        if (pending.some((item) => item.status === 'sending')) {
          return
        }
      }

      this.$patch((state) => {
        state.lastServerMessage = msg
      })
    },
    clearMsg() {
      this.$patch((state) => {
        state.lastServerMessage = null
      })
    }
  }
})
