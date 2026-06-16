import type { ComposerTranslation } from 'vue-i18n'
import type { EditorSendUnit } from '@/utils/editorMessage'
import type { Message, SendMessageContent, SendMessageMsgType } from '@/types/api/message'
import type { AvatarType } from '@/types/common'

const createLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const createLocalMessageBase = (fromId: string, toId: string) => {
  const now = new Date().toISOString()
  return {
    id: createLocalId(),
    sessionId: '',
    fromId,
    toId,
    fromType: 'user' as AvatarType,
    isShowTime: false,
    status: 'sending',
    msgScene: '',
    createdAt: now,
    updatedAt: now
  }
}

export const createLocalMessageFromUnit = (unit: EditorSendUnit, fromId: string, toId: string): Message => {
  const base = createLocalMessageBase(fromId, toId)
  switch (unit.msgType) {
    case 'text':
      return { ...base, msgType: 'text', content: unit.content }
    case 'image':
      return { ...base, msgType: 'image', content: unit.content }
    case 'video':
      return { ...base, msgType: 'video', content: unit.content }
    case 'file':
      return { ...base, msgType: 'file', content: unit.content }
  }
}

export const createLocalMessage = (
  msgType: SendMessageMsgType,
  content: SendMessageContent,
  fromId: string,
  toId: string
): Message => {
  const base = createLocalMessageBase(fromId, toId)
  return { ...base, msgType, content } as Message
}

export const patchMessageById = (messages: Message[], id: string, patch: Partial<Message>): Message[] =>
  messages.map((item) => (item.id === id ? ({ ...item, ...patch } as Message) : item))

export const resolveMessageFailReason = (code: number, msg: string, t: ComposerTranslation): string => {
  const normalized = msg?.trim()
  if (normalized) {
    if (/拉黑|blocked|block/i.test(normalized)) {
      return t('message.sendStatus.blocked')
    }
    if (/网络|network/i.test(normalized)) {
      return t('message.sendStatus.network')
    }
    if (!/^HTTP Error:|^Network Error:/i.test(normalized)) {
      return normalized
    }
  }

  if (/^Network Error:/i.test(normalized)) {
    return t('message.sendStatus.network')
  }

  if (code >= 500) {
    return t('message.sendStatus.network')
  }

  return t('message.sendStatus.unknown')
}
