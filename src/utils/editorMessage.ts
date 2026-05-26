import type { EditorSegment } from '@/components/Message/MessageEditor/index.vue'
import type { FileContent, ImageContent, SendMessageMention, SendMessageToUserParam } from '@/types/api/message'

export type EditorSendUnit =
  | { msgType: 'text'; content: { text: string }; mentions: SendMessageMention[] }
  | { msgType: 'image'; content: ImageContent }
  | { msgType: 'file'; content: FileContent }

const MENTION_TYPE_USER = 'user'

const formatMentionToken = (seg: Extract<EditorSegment, { type: 'mention' }>) => {
  const label = seg.label?.trim()
  return `@${label}`
}

const isBlankTextSegment = (seg: EditorSegment) => seg.type === 'text' && !seg.text?.trim()

/** 向文本缓冲追加内容；仅在已有内容且两侧非空白时在中间加空格，首尾不额外加 */
const appendToTextBuffer = (buffer: string, piece: string) => {
  if (!piece) return buffer
  if (buffer.length > 0) {
    const needSpace = !/\s$/.test(buffer) && !/^\s/.test(piece)
    if (needSpace) return `${buffer} ${piece}`
  }
  return buffer + piece
}

/**
 * 将编辑器 segments 拆成多条待发送消息。
 * 连续的 text / mention 合并为一条 text 消息（mention 以 @昵称 写入 text，并收集 mentions）。
 */
export const buildSendUnitsFromSegments = (segments: EditorSegment[]): EditorSendUnit[] => {
  const units: EditorSendUnit[] = []
  let textBuffer = ''
  const mentions: SendMessageMention[] = []

  const flushText = () => {
    const text = textBuffer.trim()
    if (!text && !mentions.length) {
      textBuffer = ''
      mentions.length = 0
      return
    }
    units.push({
      msgType: 'text',
      content: { text },
      mentions: [...mentions]
    })
    textBuffer = ''
    mentions.length = 0
  }

  for (const seg of segments) {
    if (isBlankTextSegment(seg)) continue

    switch (seg.type) {
      case 'text':
        textBuffer = appendToTextBuffer(textBuffer, seg.text)
        break
      case 'mention':
        textBuffer = appendToTextBuffer(textBuffer, formatMentionToken(seg))
        if (seg.id) {
          mentions.push({
            id: seg.id,
            mentionType: MENTION_TYPE_USER
          })
        }
        break
      case 'image':
        flushText()
        units.push({ msgType: 'image', content: seg.content })
        break
      case 'file':
        flushText()
        units.push({ msgType: 'file', content: seg.content })
        break
    }
  }

  flushText()
  return units
}

const isRemoteUrl = (url: string) => /^https?:\/\//i.test(url)

/**
 * 本地 blob 需先上传后才能发送；当前无上传接口时返回 null。
 */
export const resolveSegmentMediaUrl = async (url: string): Promise<string | null> => {
  if (!url) return null
  if (isRemoteUrl(url)) return url
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return null
  }
  return url
}

export const buildSendParam = async (
  unit: EditorSendUnit,
  toUserId: string
): Promise<SendMessageToUserParam | null> => {
  if (unit.msgType === 'text') {
    if (!unit.content.text.trim()) return null
    const param: SendMessageToUserParam = {
      toUserId,
      msgType: 'text',
      content: unit.content
    }
    if (unit.mentions.length) {
      param.mentions = unit.mentions
    }
    return param
  }

  if (unit.msgType === 'image') {
    const imgUrl = await resolveSegmentMediaUrl(unit.content.imgUrl)
    if (!imgUrl) return null
    return {
      toUserId,
      msgType: 'image',
      content: {
        ...unit.content,
        imgUrl,
        imgThumbUrl: unit.content.imgThumbUrl || imgUrl
      }
    }
  }

  if (unit.msgType === 'file') {
    const fileUrl = await resolveSegmentMediaUrl(unit.content.fileUrl)
    if (!fileUrl) return null
    return {
      toUserId,
      msgType: 'file',
      content: {
        ...unit.content,
        fileUrl
      }
    }
  }

  return null
}

export const buildSendParamsFromSegments = async (
  segments: EditorSegment[],
  toUserId: string
): Promise<SendMessageToUserParam[]> => {
  const units = buildSendUnitsFromSegments(segments)
  const params: SendMessageToUserParam[] = []

  for (const unit of units) {
    const param = await buildSendParam(unit, toUserId)
    if (param) params.push(param)
  }

  return params
}
