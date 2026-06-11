export const VOICE_RECORD_MAX_DURATION = 60
export const VOICE_RECORD_WARN_REMAINING = 10

interface VoiceRecordResult {
  blob: Blob
  durationSec: number
  mimeType: string
}

const pickMimeType = () => {
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  return ''
}

const buildFileExtension = (mimeType: string) => {
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

export const buildVoiceFileName = (mimeType: string) => `voice-${Date.now()}.${buildFileExtension(mimeType)}`

export function useVoiceRecorder() {
  const isRecording = ref(false)
  const durationSec = ref(0)

  let mediaRecorder: MediaRecorder | null = null
  let mediaStream: MediaStream | null = null
  let chunks: Blob[] = []
  let durationTimer: ReturnType<typeof setInterval> | null = null
  let startedAt = 0

  const clearTimer = () => {
    if (!durationTimer) return
    clearInterval(durationTimer)
    durationTimer = null
  }

  const stopStream = () => {
    mediaStream?.getTracks().forEach((track) => track.stop())
    mediaStream = null
  }

  const resetState = () => {
    clearTimer()
    isRecording.value = false
    durationSec.value = 0
    chunks = []
    mediaRecorder = null
  }

  const start = () => {
    if (isRecording.value) return Promise.resolve()

    return navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaStream = stream
        chunks = []
        const mimeType = pickMimeType()
        mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data)
        }

        mediaRecorder.start(200)
        startedAt = Date.now()
        durationSec.value = 0
        isRecording.value = true
        clearTimer()
        durationTimer = setInterval(() => {
          durationSec.value = Math.min(Math.floor((Date.now() - startedAt) / 1000), VOICE_RECORD_MAX_DURATION)
        }, 200)
      })
      .catch((error) => {
        resetState()
        stopStream()
        throw error
      })
  }

  const stop = (): Promise<VoiceRecordResult | null> => {
    return new Promise((resolve) => {
      clearTimer()
      isRecording.value = false

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resetState()
        stopStream()
        resolve(null)
        return
      }

      const mimeType = mediaRecorder.mimeType || 'audio/webm'
      const finalDuration = Math.min(
        VOICE_RECORD_MAX_DURATION,
        Math.max(1, durationSec.value || Math.ceil((Date.now() - startedAt) / 1000))
      )

      mediaRecorder.onstop = () => {
        stopStream()
        const blob = chunks.length ? new Blob(chunks, { type: mimeType }) : null
        resetState()
        if (!blob || blob.size === 0) {
          resolve(null)
          return
        }
        resolve({
          blob,
          durationSec: finalDuration,
          mimeType
        })
      }

      mediaRecorder.stop()
    })
  }

  const cancel = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.onstop = null
      mediaRecorder.stop()
    }
    resetState()
    stopStream()
  }

  onBeforeUnmount(() => {
    cancel()
  })

  return {
    isRecording,
    durationSec,
    start,
    stop,
    cancel
  }
}
