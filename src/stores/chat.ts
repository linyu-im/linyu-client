import { chatApi } from '@/api'
import { useUserStore } from '@/stores/user'
import type { Chat } from '@/types/api/chat'
import type { Message } from '@/types/api/message'
import { defineStore } from 'pinia'
import { nowBackendDatetime, parseBackendTime } from '@/utils/time'

type ChatStore = {
  chatList: Chat[]
  selectedChatId: string
}

function sortChatList(list: Chat[]) {
  list.sort((a, b) => {
    if (a.peerIsTop !== b.peerIsTop) return a.peerIsTop ? -1 : 1
    return parseBackendTime(b.updatedAt).getTime() - parseBackendTime(a.updatedAt).getTime()
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
    selectedChatId: ''
  }),
  actions: {
    setSelectedChatId(chatId: string) {
      if (this.selectedChatId === chatId) return

      this.$patch((state) => {
        state.selectedChatId = chatId
      })

      if (chatId) {
        this.markRead(chatId)
      }
    },

    clearSelectedChatId() {
      if (!this.selectedChatId) return
      this.$patch((state) => {
        state.selectedChatId = ''
      })
    },
    loadList() {
      return chatApi.list().then((res) => {
        if (res.code === 0 && res.data) {
          this.$patch((state) => {
            state.chatList = res.data!
          })
        }
      })
    },

    onReceiveMessage(msg: Message) {
      const currentUserId = useUserStore().authInfo.userId
      const index = this.chatList.findIndex((item) => item.sessionId === msg.sessionId)

      if (index === -1) {
        this.loadList()
        return
      }

      const chat = this.chatList[index]
      const isActive = this.selectedChatId === chat.id
      const isFromSelf = msg.fromId === currentUserId

      this.$patch((state) => {
        const item = state.chatList[index]
        item.lastMsgContent = msg
        item.updatedAt = msg.updatedAt || msg.createdAt || nowBackendDatetime()
        if (!isActive && !isFromSelf) {
          item.unreadNum += 1
        }
        sortChatList(state.chatList)
      })
    },

    toggleTop(chatId: string, isTop: boolean) {
      const index = this.chatList.findIndex((item) => item.id === chatId)
      if (index === -1) return

      const prevTop = this.chatList[index].peerIsTop
      const prevUpdatedAt = this.chatList[index].updatedAt

      this.$patch((state) => {
        const item = state.chatList[index]
        item.peerIsTop = isTop
        item.updatedAt = nowBackendDatetime()
        sortChatList(state.chatList)
      })

      chatApi.top({ chatId, isTop }).then((res) => {
        if (res.code !== 0) {
          this.$patch((state) => {
            const item = state.chatList[index]
            item.peerIsTop = prevTop
            item.updatedAt = prevUpdatedAt
            sortChatList(state.chatList)
          })
          window.$message.error(res.msg)
        }
      })
    },

    toggleMute(chatId: string, isMute: boolean) {
      const index = this.chatList.findIndex((item) => item.id === chatId)
      if (index === -1) return

      const prevMute = this.chatList[index].peerIsMute
      const prevUpdatedAt = this.chatList[index].updatedAt

      this.$patch((state) => {
        const item = state.chatList[index]
        item.peerIsMute = isMute
        item.updatedAt = nowBackendDatetime()
        sortChatList(state.chatList)
      })

      chatApi.mute({ chatId, isMute }).then((res) => {
        if (res.code !== 0) {
          this.$patch((state) => {
            const item = state.chatList[index]
            item.peerIsMute = prevMute
            item.updatedAt = prevUpdatedAt
            sortChatList(state.chatList)
          })
          window.$message.error(res.msg)
        }
      })
    },

    markRead(chatId: string) {
      const index = this.chatList.findIndex((item) => item.id === chatId)
      if (index === -1) return

      const prevUnread = this.chatList[index].unreadNum
      if (prevUnread === 0) return

      this.$patch((state) => {
        state.chatList[index].unreadNum = 0
      })

      chatApi.markRead({ chatId }).then((res) => {
        if (res.code !== 0) {
          this.$patch((state) => {
            state.chatList[index].unreadNum = prevUnread
          })
          window.$message.error(res.msg)
        }
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
            sortChatList(state.chatList)
          })
          window.$message.error(res.msg)
        }
      })
    }
  }
})
