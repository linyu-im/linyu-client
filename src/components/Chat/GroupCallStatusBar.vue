<template>
  <div v-if="users.length > 0" class="group-call-status">
    <div class="group-call-status__main">
      <span class="group-call-status__dot" aria-hidden="true" />
      <span class="group-call-status__title">
        {{ t('audioVideoCall.groupCallStatus', { count: users.length }) }}
      </span>
      <button
        type="button"
        class="group-call-status__toggle"
        :aria-expanded="expanded"
        :aria-label="expanded ? t('audioVideoCall.groupCallCollapse') : t('audioVideoCall.groupCallExpand')"
        @click="expanded = !expanded">
        <svg
          class="group-call-status__toggle-icon"
          :class="{ 'group-call-status__toggle-icon--expanded': expanded }"
          aria-hidden="true">
          <use href="#left-arrow" />
        </svg>
      </button>
    </div>

    <div v-if="expanded" class="group-call-status__members">
      <div class="group-call-status__avatars">
        <div
          v-for="user in visibleUsers"
          :key="user.userId"
          class="group-call-status__member"
          :title="user.username || user.userId">
          <Avatar :id="user.userId" :size="22" :round="true" :profile-enabled="false" />
        </div>
        <div
          v-if="overflowCount > 0"
          class="group-call-status__more"
          :title="t('audioVideoCall.groupCallMore', { count: overflowCount })">
          +{{ overflowCount }}
        </div>
      </div>

      <button type="button" class="group-call-status__join" :disabled="joining" @click="emit('join')">
        {{ t('audioVideoCall.groupCallJoin') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { UnlistenFn } from '@tauri-apps/api/event'
  import { listen } from '@tauri-apps/api/event'
  import { livekitApi } from '@/api'
  import Avatar from '@/components/Avatar.vue'
  import { CALL_ROOM_CHANGE_EVENT } from '@/constants/event'
  import type { CallRoomChangePayload } from '@/services/livekitCall'
  import { useAvCallStore } from '@/stores/app/avCall'
  import type { LivekitRoomUser } from '@/types/api/livekit'
  import { storeToRefs } from 'pinia'
  import { useI18n } from 'vue-i18n'

  /** change 后等待后端房间状态落稳再拉列表 */
  const ROOM_CHANGE_REFRESH_DELAY_MS = 2000
  const MAX_VISIBLE_AVATARS = 8

  const props = defineProps<{
    sessionId: string
    joining?: boolean
  }>()

  const emit = defineEmits<{
    join: []
  }>()

  const { t } = useI18n()
  const avCallStore = useAvCallStore()
  const { roomChangeSeq, roomChangeSessionId } = storeToRefs(avCallStore)

  const users = ref<LivekitRoomUser[]>([])
  const expanded = ref(false)
  let fetchSeq = 0
  let refreshTimer: ReturnType<typeof setTimeout> | undefined
  let unlistenRoomChange: UnlistenFn | undefined

  const visibleUsers = computed(() => users.value.slice(0, MAX_VISIBLE_AVATARS))
  const overflowCount = computed(() => Math.max(0, users.value.length - MAX_VISIBLE_AVATARS))

  const clearRefreshTimer = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = undefined
    }
  }

  const fetchRoomUsers = (sessionId: string) => {
    const id = sessionId.trim()
    if (!id) {
      users.value = []
      return
    }
    const seq = ++fetchSeq
    livekitApi.listRoomUsers({ sessionId: id }).then((res) => {
      if (seq !== fetchSeq) return
      if (res.code === 0 && Array.isArray(res.data)) {
        users.value = res.data
        if (users.value.length === 0) expanded.value = false
      } else {
        users.value = []
        expanded.value = false
      }
    })
  }

  /** change 触发：延迟合并刷新，避免挂断/邀请后状态未落稳 */
  const scheduleRoomChangeRefresh = (sessionId: string) => {
    const id = sessionId.trim()
    if (!id || id !== props.sessionId.trim()) return
    clearRefreshTimer()
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined
      fetchRoomUsers(id)
    }, ROOM_CHANGE_REFRESH_DELAY_MS)
  }

  watch(
    () => props.sessionId,
    (sessionId) => {
      expanded.value = false
      clearRefreshTimer()
      fetchRoomUsers(sessionId)
    },
    { immediate: true }
  )

  watch(roomChangeSeq, () => {
    scheduleRoomChangeRefresh(roomChangeSessionId.value)
  })

  onMounted(() => {
    listen<CallRoomChangePayload>(CALL_ROOM_CHANGE_EVENT, (event) => {
      scheduleRoomChangeRefresh(event.payload?.sessionId || '')
    }).then((unlisten) => {
      unlistenRoomChange = unlisten
    })
  })

  onBeforeUnmount(() => {
    clearRefreshTimer()
    unlistenRoomChange?.()
  })
</script>

<style scoped lang="scss">
  .group-call-status {
    flex-shrink: 0;
    padding: 6px 12px;
    border-bottom: 1px solid var(--divider-color);
    background: var(--bg-content-color);
    box-sizing: border-box;

    &__main {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    &__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary-color);
      flex-shrink: 0;
    }

    &__title {
      font-size: 12px;
      line-height: 1.3;
      color: var(--text-color);
      white-space: nowrap;
      user-select: none;
    }

    &__toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text-muted-color);
      cursor: pointer;
      flex-shrink: 0;

      &:hover {
        background: var(--icon-hover-color);
        color: var(--text-color);
      }
    }

    &__toggle-icon {
      width: 12px;
      height: 12px;
      // left-arrow 默认朝左；收起朝下，展开朝上
      transform: rotate(-90deg);
      transition: transform 0.15s ease;

      &--expanded {
        transform: rotate(90deg);
      }
    }

    &__members {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
      min-width: 0;
    }

    &__avatars {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      flex-wrap: nowrap;
    }

    &__member {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
    }

    &__more {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--button-soft-bg);
      color: var(--text-secondary-color);
      font-size: 10px;
      line-height: 1;
      flex-shrink: 0;
      user-select: none;
    }

    &__join {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 22px;
      padding: 0 8px;
      border: none;
      border-radius: 5px;
      background: var(--primary-color);
      color: #fff;
      font-size: 11px;
      line-height: 1;
      cursor: pointer;
      flex-shrink: 0;
      white-space: nowrap;
      margin-left: auto;

      &:hover:not(:disabled) {
        background: color-mix(in srgb, var(--primary-color) 88%, #000);
      }

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
    }
  }
</style>
