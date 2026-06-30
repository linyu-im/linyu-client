import { messageApi } from '@/api'
import {
  batchInsertMessages,
  deleteMessageById,
  queryLatestMessageIdBySession,
  queryMessagesByPage,
  updateMessageLocalExt
} from '@/db/message'
import type { DbMessage } from '@/db/message'
import type {
  FileMessageLocalExt,
  ImageMessageLocalExt,
  Message,
  StickerMessageLocalExt,
  VideoMessageLocalExt
} from '@/types/api/message'
import { serializeMessageLocalExt, parseMessageLocalExt } from '@/utils/messageLocalExt'
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
        failReason: msg.failReason,
        localExt: serializeMessageLocalExt(msg.msgType, msg.localExt)
      }))

      await batchInsertMessages(dbMessages)
    },

    async replaceLocalWithServer(localId: string, serverMsg: Message) {
      await deleteMessageById(localId)
      await this.saveMessages([serverMsg])
    },

    async updateFileMessageLocalExt(messageId: string, localExt: FileMessageLocalExt) {
      const serialized = serializeMessageLocalExt('file', localExt)
      if (!serialized) return
      await updateMessageLocalExt(messageId, serialized)
    },

    async updateImageMessageLocalExt(messageId: string, localExt: ImageMessageLocalExt) {
      const serialized = serializeMessageLocalExt('image', localExt)
      if (!serialized) return
      await updateMessageLocalExt(messageId, serialized)
    },

    async updateVideoMessageLocalExt(messageId: string, localExt: VideoMessageLocalExt) {
      const serialized = serializeMessageLocalExt('video', localExt)
      if (!serialized) return
      await updateMessageLocalExt(messageId, serialized)
    },

    async updateStickerMessageLocalExt(messageId: string, localExt: StickerMessageLocalExt) {
      const serialized = serializeMessageLocalExt('sticker', localExt)
      if (!serialized) return
      await updateMessageLocalExt(messageId, serialized)
    },

    /**
     * 从本地数据库加载消息（分页）
     */
    async loadMessagesFromDb(sessionId: string, page: number, pageSize: number) {
      const result = await queryMessagesByPage({ sessionId, page, pageSize })

      const messages: Message[] = result.records.map((dbMsg) => {
        const base = {
          id: dbMsg.id,
          sessionId: dbMsg.sessionId,
          fromId: dbMsg.fromId,
          toId: dbMsg.toId,
          fromType: dbMsg.fromType,
          isShowTime: dbMsg.isShowTime === 1,
          status: dbMsg.status,
          sceneType: dbMsg.sceneType,
          quoteMsgId: dbMsg.quoteMsgId,
          createdAt: dbMsg.createdAt,
          updatedAt: dbMsg.updatedAt,
          failReason: dbMsg.failReason
        }
        const content = JSON.parse(dbMsg.content)
        if (dbMsg.msgType === 'file') {
          return {
            ...base,
            msgType: 'file' as const,
            content,
            localExt: parseMessageLocalExt(dbMsg.msgType, dbMsg.localExt) as FileMessageLocalExt | undefined
          }
        }
        if (dbMsg.msgType === 'image') {
          return {
            ...base,
            msgType: 'image' as const,
            content,
            localExt: parseMessageLocalExt(dbMsg.msgType, dbMsg.localExt) as ImageMessageLocalExt | undefined
          }
        }
        if (dbMsg.msgType === 'video') {
          return {
            ...base,
            msgType: 'video' as const,
            content,
            localExt: parseMessageLocalExt(dbMsg.msgType, dbMsg.localExt) as VideoMessageLocalExt | undefined
          }
        }
        if (dbMsg.msgType === 'sticker') {
          return {
            ...base,
            msgType: 'sticker' as const,
            content,
            localExt: parseMessageLocalExt(dbMsg.msgType, dbMsg.localExt) as StickerMessageLocalExt | undefined
          }
        }
        return {
          ...base,
          msgType: dbMsg.msgType as Message['msgType'],
          content
        } as Message
      })

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
