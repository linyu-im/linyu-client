<template>
  <div class="audio-call" data-tauri-drag-region>
    <header class="audio-call__top" data-tauri-drag-region>
      <div class="audio-call__top-actions" @mousedown.stop>
        <SvgIconButton
          href="#minimize"
          color="var(--text-color)"
          hover-color="var(--text-color)"
          hover-bg="var(--icon-hover-color)"
          @click="minimizeCurrentWindow" />
        <SvgIconButton
          href="#close"
          color="var(--text-color)"
          hover-color="#fff"
          hover-bg="var(--red)"
          @click="onHangup" />
      </div>
    </header>

    <div class="audio-call__body">
      <div class="audio-call__remote">
        <div class="audio-call__remote-halo">
          <Avatar
            v-if="peerId"
            class="audio-call__avatar-img"
            :id="peerId"
            :type="sceneType === 'group' ? 'group' : 'user'"
            :size="120"
            :round="true" />
          <div v-else class="audio-call__avatar audio-call__avatar--lg">
            {{ displayName.slice(0, 1) }}
          </div>
        </div>
        <div class="audio-call__name">{{ displayName }}</div>
        <div class="audio-call__timer">
          <svg v-if="hasRemotePeer" class="audio-call__timer-icon"><use href="#voice"></use></svg>
          <span class="audio-call__timer-text">{{ statusText }}</span>
        </div>
      </div>
      <div ref="remoteAudioContainer" class="audio-call__audio-sink" aria-hidden="true" />
    </div>

    <div class="audio-call__footer" @mousedown.stop>
      <div class="audio-call__action">
        <div class="audio-call__action-wrap">
          <SvgIconButton
            :href="micOn ? '#microphone' : '#microphone-off'"
            :size="48"
            :radius="14"
            icon-size="22px"
            color="var(--text-color)"
            hover-color="var(--text-color)"
            bg="var(--card-bg-color)"
            hover-bg="var(--button-soft-bg)"
            @click="onToggleMic" />
          <span v-if="micOn" class="audio-call__action-dot audio-call__action-dot--on" />
          <span v-else class="audio-call__action-dot audio-call__action-dot--red" />
        </div>
        <span class="audio-call__action-label audio-call__action-label--mic">
          {{ micOn ? t('audioVideoCall.mute') : t('audioVideoCall.unmute') }}
        </span>
      </div>

      <div class="audio-call__action">
        <SvgIconButton
          href="#hangup"
          :size="48"
          :radius="14"
          icon-size="22px"
          color="#fff"
          hover-color="#fff"
          bg="var(--red)"
          hover-bg="color-mix(in srgb, var(--red) 88%, #000)"
          @click="onHangup" />
        <span class="audio-call__action-label">{{ t('audioVideoCall.hangup') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { UnlistenFn } from '@tauri-apps/api/event'
  import { emit, listen } from '@tauri-apps/api/event'
  import { useRoute } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import { avCallApi } from '@/api'
  import Avatar from '@/components/Avatar.vue'
  import SvgIconButton from '@/components/SvgIconButton.vue'
  import { useLivekitRoom } from '@/composables/useLivekitRoom'
  import { CALL_JOIN_EVENT, CALL_REMOTE_HANGUP_EVENT, CALL_ROOM_CHANGE_EVENT } from '@/constants/event'
  import { livekitErrorI18nKey, type CallRemoteHangupPayload, type CallWindowJoinPayload } from '@/services/livekitCall'
  import { useAvCallStore } from '@/stores/app/avCall'
  import type { AvCallType } from '@/types/api/avCall'
  import type { CallRecordCallStatus } from '@/types/api/message'
  import { resolveChatSessionIdByPeer, sendCallRecordMsg } from '@/utils/message/callRecord'
  import { closeCurrentWindow, minimizeCurrentWindow } from '@/utils/desktop/window'
  import { useAppSettingsStore } from '@/stores/app/appSettings'
  import { startLoopSound, stopLoopSound } from '@/utils/common/sound'

  const RECONNECT_HOLD_MS = 5000
  const END_CLOSE_DELAY_MS = 2000
  const NO_ANSWER_MS = 60_000

  const { t } = useI18n()
  const route = useRoute()
  const avCallStore = useAvCallStore()
  const appSettings = useAppSettingsStore()

  const sessionId = ref('')
  const peerId = ref('')
  const displayName = ref('')
  const chatSessionId = ref('')
  const recordCallType = ref<AvCallType>(route.query.callType === 'video' ? 'video' : 'audio')
  const sceneType = ref<'user' | 'group'>('user')
  const callSeconds = ref(0)
  const waitingDots = ref(0)
  const remoteAudioContainer = ref<HTMLElement | null>(null)
  const reconnectingIds = ref<string[]>([])
  const callEnding = ref(false)
  const endingTipKey = ref('audioVideoCall.callEnded')
  const hadRemotePeer = ref(false)
  let timer: ReturnType<typeof setInterval> | undefined
  let waitingAnimTimer: ReturnType<typeof setInterval> | undefined
  let unansweredTimer: ReturnType<typeof setTimeout> | undefined
  let unlistenJoin: UnlistenFn | undefined
  let unlistenRemoteHangup: UnlistenFn | undefined
  let hangingUp = false
  let prevRemoteIds = new Set<string>()
  const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()

  const { micOn, remoteParticipants, connect, disconnect, toggleMic } = useLivekitRoom({
    video: false,
    remoteAudioContainer,
    onConnected: () => {
      avCallStore.setStatus('calling')
    },
    onError: (error) => {
      window.$message?.error(t(livekitErrorI18nKey(error)))
    }
  })

  const hasRemotePeer = computed(() => remoteParticipants.value.length > 0)
  const isAloneInCall = computed(() => remoteParticipants.value.length === 0 && reconnectingIds.value.length === 0)

  const notifyChatRoomChange = () => {
    const id = chatSessionId.value.trim()
    if (!id) return
    avCallStore.notifyRoomChange(id)
    void emit(CALL_ROOM_CHANGE_EVENT, { sessionId: id }).catch(() => undefined)
  }

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
    reconnectingIds.value = []
  }

  const removeReconnecting = (identity: string) => {
    clearReconnectTimer(identity)
    reconnectingIds.value = reconnectingIds.value.filter((id) => id !== identity)
  }

  const clearUnansweredTimer = () => {
    if (unansweredTimer) {
      clearTimeout(unansweredTimer)
      unansweredTimer = undefined
    }
    stopLoopSound('call')
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
          const userIds = [
            ...new Set([...remoteParticipants.value.map((item) => item.identity), ...reconnectingIds.value])
          ].filter(Boolean)
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

  const startUnansweredTimer = () => {
    clearUnansweredTimer()
    if (hadRemotePeer.value) return
    if (appSettings.notifications.callSound) {
      startLoopSound('call')
    }
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
      const reconnectingSet = new Set(reconnectingIds.value)

      for (const id of [...reconnectingIds.value]) {
        if (currentIds.has(id)) removeReconnecting(id)
      }

      for (const identity of prevRemoteIds) {
        if (currentIds.has(identity) || reconnectingSet.has(identity)) continue
        reconnectingIds.value = [...reconnectingIds.value.filter((id) => id !== identity), identity]
        clearReconnectTimer(identity)
        reconnectTimers.set(
          identity,
          setTimeout(() => onReconnectTimeout(identity), RECONNECT_HOLD_MS)
        )
      }

      prevRemoteIds = currentIds
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
    if (reconnectingIds.value.length > 0) {
      return `${t('audioVideoCall.peerDisconnected')}${dots}`
    }
    return `${t('audioVideoCall.waitingAnswer')}${dots}`
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
  }

  const applyFromRoute = () => {
    applyPayload({
      sessionId: String(route.query.sessionId || ''),
      peerId: String(route.query.peerId || ''),
      displayName: String(route.query.displayName || route.query.peerId || ''),
      sceneType: route.query.scene === 'group' ? 'group' : 'user',
      callType: route.query.callType === 'video' ? 'video' : 'audio',
      chatSessionId: String(route.query.chatSessionId || '')
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
    startUnansweredTimer()
  }

  const onToggleMic = () => {
    void toggleMic()
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
  .audio-call {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 12px 12px 28px;
    box-sizing: border-box;
    color: var(--text-color);
    background:
      radial-gradient(ellipse 80% 55% at 50% 0%, rgba(var(--primary-rgb), 0.06), transparent 70%),
      var(--bg-secondary-color);
    user-select: none;

    &__top {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
      min-height: 32px;
      z-index: 2;
    }

    &__top-actions {
      display: flex;
      align-items: center;
    }

    &__body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
    }

    &__remote {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    &__remote-halo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 120px;
      height: 120px;
      border-radius: 50%;
    }

    &__avatar-img {
      width: 120px !important;
      height: 120px !important;
    }

    &__avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--card-bg-color);
      color: var(--text-color);
      font-size: 42px;
      font-weight: 700;

      &--lg {
        width: 120px;
        height: 120px;
      }
    }

    &__name {
      margin-top: 18px;
      font-size: 22px;
      font-weight: 700;
    }

    &__timer {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 32px;
      margin-top: 10px;
      padding: 0 14px;
      border-radius: 999px;
      background: var(--toolbar-bg-color);
      backdrop-filter: blur(8px);
      box-sizing: border-box;
    }

    &__timer-icon {
      width: 14px;
      height: 14px;
      color: var(--primary-color);
    }

    &__timer-text {
      font-size: 13px;
      font-variant-numeric: tabular-nums;
      min-width: 7.5em;
      text-align: center;
    }

    &__audio-sink {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
    }

    &__footer {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 36px;
      flex-shrink: 0;
      padding-top: 8px;
    }

    &__action {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    &__action-wrap {
      position: relative;
    }

    &__action-dot {
      position: absolute;
      left: 50%;
      bottom: 2px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid var(--bg-secondary-color);
      transform: translateX(-50%);

      &--on {
        background: var(--primary-color);
      }

      &--red {
        background: var(--red);
      }
    }

    &__action-label {
      font-size: 12px;
      color: var(--text-muted-color);

      &--mic {
        min-width: 4em;
        text-align: center;
      }
    }
  }
</style>
