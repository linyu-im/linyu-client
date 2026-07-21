import { chatApi } from '@/api'
import { useMessageDbStore } from '@/stores/message/messageDb'
import { useUserStore } from '@/stores/user/user'
import type { Chat } from '@/types/api/chat'
import type { Message } from '@/types/api/message'
import { defineStore } from 'pinia'
import { isValidBackendTime, nowBackendDatetime, parseBackendTime } from '@/utils/common/time'

type ChatStore = {
  chatList: Chat[]
  selectedChatId: string
  reopenTick: number
}

function getChatSortTime(chat: Chat) {
  const candidates = [chat.updatedAt, chat.lastMsgContent?.updatedAt, chat.lastMsgContent?.createdAt]
  for (const timeStr of candidates) {
    if (isValidBackendTime(timeStr)) {
      return parseBackendTime(timeStr!).getTime()
    }
  }
  return 0
}

function sortChatList(list: Chat[]) {
  return [...list].sort((a, b) => {
    const aTop = !!a.peerIsTop
    const bTop = !!b.peerIsTop
    if (aTop !== bTop) return aTop ? -1 : 1
    return getChatSortTime(b) - getChatSortTime(a)
  })
}

export const useChatStore = defineStore('chat', {
  persist: {
    pick: ['selectedChatId']
  },
  share: {
    enable: true,
    initialize: true
  },
  state: (): ChatStore => ({
    chatList: [],
    selectedChatId: '',
    reopenTick: 0
  }),
  actions: {
    markReopen() {
      this.$patch((state) => {
        state.reopenTick++
      })
    },

    setSelectedChatId(chatId: string) {
      if (this.selectedChatId !== chatId) {
        this.$patch((state) => {
          state.selectedChatId = chatId
        })
      }

      if (chatId) {
        return this.markRead(chatId)
      }
    },

    clearSelectedChatId() {
      if (!this.selectedChatId) return
      this.$patch((state) => {
        state.selectedChatId = ''
      })
    },

    patchPeerRemark(peerId: string, remark: string) {
      if (!peerId) return
      this.$patch((state) => {
        state.chatList.forEach((item) => {
          if (item.peerId === peerId) {
            item.peerRemark = remark
          }
        })
      })
    },

    loadList(fullSync = false) {
      return chatApi.list().then((res) => {
        if (res.code === 0 && res.data) {
          this.$patch((state) => {
            state.chatList = sortChatList(res.data!)
          })

          if (fullSync) {
            return useMessageDbStore().syncAllMessagesFromCloud(this.chatList.map((chat) => chat.sessionId))
          }
        }
      })
    },

    refreshList() {
      return this.loadList()
    },

    onReceiveMessage(msg: Message) {
      const currentUserId = useUserStore().authInfo.userId
      const index = this.chatList.findIndex((item) => item.sessionId === msg.sessionId)

      if (index === -1) {
        this.loadList()
        useMessageDbStore().syncMessagesFromCloud(msg.sessionId)
        return
      }

      const chat = this.chatList[index]
      const isActive = this.selectedChatId === chat.id
      const isFromSelf = msg.fromId === currentUserId

      this.$patch((state) => {
        const item = state.chatList[index]
        item.lastMsgContent = msg
        const msgTime = msg.updatedAt || msg.createdAt
        item.updatedAt = isValidBackendTime(msgTime) ? msgTime! : nowBackendDatetime()
        if (!isActive && !isFromSelf) {
          item.unreadNum += 1
        }
        state.chatList = sortChatList(state.chatList)
      })
    },

    toggleTop(chatId: string, isTop: boolean) {
      const index = this.chatList.findIndex((item) => item.id === chatId)
      if (index === -1) return

      const prevTop = this.chatList[index].peerIsTop

      this.$patch((state) => {
        const item = state.chatList[index]
        item.peerIsTop = isTop
        state.chatList = sortChatList(state.chatList)
      })

      chatApi.top({ chatId, isTop }).then((res) => {
        if (res.code !== 0) {
          this.$patch((state) => {
            const item = state.chatList[index]
            item.peerIsTop = prevTop
            state.chatList = sortChatList(state.chatList)
          })
          window.$message.error(res.msg)
        }
      })
    },

    toggleMute(chatId: string, isMute: boolean) {
      const index = this.chatList.findIndex((item) => item.id === chatId)
      if (index === -1) return

      const prevMute = this.chatList[index].peerIsMute

      this.$patch((state) => {
        const item = state.chatList[index]
        item.peerIsMute = isMute
      })

      chatApi.mute({ chatId, isMute }).then((res) => {
        if (res.code !== 0) {
          this.$patch((state) => {
            const item = state.chatList[index]
            item.peerIsMute = prevMute
          })
          window.$message.error(res.msg)
        }
      })
    },

    markRead(chatId: string) {
      const index = this.chatList.findIndex((item) => item.id === chatId)
      if (index === -1) return Promise.resolve()

      const prevUnread = this.chatList[index].unreadNum
      if (prevUnread === 0) return Promise.resolve()

      this.$patch((state) => {
        state.chatList[index].unreadNum = 0
      })

      return chatApi.markRead({ chatId }).then((res) => {
        const currentIndex = this.chatList.findIndex((item) => item.id === chatId)
        if (currentIndex === -1) return

        if (res.code !== 0) {
          this.$patch((state) => {
            state.chatList[currentIndex].unreadNum = prevUnread
          })
          window.$message.error(res.msg)
          return
        }

        this.$patch((state) => {
          state.chatList[currentIndex].unreadNum = 0
        })
      })
    },

    /**
     * 更新会话最后一条消息预览（本地删除消息后）
     */
    updateLastMsgContent(sessionId: string, msg: Message | null) {
      const index = this.chatList.findIndex((item) => item.sessionId === sessionId)
      if (index === -1) return

      this.$patch((state) => {
        const item = state.chatList[index]
        item.lastMsgContent = msg
        if (msg) {
          const msgTime = msg.updatedAt || msg.createdAt
          if (isValidBackendTime(msgTime)) {
            item.updatedAt = msgTime!
          }
        }
        state.chatList = sortChatList(state.chatList)
      })
    },

    removeItem(chatId: string) {
      const index = this.chatList.findIndex((item) => item.id === chatId)
      if (index === -1) return

      const removed = this.chatList[index]

      if (this.selectedChatId === chatId) {
        this.clearSelectedChatId()
      }

      this.$patch((state) => {
        state.chatList = state.chatList.filter((item) => item.id !== chatId)
      })

      chatApi.remove({ chatId }).then((res) => {
        if (res.code !== 0) {
          this.$patch((state) => {
            state.chatList.splice(index, 0, removed)
            state.chatList = sortChatList(state.chatList)
          })
          window.$message.error(res.msg)
        }
      })
    }
  }
})
