import { SceneType } from '@/constants/common'

export function generate1v1SessionId(id1: string, id2: string): string {
  if (id1 < id2) {
    return `${id1}_${id2}`
  }
  return `${id2}_${id1}`
}

export function buildSessionId(peerId: string, peerSceneType: string, currentUserId: string): string {
  if (peerSceneType === SceneType.Group) {
    return peerId
  }
  return generate1v1SessionId(currentUserId, peerId)
}
