import type { AvatarType } from '@/types/common'

export interface TextContent {
  text: string
}

export interface ImageContent {
  imgUrl: string
  imgThumbUrl: string
  imgName: string
  imgSize: number
}

export interface VideoContent {
  videoUrl: string
  videoThumbUrl: string
  videoName: string
  videoSize: number
}

export interface FileContent {
  fileUrl: string
  fileType: string
  fileName: string
  fileSize: number
}

export interface ECardContent {
  userId: string
  userName: string
  userAvatar: string
}

export interface VoiceContent {
  voiceUrl: string
  voiceDuration: string
}

export interface StickerContent {
  stickerUrl: string
  stickerName: string
}

type MsgTypeMap = {
  text: TextContent
  image: ImageContent
  video: VideoContent
  file: FileContent
  ecard: ECardContent
  voice: VoiceContent
  sticker: StickerContent
}

export type Message = {
  [K in keyof MsgTypeMap]: {
    id: string
    sessionId: string
    fromId: string
    toId: string
    msgType: K
    content: MsgTypeMap[K]
    fromType?: AvatarType
    isShowTime: boolean
    status?: string
    failReason?: string
    /** 媒体上传进度 0–100，仅本地发送中的媒体消息 */
    uploadProgress?: number
    msgScene: string
    quoteMsgId?: string
    createdAt: string
    updatedAt: string
  }
}[keyof MsgTypeMap]

export interface SendMessageMention {
  id: string
  mentionType: string
}

export type SendMessageMsgType = keyof MsgTypeMap

export type SendMessageContent = MsgTypeMap[SendMessageMsgType]

export interface SendMessageToUserParam {
  toUserId: string
  msgType: SendMessageMsgType
  content: SendMessageContent
  /** 文本消息中的 @ 提及列表（与 content.text 中的 @昵称 对应） */
  mentions?: SendMessageMention[]
}

export interface UploadMessageFileChunkParam {
  fileHash: string
  chunkIndex: string
  file: File | Blob
}

export interface MergeMessageFileParam {
  fileHash: string
  fileSize: number
  fileName: string
  totalChunk: number
}

export interface MessagePageParam {
  toId: string
  page: number
  pageSize: number
}

export interface MessagePageResult {
  records: Message[]
  total: number
  page: number
  pageSize: number
  totalPage: number
}
