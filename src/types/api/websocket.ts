import type { Message } from '@/types/api/message'

export interface WsRequest<T = unknown> {
  device: string
  seqId: string
  route: string
  data?: T
}

export interface WsResponse {
  device: string
  seqId: string
  route: string
  code: number
  data?: WsServerPayload
}

export interface WsServerPayload {
  seqId: string
  type: string
  content: Message
}
