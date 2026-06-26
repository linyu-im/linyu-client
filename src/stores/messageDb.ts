import { messageApi } from '@/api'
import {
  batchInsertMessages,
  deleteMessageById,
  queryLatestMessageIdBySession,
  queryMessagesByPage
} from '@/db/message'
import type { DbMessage } from '@/db/message'
import type { Message } from '@/types/api/message'
import { defineStore } from 'pinia'

type MessageDbStore = {
  syncingMessages: boolean
}

export const useMessageDbStore = defineStore('messageDb', {
  persist: false,
  state: (): MessageDbStore => ({
    syncingMessages: false
  }),
  actions: {
    /**
     * 将消息保存到本地数据库
     */
    async saveMessages(messages: Message[]) {
      if (messages.length === 0) return

      const dbMessages: DbMessage[] = messages.map((msg) => ({
        id: msg.id,
        sessionId: msg.sessionId,
        fromId: msg.fromId,
        toId: msg.toId,
        msgType: msg.msgType,
        fromType: msg.fromType,
        isShowTime: msg.isShowTime ? 1 : 0,
        content: JSON.stringify(msg.content),
        status: msg.status,
        sceneType: msg.sceneType,
        quoteMsgId: msg.quoteMsgId,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        failReason: msg.failReason
      }))

      await batchInsertMessages(dbMessages)
    },

    async replaceLocalWithServer(localId: string, serverMsg: Message) {
      await deleteMessageById(localId)
      await this.saveMessages([serverMsg])
    },

    /**
     * 从本地数据库加载消息（分页）
     */
    async loadMessagesFromDb(sessionId: string, page: number, pageSize: number) {
      const result = await queryMessagesByPage({ sessionId, page, pageSize })

      const messages: Message[] = result.records.map((dbMsg) => ({
        id: dbMsg.id,
        sessionId: dbMsg.sessionId,
        fromId: dbMsg.fromId,
        toId: dbMsg.toId,
        msgType: dbMsg.msgType as Message['msgType'],
        fromType: dbMsg.fromType,
        isShowTime: dbMsg.isShowTime === 1,
        content: JSON.parse(dbMsg.content),
        status: dbMsg.status,
        sceneType: dbMsg.sceneType,
        quoteMsgId: dbMsg.quoteMsgId,
        createdAt: dbMsg.createdAt,
        updatedAt: dbMsg.updatedAt,
        failReason: dbMsg.failReason
      }))

      return {
        records: messages,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPage: Math.ceil(result.total / result.pageSize)
      }
    },

    /**
     * 获取指定会话的最新消息 ID
     */
    async getLatestMessageId(sessionId: string): Promise<string | null> {
      return queryLatestMessageIdBySession(sessionId)
    },

    /**
     * 从云端加载消息并保存到本地数据库
     * @param sessionId 会话 ID
     */
    async syncMessagesFromCloud(sessionId: string) {
      const latestMsgId = await this.getLatestMessageId(sessionId)

      const res = await messageApi.list({
        sessionId,
        sinceMsgId: latestMsgId ?? undefined
      })

      if (res.code === 0 && res.data && res.data.length > 0) {
        await this.saveMessages(res.data)
      }
    },

    /**
     * 批量从云端同步所有会话消息到本地数据库
     */
    async syncAllMessagesFromCloud(sessionIds: string[]) {
      if (sessionIds.length === 0) return

      this.$patch((state) => {
        state.syncingMessages = true
      })

      try {
        await Promise.all(sessionIds.map((sessionId) => this.syncMessagesFromCloud(sessionId)))
      } finally {
        this.$patch((state) => {
          state.syncingMessages = false
        })
      }
    }
  }
})
