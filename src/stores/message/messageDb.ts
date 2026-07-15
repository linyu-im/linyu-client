import { messageApi } from '@/api'
import {
  batchInsertMessages,
  deleteMessageById,
  queryLatestMessageIdBySession,
  queryMessageById,
  queryMessagesByIds,
  queryMessagesByPage,
  softDeleteMessageById,
  softDeleteMessagesBySessionId,
  updateMessageLocalExt
} from '@/db/message'
import type { DbMessage, MessageDateRange } from '@/db/message'
import type {
  FileMessageLocalExt,
  ImageMessageLocalExt,
  Message,
  StickerMessageLocalExt,
  VideoMessageLocalExt
} from '@/types/api/message'
import { serializeMessageLocalExt, parseMessageLocalExt } from '@/utils/messageLocalExt'
import { nowBackendDatetime } from '@/utils/time'
import { defineStore } from 'pinia'

const LOCAL_EXT_MSG_TYPES = new Set(['file', 'image', 'video', 'sticker'])

function mapDbMessageToMessage(dbMsg: DbMessage): Message {
  const content = JSON.parse(dbMsg.content)
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
    keywordContent: dbMsg.keywordContent,
    createdAt: dbMsg.createdAt,
    updatedAt: dbMsg.updatedAt,
    failReason: dbMsg.failReason
  }

  if (LOCAL_EXT_MSG_TYPES.has(dbMsg.msgType)) {
    return {
      ...base,
      msgType: dbMsg.msgType as 'file' | 'image' | 'video' | 'sticker',
      content,
      localExt: parseMessageLocalExt(dbMsg.msgType, dbMsg.localExt) as
        | FileMessageLocalExt
        | ImageMessageLocalExt
        | VideoMessageLocalExt
        | StickerMessageLocalExt
        | undefined
    } as Message
  }

  return {
    ...base,
    msgType: dbMsg.msgType as Message['msgType'],
    content
  } as Message
}

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
        keywordContent: msg.keywordContent,
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
     * 根据 id 从本地库查询单条消息
     */
    async getMessageById(id: string): Promise<Message | null> {
      if (!id) return null
      const dbMsg = await queryMessageById(id)
      if (!dbMsg) return null
      return mapDbMessageToMessage(dbMsg)
    },

    /**
     * 根据 ids 批量从本地库查询消息
     */
    async getMessagesByIds(ids: string[]): Promise<Map<string, Message>> {
      const dbMsgs = await queryMessagesByIds(ids)
      const map = new Map<string, Message>()
      dbMsgs.forEach((dbMsg) => {
        map.set(dbMsg.id, mapDbMessageToMessage(dbMsg))
      })
      return map
    },

    /**
     * 从本地数据库加载消息（分页）
     */
    async loadMessagesFromDb(
      sessionId: string,
      page: number,
      pageSize: number,
      msgType?: string,
      dateRange?: MessageDateRange,
      keyword?: string
    ) {
      const result = await queryMessagesByPage({ sessionId, page, pageSize, msgType, dateRange, keyword })
      const messages = result.records.map(mapDbMessageToMessage)
      return {
        records: messages,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: messages.length > 0 && messages.length >= pageSize
      }
    },

    /**
     * 软删除本地单条消息
     */
    async deleteLocalMessage(id: string) {
      if (!id) return
      await softDeleteMessageById(id, nowBackendDatetime())
    },

    /**
     * 软删除指定会话的聊天记录（设置 deletedAt 为当前时间）
     */
    async deleteChatHistoryBySession(sessionId: string) {
      if (!sessionId) return
      await softDeleteMessagesBySessionId(sessionId, nowBackendDatetime())
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
