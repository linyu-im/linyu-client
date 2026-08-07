<template>
  <div class="video-call" data-tauri-drag-region>
    <header class="video-call__top" data-tauri-drag-region>
      <div class="video-call__meta">
        <div class="video-call__meta-count">
          <svg class="video-call__meta-user"><use href="#user"></use></svg>
          <span>{{ t('audioVideoCall.participantCount', { count: participantCount }) }}</span>
        </div>
        <div class="video-call__meta-duration">
          <span v-if="hasRemotePeer" class="video-call__meta-dot" />
          <span class="video-call__meta-time">{{ statusText }}</span>
        </div>
      </div>

      <div class="video-call__top-actions" @mousedown.stop>
        <SvgIconButton
          href="#minimize"
          color="var(--text-color)"
          hover-color="var(--text-color)"
          hover-bg="var(--icon-hover-color)"
          @click="minimizeCurrentWindow" />
        <SvgIconButton
          :href="isMaximized ? '#restore' : '#maximize'"
          color="var(--text-color)"
          hover-color="var(--text-color)"
          hover-bg="var(--icon-hover-color)"
          @click="() => restoreOrMaximizeCurrentWindow().then((v) => (isMaximized = !v))" />
        <SvgIconButton
          href="#close"
          color="var(--text-color)"
          hover-color="#fff"
          hover-bg="var(--red)"
          @click="onHangup" />
      </div>
    </header>

    <div class="video-call__stage">
      <div class="video-call__main">
        <div class="video-call__main-feed">
          <video
            ref="mainVideoEl"
            class="video-call__main-video"
            :class="{ 'video-call__main-video--hidden': !focusHasVideo }"
            autoplay
            playsinline
            :muted="focusIsLocal" />
          <div v-if="!focusHasVideo" class="video-call__camera-off">
            <Avatar v-if="focusAvatarId" :id="focusAvatarId" type="user" :size="96" :round="true" />
            <span>{{ focusStatusLabel }}</span>
          </div>

          <div class="video-call__bottom-bar" @mousedown.stop>
            <span class="video-call__name-tag">
              <template v-if="resolveParticipantName && focusAvatarId">
                <Name class="video-call__name-resolve" :id="focusAvatarId" type="user" :group-id="peerId" instant />
                <span v-if="focusIsLocal">{{ t('audioVideoCall.meLabel') }}</span>
              </template>
              <template v-else>{{ focusDisplayName }}</template>
            </span>
            <div class="video-call__controls">
              <n-tooltip placement="top" :show-arrow="false">
                <template #trigger>
                  <div class="video-call__ctrl-wrap">
                    <SvgIconButton
                      :href="micOn ? '#microphone' : '#microphone-off'"
                      :size="40"
                      :radius="10"
                      icon-size="20px"
                      color="var(--text-color)"
                      hover-color="var(--text-color)"
                      hover-bg="var(--icon-hover-color)"
                      @click="onToggleMic" />
                    <span v-if="micOn" class="video-call__ctrl-dot video-call__ctrl-dot--on" />
                    <span v-else class="video-call__ctrl-dot video-call__ctrl-dot--red" />
                  </div>
                </template>
                {{ micOn ? t('audioVideoCall.microphone') : t('audioVideoCall.microphoneOff') }}
              </n-tooltip>

              <n-tooltip v-if="showCameraControl" placement="top" :show-arrow="false">
                <template #trigger>
                  <div class="video-call__ctrl-wrap">
                    <SvgIconButton
                      :href="cameraOn ? '#video' : '#video-off'"
                      :size="40"
                      :radius="10"
                      icon-size="20px"
                      color="var(--text-color)"
                      hover-color="var(--text-color)"
                      hover-bg="var(--icon-hover-color)"
                      @click="onToggleCamera" />
                    <span v-if="cameraOn" class="video-call__ctrl-dot video-call__ctrl-dot--on" />
                    <span v-else class="video-call__ctrl-dot video-call__ctrl-dot--red" />
                  </div>
                </template>
                {{ cameraOn ? t('audioVideoCall.camera') : t('audioVideoCall.cameraOff') }}
              </n-tooltip>

              <n-tooltip placement="top" :show-arrow="false">
                <template #trigger>
                  <SvgIconButton
                    href="#hangup"
                    :size="40"
                    :radius="10"
                    icon-size="20px"
                    color="#fff"
                    hover-color="#fff"
                    bg="var(--red)"
                    hover-bg="color-mix(in srgb, var(--red) 88%, #000)"
                    @click="onHangup" />
                </template>
                {{ t('audioVideoCall.hangup') }}
              </n-tooltip>
            </div>
          </div>
        </div>
      </div>

      <aside class="video-call__sidebar">
        <n-scrollbar class="video-call__sidebar-scroll" :theme-overrides="{ width: '6px' }">
          <div class="video-call__sidebar-list">
            <div
              v-for="item in sideParticipants"
              :key="item.identity"
              class="video-call__tile"
              :class="{
                'video-call__tile--off': !item.hasVideo,
                'video-call__tile--waiting': item.waiting
              }"
              role="button"
              tabindex="0"
              @click="focusIdentity = item.identity"
              @keydown.enter.prevent="focusIdentity = item.identity">
              <video
                v-if="!item.waiting"
                :ref="(el) => setTileVideoRef(item.identity, el)"
                class="video-call__tile-video"
                :class="{ 'video-call__tile-video--hidden': !item.hasVideo }"
                autoplay
                playsinline
                :muted="item.isLocal" />
              <div v-if="!item.hasVideo" class="video-call__tile-off">
                <Avatar v-if="item.avatarId" :id="item.avatarId" type="user" :size="52" :round="true" />
                <div v-else class="video-call__tile-avatar">
                  <svg><use href="#user"></use></svg>
                </div>
                <span v-if="item.waiting" class="video-call__tile-wait">
                  {{ item.reconnecting ? t('audioVideoCall.peerDisconnected') : t('audioVideoCall.waitingUserAnswer') }}
                </span>
              </div>
              <span class="video-call__tile-name">
                <template v-if="resolveParticipantName && item.avatarId">
                  <Name class="video-call__name-resolve" :id="item.avatarId" type="user" :group-id="peerId" instant />
                  <span v-if="item.isLocal">{{ t('audioVideoCall.meLabel') }}</span>
                </template>
                <template v-else-if="item.waiting && sceneType === 'user'">
                  {{ displayName || item.displayName }}
                </template>
                <template v-else>{{ item.displayName }}</template>
              </span>
            </div>
          </div>
        </n-scrollbar>
      </aside>
    </div>
    <div ref="remoteAudioContainer" class="video-call__audio-sink" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
  import type { UnlistenFn } from '@tauri-apps/api/event'
  import { emit, listen } from '@tauri-apps/api/event'
  import { useRoute } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import { avCallApi } from '@/api'
  import Avatar from '@/components/Avatar.vue'
  import Name from '@/components/Name.vue'
  import SvgIconButton from '@/components/SvgIconButton.vue'
  import { LIVEKIT_LOCAL_IDENTITY, useLivekitRoom } from '@/composables/useLivekitRoom'
  import { CALL_JOIN_EVENT, CALL_REMOTE_HANGUP_EVENT, CALL_ROOM_CHANGE_EVENT } from '@/constants/event'
  import { livekitErrorI18nKey, type CallRemoteHangupPayload, type CallWindowJoinPayload } from '@/services/livekitCall'
  import { useAvCallStore } from '@/stores/app/avCall'
  import { useUserStore } from '@/stores/user/user'
  import type { AvCallType } from '@/types/api/avCall'
  import type { CallRecordCallStatus } from '@/types/api/message'
  import { resolveChatSessionIdByPeer, sendCallRecordMsg } from '@/utils/message/callRecord'
  import { closeCurrentWindow, minimizeCurrentWindow, restoreOrMaximizeCurrentWindow } from '@/utils/desktop/window'

  const RECONNECT_HOLD_MS = 5000
  const END_CLOSE_DELAY_MS = 2000
  const NO_ANSWER_MS = 60_000

  interface CallParticipantView {
    identity: string
    displayName: string
    avatarId: string
    hasVideo: boolean
    isLocal: boolean
    waiting?: boolean
    reconnecting?: boolean
  }

  interface ReconnectingParticipant {
    identity: string
    displayName: string
  }

  const parseInviteUserIds = (raw: unknown): string[] => {
    if (Array.isArray(raw)) {
      return raw.map((id) => String(id).trim()).filter(Boolean)
    }
    if (typeof raw === 'string' && raw.trim()) {
      return raw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    }
    return []
  }

  const { t } = useI18n()
  const route = useRoute()
  const avCallStore = useAvCallStore()
  const userStore = useUserStore()

  const sessionId = ref('')
  const peerId = ref('')
  const displayName = ref('')
  const chatSessionId = ref('')
  const recordCallType = ref<AvCallType>(route.query.callType === 'audio' ? 'audio' : 'video')
  const inviteUserIds = ref<string[]>([])
  const sceneType = ref<'user' | 'group'>(route.query.scene === 'group' ? 'group' : 'user')
  const isMaximized = ref(false)
  const callSeconds = ref(0)
  const waitingDots = ref(0)
  const focusIdentity = ref(LIVEKIT_LOCAL_IDENTITY)
  const mainVideoEl = ref<HTMLVideoElement | null>(null)
  const remoteAudioContainer = ref<HTMLElement | null>(null)
  const tileVideoEls = new Map<string, HTMLVideoElement>()
  const hadRemotePeer = ref(false)

  let timer: ReturnType<typeof setInterval> | undefined
  let waitingAnimTimer: ReturnType<typeof setInterval> | undefined
  let unansweredTimer: ReturnType<typeof setTimeout> | undefined
  let unlistenJoin: UnlistenFn | undefined
  let unlistenRemoteHangup: UnlistenFn | undefined
  let hangingUp = false
  let prevRemoteIds = new Set<string>()
  const remoteNameCache = new Map<string, string>()
  const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const reconnectingParticipants = ref<ReconnectingParticipant[]>([])
  const callEnding = ref(false)
  const endingTipKey = ref('audioVideoCall.callEnded')

  const selfUserId = computed(() => userStore.authInfo.userId || '')
  // 仅视频通话显示摄像头；群语音进 video 窗仍隐藏
  const showCameraControl = computed(() => recordCallType.value === 'video')
  /** 群聊用 Name 组件按 userId + groupId 解析群名片/备注 */
  const resolveParticipantName = computed(() => sceneType.value === 'group')
  const reconnectingIdSet = computed(() => new Set(reconnectingParticipants.value.map((item) => item.identity)))

  const {
    micOn,
    cameraOn,
    remoteParticipants,
    mediaRevision,
    connect,
    disconnect,
    toggleMic,
    toggleCamera,
    attachVideoTo
  } = useLivekitRoom({
    video: true,
    // audio 通话（含群语音开 video 窗）默认不开摄像头
    initialCameraOn: route.query.callType !== 'audio',
    remoteAudioContainer,
    onConnected: () => {
      avCallStore.setStatus('calling')
    },
    onError: (error) => {
      window.$message?.error(t(livekitErrorI18nKey(error)))
    }
  })

  const notifyChatRoomChange = () => {
    const id = chatSessionId.value.trim()
    if (!id) return
    avCallStore.notifyRoomChange(id)
    void emit(CALL_ROOM_CHANGE_EVENT, { sessionId: id }).catch(() => undefined)
  }
  const localParticipant = computed<CallParticipantView>(() => ({
    identity: LIVEKIT_LOCAL_IDENTITY,
    displayName: t('audioVideoCall.meLabel'),
    avatarId: selfUserId.value,
    hasVideo: cameraOn.value,
    isLocal: true
  }))

  const remoteViews = computed<CallParticipantView[]>(() =>
    remoteParticipants.value.map((item) => ({
      identity: item.identity,
      displayName: sceneType.value === 'user' && displayName.value ? displayName.value : item.name || item.identity,
      avatarId: item.identity,
      hasVideo: item.hasVideo,
      isLocal: false
    }))
  )

  /** 期望出现在侧栏的远端用户：群聊为邀请列表，单聊为对端 */
  const expectedRemoteIds = computed(() => {
    if (inviteUserIds.value.length) return inviteUserIds.value
    if (sceneType.value === 'user' && peerId.value) return [peerId.value]
    return []
  })

  const joinedRemoteIdSet = computed(() => new Set(remoteParticipants.value.map((item) => item.identity)))

  const reconnectingViews = computed<CallParticipantView[]>(() =>
    reconnectingParticipants.value.map((item) => ({
      identity: item.identity,
      displayName:
        sceneType.value === 'user' && displayName.value ? displayName.value : item.displayName || item.identity,
      avatarId: item.identity,
      hasVideo: false,
      isLocal: false,
      waiting: true,
      reconnecting: true
    }))
  )

  const waitingViews = computed<CallParticipantView[]>(() => {
    const self = selfUserId.value
    const reconnecting = reconnectingIdSet.value
    return expectedRemoteIds.value
      .filter((id) => id && id !== self && !joinedRemoteIdSet.value.has(id) && !reconnecting.has(id))
      .map((id) => ({
        identity: id,
        displayName: id,
        avatarId: id,
        hasVideo: false,
        isLocal: false,
        waiting: true
      }))
  })

  const allParticipants = computed(() => [
    localParticipant.value,
    ...remoteViews.value,
    ...reconnectingViews.value,
    ...waitingViews.value
  ])

  const focusParticipant = computed(
    () => allParticipants.value.find((item) => item.identity === focusIdentity.value) || localParticipant.value
  )

  const sideParticipants = computed(() => allParticipants.value.filter((item) => item.identity !== focusIdentity.value))

  const focusHasVideo = computed(() => focusParticipant.value.hasVideo)
  const focusIsLocal = computed(() => focusParticipant.value.isLocal)
  const focusIsWaiting = computed(() => !!focusParticipant.value.waiting)
  const focusDisplayName = computed(() => {
    if (focusIsWaiting.value && sceneType.value === 'user' && displayName.value) {
      return displayName.value
    }
    return focusParticipant.value.displayName
  })
  const focusAvatarId = computed(() => focusParticipant.value.avatarId)
  const focusStatusLabel = computed(() => {
    if (callEnding.value) return t(endingTipKey.value)
    if (focusParticipant.value.reconnecting) return t('audioVideoCall.peerDisconnected')
    if (focusIsWaiting.value) return t('audioVideoCall.waitingUserAnswer')
    return t('audioVideoCall.cameraOffLabel')
  })

  const hasRemotePeer = computed(() => remoteParticipants.value.length > 0)
  const isAloneInCall = computed(
    () => remoteParticipants.value.length === 0 && reconnectingParticipants.value.length === 0
  )
  const participantCount = computed(() => allParticipants.value.length)

  const clearReconnectTimer = (identity: string) => {
    const handle = reconnectTimers.get(identity)
    if (handle) {
      clearTimeout(handle)
      reconnectTimers.delete(identity)
    }
  }

  const clearAllReconnectTimers = () => {
    for (const handle of reconnectTimers.values()) {
      clearTimeout(handle)
    }
    reconnectTimers.clear()
    reconnectingParticipants.value = []
  }

  const removeReconnecting = (identity: string) => {
    clearReconnectTimer(identity)
    reconnectingParticipants.value = reconnectingParticipants.value.filter((item) => item.identity !== identity)
  }

  const collectHangupUserIds = () => {
    const self = selfUserId.value
    const ids = new Set<string>()
    for (const id of inviteUserIds.value) {
      if (id && id !== self) ids.add(id)
    }
    for (const item of remoteParticipants.value) {
      if (item.identity && item.identity !== self) ids.add(item.identity)
    }
    for (const item of reconnectingParticipants.value) {
      if (item.identity && item.identity !== self) ids.add(item.identity)
    }
    if (sceneType.value === 'user' && peerId.value && peerId.value !== self) {
      ids.add(peerId.value)
    }
    return [...ids]
  }

  const endCall = async (options: {
    notifyApi: boolean
    showEndedTip?: boolean
    tipKey?: string
    sendCallRecord?: boolean
    callRecordStatus?: Extract<CallRecordCallStatus, 'ended' | 'missed' | 'canceled'>
  }) => {
    if (hangingUp) return
    hangingUp = true
    try {
      clearUnansweredTimer()
      if (options.showEndedTip) {
        callEnding.value = true
        endingTipKey.value = options.tipKey || 'audioVideoCall.callEnded'
        window.$message?.info(t(endingTipKey.value))
        await new Promise<void>((resolve) => {
          setTimeout(resolve, END_CLOSE_DELAY_MS)
        })
      }
      if (options.notifyApi) {
        if (sceneType.value === 'user' && peerId.value) {
          await avCallApi.hangupUser({ userId: peerId.value }).catch(() => undefined)
        } else if (sceneType.value === 'group' && peerId.value) {
          const userIds = collectHangupUserIds()
          if (userIds.length) {
            await avCallApi.hangupGroup({ groupId: peerId.value, userIds }).catch(() => undefined)
          }
        }
      }
      if (options.sendCallRecord !== false) {
        const recordSessionId = chatSessionId.value.trim() || resolveChatSessionIdByPeer(peerId.value, sceneType.value)
        if (recordSessionId) {
          chatSessionId.value = recordSessionId
          const status = options.callRecordStatus || (hadRemotePeer.value ? 'ended' : 'canceled')
          await sendCallRecordMsg({
            chatSessionId: recordSessionId,
            callType: recordCallType.value,
            callStatus: status,
            duration: status === 'ended' ? callSeconds.value : 0
          })
        } else {
          console.warn('[callRecord] skip: no chatSessionId', peerId.value, sceneType.value)
        }
      }
      clearAllReconnectTimers()
      await disconnect()
      avCallStore.clear()
      await closeCurrentWindow()
    } finally {
      hangingUp = false
    }
  }

  const clearUnansweredTimer = () => {
    if (unansweredTimer) {
      clearTimeout(unansweredTimer)
      unansweredTimer = undefined
    }
  }

  const startUnansweredTimer = () => {
    clearUnansweredTimer()
    if (hadRemotePeer.value) return
    unansweredTimer = setTimeout(() => {
      void endCall({
        notifyApi: true,
        showEndedTip: true,
        tipKey: 'audioVideoCall.nobodyAnswered',
        callRecordStatus: 'missed'
      })
    }, NO_ANSWER_MS)
  }

  const onReconnectTimeout = (identity: string) => {
    reconnectTimers.delete(identity)
    removeReconnecting(identity)
    inviteUserIds.value = inviteUserIds.value.filter((id) => id !== identity)
    if (focusIdentity.value === identity) {
      focusIdentity.value = LIVEKIT_LOCAL_IDENTITY
    }
    if (isAloneInCall.value) {
      void endCall({ notifyApi: true, showEndedTip: true })
    }
  }

  const startCallTimer = () => {
    if (timer) return
    avCallStore.setStatus('connected')
    timer = setInterval(() => {
      callSeconds.value += 1
    }, 1000)
  }

  watch(hasRemotePeer, (joined) => {
    if (joined) {
      hadRemotePeer.value = true
      clearUnansweredTimer()
      startCallTimer()
    }
  })

  // 远端进/出房 → 通知对应聊天会话刷新通话状态栏（2s 延迟在状态栏侧）
  watch(
    () =>
      remoteParticipants.value
        .map((item) => item.identity)
        .sort()
        .join(','),
    (next, prev) => {
      if (next === prev) return
      if (!sessionId.value || !chatSessionId.value.trim()) return
      notifyChatRoomChange()
    }
  )

  watch(
    remoteParticipants,
    (list) => {
      const currentIds = new Set(list.map((item) => item.identity))

      for (const item of list) {
        remoteNameCache.set(
          item.identity,
          sceneType.value === 'user' && displayName.value ? displayName.value : item.name || item.identity
        )
      }

      for (const item of [...reconnectingParticipants.value]) {
        if (currentIds.has(item.identity)) {
          removeReconnecting(item.identity)
        }
      }

      for (const identity of prevRemoteIds) {
        if (currentIds.has(identity) || reconnectingIdSet.value.has(identity)) continue
        const cachedName =
          sceneType.value === 'user' && displayName.value
            ? displayName.value
            : remoteNameCache.get(identity) || identity
        reconnectingParticipants.value = [
          ...reconnectingParticipants.value.filter((item) => item.identity !== identity),
          { identity, displayName: cachedName }
        ]
        clearReconnectTimer(identity)
        reconnectTimers.set(
          identity,
          setTimeout(() => onReconnectTimeout(identity), RECONNECT_HOLD_MS)
        )
      }

      prevRemoteIds = currentIds

      const focusStillPresent =
        focusIdentity.value === LIVEKIT_LOCAL_IDENTITY ||
        currentIds.has(focusIdentity.value) ||
        reconnectingIdSet.value.has(focusIdentity.value)
      if (!focusStillPresent) {
        // 主画面默认回到自己
        focusIdentity.value = LIVEKIT_LOCAL_IDENTITY
      }
    },
    { deep: true }
  )

  const durationTime = computed(() => {
    const h = Math.floor(callSeconds.value / 3600)
    const m = Math.floor((callSeconds.value % 3600) / 60)
    const s = callSeconds.value % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  const statusText = computed(() => {
    if (callEnding.value) return t(endingTipKey.value)
    if (hasRemotePeer.value) return durationTime.value
    const dots = '.'.repeat((waitingDots.value % 3) + 1)
    if (reconnectingParticipants.value.length > 0) {
      return `${t('audioVideoCall.peerDisconnected')}${dots}`
    }
    return `${t('audioVideoCall.waitingAnswer')}${dots}`
  })

  const setTileVideoRef = (identity: string, el: unknown) => {
    if (el instanceof HTMLVideoElement) {
      tileVideoEls.set(identity, el)
      attachVideoTo(el, identity)
    } else {
      tileVideoEls.delete(identity)
    }
  }

  const syncVideoAttachments = async () => {
    await nextTick()
    // 始终保持挂载（含 muted），关摄像头只盖遮罩，避免反复 detach 闪烁
    attachVideoTo(mainVideoEl.value, focusIdentity.value)
    for (const item of sideParticipants.value) {
      const el = tileVideoEls.get(item.identity)
      if (el) attachVideoTo(el, item.identity)
    }
  }

  // 仅在主画面切换或轨道真正增删时重挂；开关麦/摄像头只改遮罩与 hasVideo
  watch([focusIdentity, mediaRevision], () => {
    void syncVideoAttachments()
  })

  watch(mainVideoEl, (el) => {
    if (el) attachVideoTo(el, focusIdentity.value)
  })

  const applyPayload = (payload: Partial<CallWindowJoinPayload>) => {
    if (payload.sessionId) sessionId.value = payload.sessionId
    if (payload.peerId) peerId.value = payload.peerId
    if (payload.displayName) displayName.value = payload.displayName
    if (payload.sceneType === 'group' || payload.sceneType === 'user') sceneType.value = payload.sceneType
    if (payload.callType === 'audio' || payload.callType === 'video') {
      recordCallType.value = payload.callType
    }
    if (payload.chatSessionId) chatSessionId.value = payload.chatSessionId
    if (!chatSessionId.value && peerId.value) {
      chatSessionId.value = resolveChatSessionIdByPeer(peerId.value, sceneType.value)
    }
    if (payload.inviteUserIds) {
      inviteUserIds.value = parseInviteUserIds(payload.inviteUserIds)
    }
  }

  const applyFromRoute = () => {
    applyPayload({
      sessionId: String(route.query.sessionId || ''),
      peerId: String(route.query.peerId || ''),
      displayName: String(route.query.displayName || route.query.peerId || ''),
      sceneType: route.query.scene === 'group' ? 'group' : 'user',
      callType: route.query.callType === 'audio' ? 'audio' : 'video',
      chatSessionId: String(route.query.chatSessionId || ''),
      inviteUserIds: parseInviteUserIds(route.query.inviteUserIds)
    })
  }

  const joinRoom = async () => {
    if (!sessionId.value) return
    avCallStore.setCallContext({
      sessionId: sessionId.value,
      sceneType: sceneType.value,
      callType: recordCallType.value,
      peerId: peerId.value,
      displayName: displayName.value,
      status: 'calling'
    })
    await connect(sessionId.value, sceneType.value)
    await syncVideoAttachments()
    startUnansweredTimer()
  }

  const onToggleMic = () => {
    void toggleMic()
  }
  const onToggleCamera = () => {
    void toggleCamera()
  }

  const onHangup = () => {
    void endCall({ notifyApi: true })
  }

  const onRemoteHangup = (payload: CallRemoteHangupPayload) => {
    if (!payload.sessionId || payload.sessionId !== sessionId.value) return
    if (sceneType.value === 'user') {
      void endCall({ notifyApi: false, showEndedTip: true, sendCallRecord: false })
      return
    }
    if (isAloneInCall.value) {
      void endCall({ notifyApi: false, showEndedTip: true, sendCallRecord: false })
    }
  }

  onMounted(async () => {
    applyFromRoute()
    waitingAnimTimer = setInterval(() => {
      waitingDots.value = (waitingDots.value + 1) % 3
    }, 500)
    unlistenJoin = await listen<CallWindowJoinPayload>(CALL_JOIN_EVENT, (event) => {
      applyPayload(event.payload)
      void joinRoom()
    })
    unlistenRemoteHangup = await listen<CallRemoteHangupPayload>(CALL_REMOTE_HANGUP_EVENT, (event) => {
      onRemoteHangup(event.payload)
    })
    if (sessionId.value) {
      void joinRoom()
    }
  })

  onBeforeUnmount(() => {
    unlistenJoin?.()
    unlistenRemoteHangup?.()
    clearUnansweredTimer()
    clearAllReconnectTimers()
    if (timer) clearInterval(timer)
    if (waitingAnimTimer) clearInterval(waitingAnimTimer)
    void disconnect()
  })
</script>

<style lang="scss" scoped>
  .video-call {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 12px 2px 12px 12px;
    box-sizing: border-box;
    color: var(--text-color);
    background: var(--bg-secondary-color);
    user-select: none;

    &__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      margin-bottom: 12px;
      z-index: 2;
    }

    &__meta {
      display: flex;
      align-items: center;
      height: 32px;
      padding: 0 4px;
      border-radius: 999px;
      background: var(--toolbar-bg-color);
      backdrop-filter: blur(8px);
      box-sizing: border-box;
    }

    &__meta-count,
    &__meta-duration {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 100%;
      font-size: 13px;
      color: var(--text-color);
      box-sizing: border-box;
    }

    &__meta-count {
      width: 60px;
    }

    &__meta-duration {
      width: auto;
      min-width: 96px;
      padding: 0 8px;
      gap: 4px;
    }

    &__meta-time {
      width: auto;
      min-width: 68px;
      flex-shrink: 0;
      text-align: center;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    &__meta-user {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: var(--text-muted-color);
    }

    &__meta-dot {
      width: 8px;
      height: 8px;
      flex-shrink: 0;
      border-radius: 50%;
      background: var(--red);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--red) 25%, transparent);
    }

    &__top-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-right: 12px;
    }

    &__stage {
      flex: 1;
      display: flex;
      gap: 12px;
      min-height: 0;
    }

    &__main {
      flex: 1;
      min-width: 0;
    }

    &__main-feed {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: 16px;
      background: var(--bg-primary-color);
      border: 1px solid var(--border-color);
    }

    &__main-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: #000;

      &--hidden {
        visibility: hidden;
      }
    }

    &__camera-off {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-secondary-color);
      font-size: 14px;
      background: linear-gradient(145deg, rgba(var(--primary-rgb), 0.18), var(--bg-primary-color) 70%);
      z-index: 1;
    }

    &__bottom-bar {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 54px;
      z-index: 2;
      pointer-events: none;

      > * {
        pointer-events: auto;
      }
    }

    &__name-tag {
      position: absolute;
      left: 14px;
      top: 50%;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      max-width: 180px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 13px;
      color: var(--text-color);
      background: var(--toolbar-bg-color);
      backdrop-filter: blur(6px);
      overflow: hidden;
      white-space: nowrap;
      transform: translateY(-50%);
      z-index: 1;
    }

    &__name-resolve {
      min-width: 0;
      max-width: 100%;
      color: inherit;
      font-size: inherit;
    }

    &__controls {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 54px;
      padding: 0 20px 0 18px;
      border-radius: 12px;
      background: var(--toolbar-bg-color);
      border: 1px solid var(--border-color);
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    }

    &__ctrl-wrap {
      position: relative;
    }

    &__ctrl-dot {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      bottom: 2px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      pointer-events: none;

      &--on {
        background: var(--primary-color);
      }

      &--red {
        background: var(--red);
      }
    }

    &__sidebar {
      display: flex;
      flex-direction: column;
      width: 220px;
      flex-shrink: 0;
      min-height: 0;
    }

    &__sidebar-scroll {
      flex: 1;
      min-height: 0;
      height: 100%;

      :deep(.n-scrollbar-container) {
        height: 100%;
      }

      :deep(.n-scrollbar-content) {
        box-sizing: border-box;
      }

      :deep(.n-scrollbar-rail) {
        right: 0;
      }
    }

    &__sidebar-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-right: 10px;
      box-sizing: border-box;
    }

    &__tile {
      position: relative;
      flex-shrink: 0;
      width: 100%;
      aspect-ratio: 16 / 10;
      overflow: hidden;
      border-radius: 14px;
      background: var(--bg-primary-color);
      border: 1px solid var(--border-color);
      cursor: pointer;

      &:hover {
        border-color: color-mix(in srgb, var(--primary-color) 45%, var(--border-color));
      }

      &--off {
        cursor: pointer;
      }
    }

    &__tile-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: #111;

      &--hidden {
        visibility: hidden;
      }
    }

    &__tile-off {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding-bottom: 28px;
      box-sizing: border-box;
      background: linear-gradient(160deg, rgba(var(--primary-rgb), 0.22), var(--card-bg-color));
    }

    &__tile-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      color: #fff;
      background: var(--primary-soft-color);

      svg {
        width: 26px;
        height: 26px;
      }
    }

    &__tile-wait {
      max-width: calc(100% - 16px);
      font-size: 12px;
      line-height: 1.3;
      color: var(--text-secondary-color);
      text-align: center;
      white-space: nowrap;
    }

    &__tile-name {
      position: absolute;
      left: 8px;
      bottom: 8px;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      max-width: calc(100% - 16px);
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-color);
      background: var(--toolbar-bg-color);
      backdrop-filter: blur(6px);
      overflow: hidden;
      white-space: nowrap;
      z-index: 1;
    }

    &__audio-sink {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
    }
  }
</style>
