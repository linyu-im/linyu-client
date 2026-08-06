import {
  Room,
  RoomEvent,
  Track,
  type LocalTrack,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RoomOptions,
  type TrackPublication
} from 'livekit-client'
import type { Ref } from 'vue'
import { prepareLivekitCredentials } from '@/services/livekitCall'

/** 本端在 UI 中的占位 identity */
export const LIVEKIT_LOCAL_IDENTITY = '__local__'

export interface LivekitRemoteParticipantView {
  identity: string
  name: string
  hasVideo: boolean
  hasAudio: boolean
}

export interface UseLivekitRoomOptions {
  video: boolean
  /** 进房时是否开启摄像头（仅 video=true 时有效，默认 true） */
  initialCameraOn?: boolean
  /** 兼容旧用法：进房后自动挂载本端预览（视频页可不用，改走 attachVideoTo） */
  localVideoEl?: Ref<HTMLVideoElement | null>
  remoteAudioContainer?: Ref<HTMLElement | null>
  onParticipantsChange?: (participants: LivekitRemoteParticipantView[]) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: unknown) => void
}

const roomOptions: RoomOptions = {
  adaptiveStream: true,
  dynacast: true
}

const isVideoPubActive = (pub: TrackPublication) => pub.kind === Track.Kind.Video && !!pub.track && !pub.isMuted

const isAudioPubActive = (pub: TrackPublication) => pub.kind === Track.Kind.Audio && !!pub.track && !pub.isMuted

export function useLivekitRoom(options: UseLivekitRoomOptions) {
  const connecting = ref(false)
  const connected = ref(false)
  const micOn = ref(true)
  const cameraOn = ref(options.video && options.initialCameraOn !== false)
  const remoteParticipants = ref<LivekitRemoteParticipantView[]>([])
  /** 轨道变更时递增，供页面 watch 后重新 attach */
  const mediaRevision = ref(0)

  let room: Room | null = null
  /** 自采摄像头轨（user-provided），离房时需 stop 释放设备 */
  let ownedCameraMediaTrack: MediaStreamTrack | null = null
  const attachedAudioElements = new Map<string, HTMLMediaElement[]>()

  const localIdentity = computed(() => room?.localParticipant.identity || LIVEKIT_LOCAL_IDENTITY)

  const bumpMedia = () => {
    mediaRevision.value += 1
  }

  const syncParticipants = () => {
    if (!room) {
      remoteParticipants.value = []
      options.onParticipantsChange?.([])
      return
    }
    const list: LivekitRemoteParticipantView[] = []
    room.remoteParticipants.forEach((participant) => {
      let hasVideo = false
      let hasAudio = false
      participant.trackPublications.forEach((pub) => {
        if (isVideoPubActive(pub)) hasVideo = true
        if (isAudioPubActive(pub)) hasAudio = true
      })
      list.push({
        identity: participant.identity,
        name: participant.name || participant.identity,
        hasVideo,
        hasAudio
      })
    })
    remoteParticipants.value = list
    options.onParticipantsChange?.(list)
  }

  const detachAudioKey = (key: string) => {
    const elements = attachedAudioElements.get(key)
    if (!elements) return
    for (const el of elements) {
      el.remove()
    }
    attachedAudioElements.delete(key)
  }

  const attachRemoteAudio = (
    track: RemoteTrack,
    participant: RemoteParticipant,
    publication: RemoteTrackPublication
  ) => {
    const key = `${participant.identity}:${publication.trackSid}`
    detachAudioKey(key)
    const element = track.attach()
    element.autoplay = true
    if (element instanceof HTMLVideoElement) {
      element.playsInline = true
    }
    element.classList.add('livekit-remote-audio')
    ;(options.remoteAudioContainer?.value || document.body).appendChild(element)
    attachedAudioElements.set(key, [element])
  }

  const getVideoTrack = (identity: string, opts?: { includeMuted?: boolean }): LocalTrack | RemoteTrack | null => {
    if (!room) return null
    const includeMuted = opts?.includeMuted !== false
    const isLocal = identity === LIVEKIT_LOCAL_IDENTITY || identity === room.localParticipant.identity
    if (isLocal) {
      const pub = [...room.localParticipant.videoTrackPublications.values()].find(
        (item) => item.track && (includeMuted || !item.isMuted)
      )
      return (pub?.track as LocalTrack | undefined) ?? null
    }
    const participant = room.remoteParticipants.get(identity)
    if (!participant) return null
    const pub = [...participant.videoTrackPublications.values()].find(
      (item) => item.track && item.isSubscribed && (includeMuted || !item.isMuted)
    )
    return (pub?.track as RemoteTrack | undefined) ?? null
  }

  /** 幂等挂载：同一 identity/track 已在元素上则不重挂，避免闪黑 */
  const attachVideoTo = (el: HTMLVideoElement | null | undefined, identity: string) => {
    if (!el || !room) return
    const track = getVideoTrack(identity, { includeMuted: true })
    const isLocal = identity === LIVEKIT_LOCAL_IDENTITY || identity === room.localParticipant.identity
    if (!track) {
      if (el.dataset.lkIdentity) {
        el.srcObject = null
        delete el.dataset.lkIdentity
        delete el.dataset.lkTrackSid
      }
      return
    }
    const sid = String(track.sid || '')
    if (el.dataset.lkIdentity === identity && el.dataset.lkTrackSid === sid && el.srcObject) {
      el.muted = isLocal
      el.style.transform = isLocal ? 'scaleX(-1)' : ''
      return
    }
    track.attach(el)
    el.autoplay = true
    el.playsInline = true
    el.muted = isLocal
    el.style.transform = isLocal ? 'scaleX(-1)' : ''
    el.dataset.lkIdentity = identity
    el.dataset.lkTrackSid = sid
  }

  const attachLocalVideo = () => {
    const el = options.localVideoEl?.value
    if (!el || !room) return
    attachVideoTo(el, LIVEKIT_LOCAL_IDENTITY)
  }

  const bindRoomEvents = (nextRoom: Room) => {
    nextRoom
      .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          attachRemoteAudio(track, participant, publication)
          syncParticipants()
          return
        }
        if (track.kind === Track.Kind.Video) {
          syncParticipants()
          bumpMedia()
        }
      })
      .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach()
          detachAudioKey(`${participant.identity}:${publication.trackSid}`)
          syncParticipants()
          return
        }
        if (track.kind === Track.Kind.Video) {
          track.detach()
          syncParticipants()
          bumpMedia()
        }
      })
      .on(RoomEvent.TrackMuted, (publication) => {
        if (publication.kind !== Track.Kind.Video) return
        if (room) {
          cameraOn.value = [...room.localParticipant.videoTrackPublications.values()].some(
            (pub) => pub.track && !pub.isMuted
          )
        }
        // 仅更新 hasVideo 状态，不重挂轨道，避免闪烁
        syncParticipants()
      })
      .on(RoomEvent.TrackUnmuted, (publication) => {
        if (publication.kind !== Track.Kind.Video) return
        if (room) {
          cameraOn.value = [...room.localParticipant.videoTrackPublications.values()].some(
            (pub) => pub.track && !pub.isMuted
          )
        }
        syncParticipants()
      })
      .on(RoomEvent.ParticipantConnected, () => {
        syncParticipants()
      })
      .on(RoomEvent.ParticipantDisconnected, () => {
        syncParticipants()
        bumpMedia()
      })
      .on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.kind === Track.Kind.Video) {
          if (options.video) attachLocalVideo()
          syncParticipants()
          bumpMedia()
        }
      })
      .on(RoomEvent.LocalTrackUnpublished, (publication) => {
        if (publication.kind === Track.Kind.Video) {
          syncParticipants()
          bumpMedia()
        }
      })
      .on(RoomEvent.Disconnected, () => {
        connected.value = false
        cleanupAttachments()
        syncParticipants()
        bumpMedia()
        options.onDisconnected?.()
      })
  }

  const attachExistingRemoteTracks = (nextRoom: Room) => {
    nextRoom.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        if (publication.track && publication.isSubscribed && publication.kind === Track.Kind.Audio) {
          attachRemoteAudio(publication.track, participant, publication)
        }
      })
    })
  }

  const cleanupAttachments = () => {
    for (const key of [...attachedAudioElements.keys()]) {
      detachAudioKey(key)
    }
    const localEl = options.localVideoEl?.value
    if (localEl) {
      localEl.srcObject = null
    }
  }

  const releaseOwnedCameraTrack = () => {
    if (!ownedCameraMediaTrack) return
    try {
      ownedCameraMediaTrack.stop()
    } catch {
      // ignore
    }
    ownedCameraMediaTrack = null
  }

  const stopLocalTracks = async (target: Room | null) => {
    if (!target) return
    const pubs = [
      ...target.localParticipant.audioTrackPublications.values(),
      ...target.localParticipant.videoTrackPublications.values()
    ]
    for (const pub of pubs) {
      const track = pub.track as LocalTrack | undefined
      if (!track) continue
      try {
        track.detach()
        await track.stop()
      } catch {
        // ignore
      }
    }
    releaseOwnedCameraTrack()
    try {
      await target.localParticipant.setMicrophoneEnabled(false)
    } catch {
      // ignore
    }
  }

  /**
   * 自采并 publish 摄像头轨（user-provided）。
   * SDK 对 user-provided 轨 mute/unmute 不会 restartTrack，关→开才不会卡顿。
   */
  const publishUserCameraTrack = async (target: Room) => {
    const existing = target.localParticipant.getTrackPublication(Track.Source.Camera)
    if (existing?.track) return existing

    const acquire = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      })
      return stream.getVideoTracks()[0]
    }

    let mediaTrack: MediaStreamTrack
    try {
      mediaTrack = await acquire()
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (/device in use|NotReadableError|Could not start video source/i.test(msg)) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        mediaTrack = await acquire()
      } else {
        throw error
      }
    }

    if (!mediaTrack) {
      throw new Error('CAMERA_TRACK_EMPTY')
    }

    ownedCameraMediaTrack = mediaTrack
    await target.localParticipant.publishTrack(mediaTrack, {
      source: Track.Source.Camera,
      name: 'camera'
    })
    return target.localParticipant.getTrackPublication(Track.Source.Camera)
  }

  const connect = async (sessionId: string, sceneType: 'user' | 'group') => {
    if (connecting.value) return
    connecting.value = true
    try {
      await disconnect()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const { host, token } = await prepareLivekitCredentials(sessionId, sceneType)
      const nextRoom = new Room(roomOptions)
      bindRoomEvents(nextRoom)
      await nextRoom.connect(host, token)
      room = nextRoom
      connected.value = true

      await nextRoom.localParticipant.setMicrophoneEnabled(true)
      micOn.value = true
      if (options.video && options.initialCameraOn !== false) {
        await publishUserCameraTrack(nextRoom)
        cameraOn.value = true
        await nextTick()
        attachLocalVideo()
      } else {
        cameraOn.value = false
      }

      attachExistingRemoteTracks(nextRoom)
      syncParticipants()
      bumpMedia()
      options.onConnected?.()
    } catch (error) {
      options.onError?.(error)
      throw error
    } finally {
      connecting.value = false
    }
  }

  const setMicEnabled = async (enabled: boolean) => {
    if (!room) return
    try {
      await room.localParticipant.setMicrophoneEnabled(enabled)
      micOn.value = enabled
    } catch (error) {
      options.onError?.(error)
    }
  }

  const setCameraEnabled = async (enabled: boolean) => {
    if (!room || !options.video) return
    try {
      let camPub = room.localParticipant.getTrackPublication(Track.Source.Camera)
      if (!camPub?.track && enabled) {
        // 仅首次无轨时采集发布；之后开关只走 mute/unmute
        camPub = await publishUserCameraTrack(room)
        cameraOn.value = true
        await nextTick()
        attachLocalVideo()
        bumpMedia()
        return
      }
      if (!camPub?.track) {
        cameraOn.value = false
        return
      }
      // 乐观更新 UI，mute/unmute 对 user-provided 轨不会 restartTrack
      cameraOn.value = enabled
      if (enabled) await camPub.unmute()
      else await camPub.mute()
    } catch (error) {
      cameraOn.value = !enabled
      options.onError?.(error)
    }
  }

  const toggleMic = async () => {
    await setMicEnabled(!micOn.value)
  }

  const toggleCamera = async () => {
    await setCameraEnabled(!cameraOn.value)
  }

  const disconnect = async () => {
    cleanupAttachments()
    if (room) {
      const current = room
      room = null
      await stopLocalTracks(current)
      await current.disconnect()
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    connected.value = false
    syncParticipants()
    bumpMedia()
  }

  onBeforeUnmount(() => {
    void disconnect()
  })

  return {
    connecting,
    connected,
    micOn,
    cameraOn,
    remoteParticipants,
    mediaRevision,
    localIdentity,
    connect,
    disconnect,
    toggleMic,
    toggleCamera,
    setMicEnabled,
    setCameraEnabled,
    getVideoTrack,
    attachVideoTo
  }
}
