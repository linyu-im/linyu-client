import { messageApi } from '@/api'
import { SceneType } from '@/constants/common'
import i18n from '@/services/i18n'
import { useChatStore } from '@/stores/chat/chat'
import { useMessageDbStore } from '@/stores/message/messageDb'
import { useSendingMessagesStore } from '@/stores/message/sendingMessages'
import { useUserStore } from '@/stores/user/user'
import type { Message, SendMessageParam } from '@/types/api/message'
import { createLocalMessage, mergeReplacedServerMessage, resolveMessageFailReason } from '@/utils/messageSend'
import { buildSessionId } from '@/utils/session'
import { defineStore } from 'pinia'

const t = i18n.global.t

/** 转发目标：peerId + 会话场景类型 */
export interface ForwardPeer {
  peerId: string
  sceneType: SceneType
}

/** 通知 Chat 页同步消息列表 */
export interface ForwardSyncPayload {
  sessionId: string
  message: Message
  /** 服务端消息替换本地乐观消息时使用 */
  replaceLocalId?: string
}

type MessageForwardStore = {
  syncSeq: number
  syncPayload: ForwardSyncPayload | null
}

const normalizeMessage = (raw: Message): Message => ({
  ...raw,
  fromType: raw.fromType || 'user'
})

export const useMessageForwardStore = defineStore('messageForward', {
  persist: false,
  share: {
    enable: true,
    initialize: true
  },
  state: (): MessageForwardStore => ({
    syncSeq: 0,
    syncPayload: null
  }),
  actions: {
    syncToSession(payload: ForwardSyncPayload) {
      this.$patch((state) => {
        state.syncPayload = payload
        state.syncSeq += 1
      })
    },

    forwardToPeer(peer: ForwardPeer, source: Message, currentUserId: string): Promise<boolean> {
      const sessionId = buildSessionId(peer.peerId, peer.sceneType, currentUserId)
      const localMsg: Message = {
        ...createLocalMessage(source.msgType, source.content, currentUserId, peer.peerId, peer.sceneType),
        sessionId
      }
      const param: SendMessageParam = {
        sessionId,
        msgType: source.msgType,
        content: source.content,
        isShowTime: false
      }

      const sendingMessagesStore = useSendingMessagesStore()
      sendingMessagesStore.addMessage(peer.peerId, localMsg)
      this.syncToSession({ sessionId, message: localMsg })

      return messageApi
        .sendMsg(param)
        .then((res) => {
          if (res.code === 0 && res.data) {
            const normalized = normalizeMessage(mergeReplacedServerMessage(res.data, localMsg))
            return useMessageDbStore()
              .replaceLocalWithServer(localMsg.id, normalized)
              .then(() => {
                sendingMessagesStore.removeMessage(peer.peerId, localMsg.id)
                useChatStore().onReceiveMessage(normalized)
                this.syncToSession({
                  sessionId,
                  message: normalized,
                  replaceLocalId: localMsg.id
                })
                return true
              })
          }

          const reason = resolveMessageFailReason(res.code, res.msg, t)
          window.$message.error(reason)
          return this.markForwardFailed(localMsg, reason, peer.peerId, sessionId).then(() => false)
        })
        .catch(() => {
          const reason = t('message.sendStatus.network')
          window.$message.error(reason)
          return this.markForwardFailed(localMsg, reason, peer.peerId, sessionId).then(() => false)
        })
    },

    markForwardFailed(localMsg: Message, reason: string, peerId: string, sessionId: string): Promise<void> {
      const failedMsg: Message = {
        ...localMsg,
        sessionId,
        status: 'failed',
        failReason: reason
      }

      useSendingMessagesStore().updateMessage(peerId, localMsg.id, {
        status: 'failed',
        failReason: reason
      })

      return useMessageDbStore()
        .saveMessages([failedMsg])
        .then(() => {
          this.syncToSession({ sessionId, message: failedMsg })
        })
    },

    forward(peers: ForwardPeer[], source: Message) {
      const currentUserId = useUserStore().authInfo.userId
      if (!source || !currentUserId || peers.length === 0) return

      peers.reduce<Promise<void>>((chain, peer) => {
        return chain.then(() => this.forwardToPeer(peer, source, currentUserId).then(() => undefined))
      }, Promise.resolve())
    }
  }
})
