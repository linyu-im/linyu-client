import type { Robot, RobotAnswersDeltaData, RobotAnswersParam } from '@/types/api/robot'
import type { Message } from '@/types/api/message'
import { type ApiResponse, post, postSse } from '@/utils/network/http'

export interface RobotAnswersStreamHandlers {
  onDelta: (content: string) => void
  onDone: (message: Message) => void
  onError?: (message: string) => void
}

export function getRobotAvatar(id: string): Promise<ApiResponse<string>> {
  return post<string, { robotId: string }>('/api/ai/v1/robot/avatar/get', { robotId: id })
}

export function getRobotInfo(id: string): Promise<ApiResponse<Robot>> {
  return post<Robot, { robotId: string }>('/api/ai/v1/robot/info', { robotId: id })
}

export function listRobots(): Promise<ApiResponse<Robot[]>> {
  return post<Robot[], void>('/api/ai/v1/robot/list')
}

export function answers(params: RobotAnswersParam): Promise<ApiResponse<Message>> {
  return post<Message, RobotAnswersParam>('/api/ai/v1/robot/answers', params)
}

export function answersStream(
  params: RobotAnswersParam,
  handlers: RobotAnswersStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  return postSse(
    '/api/ai/v1/robot/answers/stream',
    params,
    (event, data) => {
      try {
        if (event === 'delta') {
          const parsed = JSON.parse(data) as RobotAnswersDeltaData
          handlers.onDelta(parsed.content)
          return
        }
        if (event === 'done') {
          const parsed = JSON.parse(data) as Message
          handlers.onDone(parsed)
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        handlers.onError?.(message)
      }
    },
    signal
  )
}
