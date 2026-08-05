import { chatApi } from '@/api'
import router from '@/router'
import { useMessageDbStore } from '@/stores/message/messageDb'
import { useChatDetachedStore } from '@/stores/chat/chatDetached'
import { useUserStore } from '@/stores/user/user'
import type { Chat } from '@/types/api/chat'
import type { Message } from '@/types/api/message'
import { closeChatSessionWindow } from '@/utils/desktop/window'
import { defineStore } from 'pinia'
import { isValidBackendTime, nowBackendDatetime, parseBackendTime } from '@/utils/common/time'

const MESSAGE_TAB_PATH = '/home/message'

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

    detachChat(chatId: string) {
      if (!chatId) return
      useChatDetachedStore().detach(chatId)
      // 独立窗打开时主窗不能再选中该会话，保证列表只有一个选中态且右侧为空
      if (this.selectedChatId === chatId) {
        this.clearSelectedChatId()
      }
    },

    attachChat(chatId: string) {
      useChatDetachedStore().attach(chatId)
    },

    isDetachedChat(chatId: string) {
      return useChatDetachedStore().isDetached(chatId)
    },

    /** 是否正在查看该会话（主窗消息页选中或独立窗打开），用于未读/提醒，不用于列表高亮 */
    isChatActive(chatId: string) {
      if (useChatDetachedStore().isDetached(chatId)) return true
      // keep-alive 会保留 selectedChatId；离开消息 Tab 时不应视为正在查看
      return this.selectedChatId === chatId && router.currentRoute.value.path === MESSAGE_TAB_PATH
    },

    setSelectedChatId(chatId: string) {
      if (useChatDetachedStore().isDetached(chatId)) {
        return this.markRead(chatId)
      }

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

    /** 当前应上报的活跃 sessionId：主窗选中 + 独立窗会话 */
    buildActiveSessionIds(includeSelected = true) {
      const sessionIds: string[] = []
      const seen = new Set<string>()

      const pushByChatId = (chatId: string) => {
        if (!chatId) return
        const chat = this.chatList.find((item) => item.id === chatId)
        const sessionId = chat?.sessionId?.trim()
        if (!sessionId || seen.has(sessionId)) return
        seen.add(sessionId)
        sessionIds.push(sessionId)
      }

      if (includeSelected && this.selectedChatId && !this.isDetachedChat(this.selectedChatId)) {
        pushByChatId(this.selectedChatId)
      }

      useChatDetachedStore().detachedChatIds.forEach(pushByChatId)
      return sessionIds
    },

    reportActiveSessions(includeSelected = true) {
      return chatApi.activeSession({ activeSessionIds: this.buildActiveSessionIds(includeSelected) }).then((res) => {
        if (res.code !== 0) {
          window.$message.error(res.msg)
        }
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
      const isActive = this.isChatActive(chat.id)
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

      this.attachChat(chatId)
      void closeChatSessionWindow(chatId)

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
    },

    /** 仅本地移除会话（删除好友 / 退群 / 解散后，避免等接口再关窗导致主窗列表未同步） */
    removeChatLocal(chatId: string) {
      if (!chatId) return
      if (this.selectedChatId === chatId) {
        this.clearSelectedChatId()
      }
      this.attachChat(chatId)
      void closeChatSessionWindow(chatId)
      this.$patch((state) => {
        state.chatList = state.chatList.filter((item) => item.id !== chatId)
      })
    }
  }
})
