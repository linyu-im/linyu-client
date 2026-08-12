<template>
  <div class="call-invite">
    <header class="call-invite__header" data-tauri-drag-region>
      <div class="call-invite__title" data-tauri-drag-region>
        <svg class="call-invite__title-icon" aria-hidden="true">
          <use :href="callType === 'video' ? '#video' : '#phone'" />
        </svg>
        <span data-tauri-drag-region>{{ headerTitle }}</span>
      </div>
      <SvgIconButton
        href="#close"
        :size="28"
        :radius="6"
        icon-size="14px"
        color="var(--text-muted-color)"
        hover-color="var(--text-color)"
        hover-bg="var(--icon-hover-color)"
        @click="onClose" />
    </header>

    <div class="call-invite__body">
      <div class="call-invite__avatar-wrap">
        <Avatar :id="fromId" :type="avatarType" :size="56" :round="true" />
        <span class="call-invite__avatar-badge" aria-hidden="true">
          <svg>
            <use :href="callType === 'video' ? '#video' : '#phone'" />
          </svg>
        </span>
      </div>

      <div class="call-invite__info">
        <strong class="call-invite__name">{{ displayName }}</strong>
        <p class="call-invite__desc">{{ description }}</p>
      </div>
    </div>

    <footer class="call-invite__actions">
      <button type="button" class="call-invite__btn call-invite__btn--reject" @click="onReject">
        <svg aria-hidden="true"><use href="#hangup" /></svg>
        <span>{{ rejectLabel }}</span>
      </button>
      <button type="button" class="call-invite__btn call-invite__btn--accept" @click="onAccept">
        <svg aria-hidden="true"><use :href="callType === 'video' ? '#video' : '#phone'" /></svg>
        <span>{{ acceptLabel }}</span>
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
  import type { UnlistenFn } from '@tauri-apps/api/event'
  import { listen } from '@tauri-apps/api/event'
  import { PhysicalPosition, currentMonitor, primaryMonitor } from '@tauri-apps/api/window'
  import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
  import { useRoute } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import Avatar from '@/components/Avatar.vue'
  import SvgIconButton from '@/components/SvgIconButton.vue'
  import { avCallApi } from '@/api'
  import type { AvCallType, CallInviteWindowPayload } from '@/types/api/avCall'
  import type { FromType } from '@/types/common'
  import { resolveChatSessionIdByPeer, sendCallRecordMsg } from '@/utils/message/callRecord'
  import { CALL_INVITE_HANGUP_EVENT, CALL_INVITE_UPDATE_EVENT } from '@/constants/event'
  import { closeCurrentWindow, createCallWindow, isCallWindowOpen, ShowCurrentWindow } from '@/utils/desktop/window'
  import { useAppSettingsStore } from '@/stores/app/appSettings'
  import { startLoopSound, stopLoopSound } from '@/utils/common/sound'

  type InviteScene = 'user' | 'group'

  const { t } = useI18n()
  const route = useRoute()
  const appSettings = useAppSettingsStore()

  const sessionId = ref('')
  const fromId = ref('')
  const displayName = ref('')
  const sceneType = ref<InviteScene>('user')
  const callType = ref<AvCallType>('video')
  const toUserIds = ref<string[]>([])

  let unlistenUpdate: UnlistenFn | undefined
  let unlistenHangup: UnlistenFn | undefined
  let acting = false

  const avatarType = computed<FromType>(() => (sceneType.value === 'group' ? 'group' : 'user'))

  const headerTitle = computed(() => {
    if (sceneType.value === 'group') {
      return callType.value === 'video' ? t('callInvite.groupVideoTitle') : t('callInvite.groupAudioTitle')
    }
    return callType.value === 'video' ? t('callInvite.userVideoTitle') : t('callInvite.userAudioTitle')
  })

  const description = computed(() =>
    callType.value === 'video' ? t('callInvite.userVideoDesc') : t('callInvite.userAudioDesc')
  )

  const rejectLabel = computed(() => (sceneType.value === 'group' ? t('callInvite.reject') : t('callInvite.hangup')))
  const acceptLabel = computed(() => (sceneType.value === 'group' ? t('callInvite.join') : t('callInvite.accept')))

  const parseToUserIds = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.map((id) => String(id).trim()).filter(Boolean)
    }
    if (typeof value === 'string' && value.trim()) {
      return value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    }
    return []
  }

  const applyPayload = (payload: Partial<CallInviteWindowPayload>) => {
    if (payload.sessionId) sessionId.value = payload.sessionId
    if (payload.fromId) fromId.value = payload.fromId
    if (payload.displayName) displayName.value = payload.displayName
    if (payload.sceneType === 'group' || payload.sceneType === 'user') {
      sceneType.value = payload.sceneType
    }
    if (payload.callType === 'audio' || payload.callType === 'video') {
      callType.value = payload.callType
    }
    if (payload.toUserIds) {
      toUserIds.value = parseToUserIds(payload.toUserIds)
    }
  }

  const applyFromRoute = () => {
    const query = route.query
    applyPayload({
      sessionId: String(query.sessionId || ''),
      fromId: String(query.fromId || ''),
      displayName: String(query.displayName || query.fromId || ''),
      sceneType: query.scene === 'group' ? 'group' : 'user',
      callType: query.callType === 'audio' ? 'audio' : 'video',
      toUserIds: parseToUserIds(query.toUserIds)
    })
  }

  const placeBottomRight = async () => {
    const webview = WebviewWindow.getCurrent()
    const monitor = (await currentMonitor()) ?? (await primaryMonitor())
    if (!monitor) return
    const [outerSize, scaleFactor] = await Promise.all([webview.outerSize(), webview.scaleFactor()])
    const margin = Math.round(16 * scaleFactor)
    const x = monitor.workArea.position.x + monitor.workArea.size.width - outerSize.width - margin
    const y = monitor.workArea.position.y + monitor.workArea.size.height - outerSize.height - margin
    await webview.setPosition(new PhysicalPosition(Math.max(0, Math.round(x)), Math.max(0, Math.round(y))))
  }

  const notifyHangup = (): Promise<void> => {
    if (!fromId.value) return Promise.resolve()
    if (sceneType.value === 'group') {
      const userIds = toUserIds.value.filter(Boolean)
      if (!userIds.length) return Promise.resolve()
      return avCallApi
        .hangupGroup({ groupId: fromId.value, userIds })
        .then(() => undefined)
        .catch(() => undefined)
    }
    return avCallApi
      .hangupUser({ userId: fromId.value })
      .then(() => undefined)
      .catch(() => undefined)
  }

  const sendRejectedRecordIfUser = () => {
    // 群聊拒绝只走 hangupGroup，不发 rejected 通话记录
    if (sceneType.value !== 'user') return Promise.resolve()
    const chatSessionId = resolveChatSessionIdByPeer(fromId.value, sceneType.value)
    return sendCallRecordMsg({
      chatSessionId,
      callType: callType.value,
      callStatus: 'rejected',
      duration: 0
    })
  }

  const onClose = () => {
    if (acting) return
    acting = true
    sendRejectedRecordIfUser()
      .then(() => notifyHangup())
      .finally(() => {
        closeCurrentWindow()
      })
  }

  const onReject = () => {
    onClose()
  }

  const onAccept = () => {
    if (acting || !sessionId.value) return
    acting = true
    isCallWindowOpen()
      .then((busy) => {
        if (busy) {
          acting = false
          window.$message?.warning(t('callInvite.inCallBusy'))
          return
        }
        const chatSessionId = resolveChatSessionIdByPeer(fromId.value, sceneType.value)
        return createCallWindow({
          mode: sceneType.value === 'group' ? 'video' : callType.value,
          callType: callType.value,
          sessionId: sessionId.value,
          sceneType: sceneType.value,
          peerId: fromId.value,
          displayName: displayName.value || fromId.value,
          chatSessionId,
          inviteUserIds: sceneType.value === 'group' ? toUserIds.value : undefined
        }).then(() => closeCurrentWindow())
      })
      .catch(() => {
        acting = false
        window.$message?.error(t('audioVideoCall.connectFailed'))
      })
  }

  onMounted(async () => {
    applyFromRoute()
    if (appSettings.notifications.callSound) {
      startLoopSound('call')
    }
    unlistenUpdate = await listen<CallInviteWindowPayload>(CALL_INVITE_UPDATE_EVENT, (event) => {
      applyPayload(event.payload)
    })
    unlistenHangup = await listen<{ sessionId?: string }>(CALL_INVITE_HANGUP_EVENT, (event) => {
      const targetSessionId = event.payload?.sessionId
      if (!targetSessionId || targetSessionId === sessionId.value) {
        closeCurrentWindow()
      }
    })
    placeBottomRight()
      .catch(() => undefined)
      .finally(() => {
        ShowCurrentWindow()
      })
  })

  onBeforeUnmount(() => {
    stopLoopSound('call')
    unlistenUpdate?.()
    unlistenHangup?.()
  })
</script>

<style scoped lang="scss">
  .call-invite {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 100vw;
    height: 100vh;
    padding: 14px 16px 16px;
    overflow: hidden;
    background: var(--bg-primary-color);
    color: var(--text-color);
    user-select: none;

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 12px;
    }

    &__title {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      color: var(--primary-color);
      font-size: 13px;
      font-weight: 600;
      line-height: 1.2;
    }

    &__title-icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      color: var(--primary-color);
    }

    &__body {
      display: flex;
      align-items: center;
      gap: 14px;
      min-height: 56px;
      margin-bottom: 12px;
    }

    &__avatar-wrap {
      position: relative;
      flex-shrink: 0;
      width: 56px;
      height: 56px;
    }

    &__avatar-badge {
      position: absolute;
      right: -2px;
      bottom: -2px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--primary-color);
      border: 2px solid var(--bg-primary-color);
      color: var(--text-on-primary-color);

      svg {
        width: 11px;
        height: 11px;
      }
    }

    &__info {
      min-width: 0;
      flex: 1;
    }

    &__name {
      display: block;
      overflow: hidden;
      color: var(--text-color);
      font-size: 18px;
      font-weight: 700;
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__desc {
      margin: 4px 0 0;
      color: var(--text-muted-color);
      font-size: 12px;
      line-height: 1.45;
      word-break: break-word;
    }

    &__actions {
      display: flex;
      gap: 12px;
      margin-top: auto;
    }

    &__btn {
      display: inline-flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 34px;
      border: none;
      border-radius: 999px;
      color: var(--text-on-primary-color);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition:
        filter 0.15s ease,
        opacity 0.15s ease;

      svg {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
      }

      &:hover {
        filter: brightness(1.05);
      }

      &:active {
        opacity: 0.92;
      }

      &--reject {
        background: var(--red);
      }

      &--accept {
        background: var(--primary-color);
      }
    }
  }
</style>
