import type { EditorSegment } from '@/components/Message/MessageEditor/index.vue'
import type { FileContent, ImageContent, SendMessageMention, SendMessageParam, VideoContent } from '@/types/api/message'
import {
  needsMediaUpload,
  uploadMessageMediaByUrl,
  type UploadErrorHandler,
  type UploadProgressHandler
} from '@/utils/messageMediaUpload'

export type EditorSendUnit =
  | { msgType: 'text'; content: { text: string }; mentions: SendMessageMention[] }
  | { msgType: 'image'; content: ImageContent }
  | { msgType: 'video'; content: VideoContent }
  | { msgType: 'file'; content: FileContent }

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
            mentionType: seg.mentionType ?? 'user'
          })
        }
        break
      case 'image':
        flushText()
        units.push({ msgType: 'image', content: seg.content })
        break
      case 'video':
        flushText()
        units.push({ msgType: 'video', content: seg.content })
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
const uploadUrlCache = new Map<string, Promise<string | null>>()

const normalizeUploadFileName = (fileName: string | undefined, msgType: 'image' | 'video' | 'file') => {
  const normalized = fileName?.trim()
  if (normalized) return normalized
  if (msgType === 'image') return 'image.png'
  if (msgType === 'video') return 'video.mp4'
  return 'file.bin'
}

export const unitNeedsMediaUpload = (unit: EditorSendUnit): boolean => {
  switch (unit.msgType) {
    case 'text':
      return false
    case 'image':
      return needsMediaUpload(unit.content.imgUrl) || needsMediaUpload(unit.content.imgThumbUrl)
    case 'video':
      return needsMediaUpload(unit.content.videoUrl) || needsMediaUpload(unit.content.videoThumbUrl)
    case 'file':
      return needsMediaUpload(unit.content.fileUrl)
  }
}

/**
 * 本地媒体 URL 需先上传后才能发送；返回上传后的真实 URL。
 */
export const resolveSegmentMediaUrl = (
  url: string,
  options?: {
    fileName?: string
    fileSize?: number
    msgType?: 'image' | 'video' | 'file'
    onProgress?: UploadProgressHandler
    onError?: UploadErrorHandler
  }
): Promise<string | null> => {
  if (!url) return Promise.resolve(null)
  if (needsMediaUpload(url)) {
    const cacheKey = `${url}:${options?.fileName ?? ''}`
    const cached = uploadUrlCache.get(cacheKey)
    if (cached) return cached

    const fileName = normalizeUploadFileName(options?.fileName, options?.msgType ?? 'file')
    const task = uploadMessageMediaByUrl(url, fileName, {
      onProgress: options?.onProgress,
      onError: options?.onError
    }).then((result) => {
      if (!result) {
        uploadUrlCache.delete(cacheKey)
      }
      return result
    })
    uploadUrlCache.set(cacheKey, task)
    return task
  }
  if (isRemoteUrl(url)) return Promise.resolve(url)
  return Promise.resolve(url)
}

type BuildSendParamOptions = {
  onProgress?: UploadProgressHandler
  onError?: UploadErrorHandler
  isShowTime?: boolean
  quoteMsgId?: string
}

export const buildSendParam = (
  unit: EditorSendUnit,
  sessionId: string,
  options?: BuildSendParamOptions
): Promise<SendMessageParam | null> => {
  const onProgress = options?.onProgress
  const onError = options?.onError
  const isShowTime = options?.isShowTime ?? false
  const quoteMsgId = options?.quoteMsgId?.trim() || undefined

  if (unit.msgType === 'text') {
    if (!unit.content.text.trim()) return Promise.resolve(null)
    const param: SendMessageParam = {
      sessionId,
      msgType: 'text',
      content: unit.content,
      isShowTime,
      ...(quoteMsgId ? { quoteMsgId } : {})
    }
    if (unit.mentions.length) {
      param.mentions = unit.mentions
    }
    return Promise.resolve(param)
  }

  if (unit.msgType === 'image') {
    return resolveSegmentMediaUrl(unit.content.imgUrl, {
      fileName: unit.content.imgName,
      fileSize: unit.content.imgSize,
      msgType: 'image',
      onProgress,
      onError
    }).then((imgUrl) => {
      if (!imgUrl) return null
      const thumbIsSame = unit.content.imgThumbUrl === unit.content.imgUrl
      if (thumbIsSame || !needsMediaUpload(unit.content.imgThumbUrl)) {
        return {
          sessionId,
          msgType: 'image' as const,
          content: {
            ...unit.content,
            imgUrl,
            imgThumbUrl: imgUrl
          },
          isShowTime,
          ...(quoteMsgId ? { quoteMsgId } : {})
        }
      }
      return resolveSegmentMediaUrl(unit.content.imgThumbUrl, {
        fileName: unit.content.imgName,
        fileSize: unit.content.imgSize,
        msgType: 'image'
      }).then((imgThumbUrl) => ({
        sessionId,
        msgType: 'image' as const,
        content: {
          ...unit.content,
          imgUrl,
          imgThumbUrl: imgThumbUrl || imgUrl
        },
        isShowTime,
        ...(quoteMsgId ? { quoteMsgId } : {})
      }))
    })
  }

  if (unit.msgType === 'video') {
    return resolveSegmentMediaUrl(unit.content.videoUrl, {
      fileName: unit.content.videoName,
      fileSize: unit.content.videoSize,
      msgType: 'video',
      onProgress,
      onError
    }).then((videoUrl) => {
      if (!videoUrl) return null
      const thumbIsSame = unit.content.videoThumbUrl === unit.content.videoUrl
      if (thumbIsSame || !needsMediaUpload(unit.content.videoThumbUrl)) {
        return {
          sessionId,
          msgType: 'video' as const,
          content: {
            ...unit.content,
            videoUrl,
            videoThumbUrl: videoUrl
          },
          isShowTime,
          ...(quoteMsgId ? { quoteMsgId } : {})
        }
      }
      return resolveSegmentMediaUrl(unit.content.videoThumbUrl, {
        fileName: unit.content.videoName,
        fileSize: unit.content.videoSize,
        msgType: 'video'
      }).then((videoThumbUrl) => ({
        sessionId,
        msgType: 'video' as const,
        content: {
          ...unit.content,
          videoUrl,
          videoThumbUrl: videoThumbUrl || videoUrl
        },
        isShowTime,
        ...(quoteMsgId ? { quoteMsgId } : {})
      }))
    })
  }

  if (unit.msgType === 'file') {
    return resolveSegmentMediaUrl(unit.content.fileUrl, {
      fileName: unit.content.fileName,
      fileSize: unit.content.fileSize,
      msgType: 'file',
      onProgress,
      onError
    }).then((fileUrl) => {
      if (!fileUrl) return null
      return {
        sessionId,
        msgType: 'file' as const,
        content: {
          ...unit.content,
          fileUrl
        },
        isShowTime,
        ...(quoteMsgId ? { quoteMsgId } : {})
      }
    })
  }

  return Promise.resolve(null)
}

export const buildSendParamsFromSegments = (
  segments: EditorSegment[],
  sessionId: string,
  options?: BuildSendParamOptions
): Promise<SendMessageParam[]> => {
  const units = buildSendUnitsFromSegments(segments)
  let chain: Promise<SendMessageParam[]> = Promise.resolve([])

  for (const unit of units) {
    chain = chain.then((params) =>
      buildSendParam(unit, sessionId, options).then((param) => {
        if (param) params.push(param)
        return params
      })
    )
  }

  return chain
}
