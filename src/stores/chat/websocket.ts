import { useChatStore } from '@/stores/chat/chat'
import { useMessageDbStore } from '@/stores/message/messageDb'
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

      // 无论是否自己发的消息，都更新会话列表
      useChatStore().onReceiveMessage(msg)

      // 保存消息到本地数据库
      useMessageDbStore().saveMessages([msg])

      const currentUserId = useUserStore().authInfo.userId
      if (msg.fromId === currentUserId) {
        const pending = useSendingMessagesStore().getMessages(msg.toId)
        // 普通发送会先写入本地乐观消息；此期间忽�?WS 回推，避免与 local id 并存出现两条
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
