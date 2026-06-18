import type { Robot, RobotAnswersParam } from '@/types/api/robot'
import type { Message } from '@/types/api/message'
import { type ApiResponse, post } from '@/utils/http'

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
