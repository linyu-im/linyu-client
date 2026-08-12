/** 通知音效类型 */
export type SoundKind = 'message' | 'call' | 'complete'

const SOUND_URLS: Record<SoundKind, string> = {
  message: new URL('../../assets/sounds/message.wav', import.meta.url).href,
  call: new URL('../../assets/sounds/call.wav', import.meta.url).href,
  complete: new URL('../../assets/sounds/complete.wav', import.meta.url).href
}

const audioCache = new Map<SoundKind, HTMLAudioElement>()

const getAudio = (kind: SoundKind): HTMLAudioElement => {
  let audio = audioCache.get(kind)
  if (!audio) {
    audio = new Audio(SOUND_URLS[kind])
    audio.preload = 'auto'
    audioCache.set(kind, audio)
  }
  return audio
}

/** 单次播放（消息 / 网盘完成） */
export const playSound = (kind: 'message' | 'complete') => {
  const audio = getAudio(kind)
  audio.loop = false
  audio.currentTime = 0
  void audio.play().catch(() => undefined)
}

/** 开始循环播放（通话铃），幂等 */
export const startLoopSound = (kind: 'call') => {
  const audio = getAudio(kind)
  if (!audio.paused && audio.loop) return
  audio.loop = true
  audio.currentTime = 0
  void audio.play().catch(() => undefined)
}

/** 停止循环播放，幂等 */
export const stopLoopSound = (kind: 'call') => {
  const audio = audioCache.get(kind)
  if (!audio) return
  audio.loop = false
  audio.pause()
  audio.currentTime = 0
}
