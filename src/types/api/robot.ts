export interface Robot {
  id: string
  robotName: string
  robotAvatar: string
  robotDesc: string
  modelId: string
  prompt: string
  status: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface RobotAnswersParam {
  peerId: string
  robotId: string
  question: string
  msgScene: string
}
