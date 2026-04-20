export interface TextContent {
  text: string
}

export interface ImageContent {
  imgUrl: string
  imgThumbUrl: string
  imgName: string
  imgSize: string
}

export interface VideoContent {
  videoUrl: string
  videoThumbUrl: string
  videoName: string
  videoSize: string
}

export interface FileContent {
  fileUrl: string
  fileType: string
  fileName: string
  fileSize: string
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

type MsgTypeMap = {
  text: TextContent
  image: ImageContent
  video: VideoContent
  file: FileContent
  ecard: ECardContent
  voice: VoiceContent
}

export type Message = {
  [K in keyof MsgTypeMap]: {
    id: string
    sessionId: string
    fromId: string
    toId: string
    msgType: K
    content: MsgTypeMap[K]
    fromType?: string
    isShowTime: boolean
    status?: string
    msgScene: string
    quoteMsgId?: string
    createdAt: string
    updatedAt: string
  }
}[keyof MsgTypeMap]
