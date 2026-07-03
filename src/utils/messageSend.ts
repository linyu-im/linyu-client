import type { ComposerTranslation } from 'vue-i18n'
import type { SceneType } from '@/constants/common'
import type { EditorSendUnit } from '@/utils/editorMessage'
import type { Message, SendMessageContent, SendMessageMsgType } from '@/types/api/message'
import type { FromType } from '@/types/common'
import { nowBackendDatetime } from '@/utils/time'

const createLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const createLocalMessageBase = (fromId: string, toId: string, sceneType: SceneType) => {
  const now = nowBackendDatetime()
  return {
    id: createLocalId(),
    sessionId: '',
    fromId,
    toId,
    fromType: 'user' as FromType,
    isShowTime: false,
    status: 'sending',
    sceneType,
    createdAt: now,
    updatedAt: now
  }
}

export const createLocalMessageFromUnit = (
  unit: EditorSendUnit,
  fromId: string,
  toId: string,
  sceneType: SceneType
): Message => {
  const base = createLocalMessageBase(fromId, toId, sceneType)
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
  toId: string,
  sceneType: SceneType
): Message => {
  const base = createLocalMessageBase(fromId, toId, sceneType)
  return { ...base, msgType, content } as Message
}

export const patchMessageById = (messages: Message[], id: string, patch: Partial<Message>): Message[] =>
  messages.map((item) => (item.id === id ? ({ ...item, ...patch } as Message) : item))

export const isStalePendingLocalMessage = (pending: Message, serverMessages: Message[]): boolean => {
  if (pending.status !== 'sending' || !pending.id.startsWith('local-')) return false

  if (pending.msgType === 'file') {
    const pendingFile = pending.content
    return serverMessages.some((s) => {
      if (s.msgType !== 'file' || s.fromId !== pending.fromId) return false
      return s.content.fileName === pendingFile.fileName && s.content.fileSize === pendingFile.fileSize
    })
  }

  return false
}

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

  return normalized
}
