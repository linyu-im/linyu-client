<template>
  <n-popover
    v-if="profileEnabled && id"
    ref="popoverRef"
    v-model:show="profileVisible"
    trigger="click"
    placement="right-start"
    display-directive="show"
    :show-arrow="false"
    :animated="false"
    :duration="0"
    :flip="true"
    scrollable
    :content-style="profileContentStyle"
    raw
    :z-index="3000"
    :on-clickoutside="onPopoverClickOutside"
    @update:show="onProfileShowChange">
    <template #trigger>
      <n-avatar
        v-bind="$attrs"
        class="user-select-none avatar"
        :class="avatarStateClass"
        :src="displaySrc"
        :img-props="imgProps"
        :round="round"
        :size="size"
        :fallback-src="defaultAvatar" />
    </template>
    <ProfileCard
      :id="id"
      :type="type"
      @position-change="syncProfilePosition"
      @update:edit-profile-show="onEditProfileShow"
      @update:add-friend-show="onAddFriendShow" />
  </n-popover>
  <n-avatar
    v-else
    v-bind="$attrs"
    class="user-select-none avatar"
    :class="avatarStateClass"
    :src="displaySrc"
    :img-props="imgProps"
    :round="round"
    :size="size"
    :fallback-src="defaultAvatar" />
</template>

<script setup lang="ts">
  import { useDismissOnScroll } from '@/composables/useDismissOnScroll'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import { useAvatarStore } from '@/stores/user/avatar'
  import { useChatStore } from '@/stores/chat/chat'
  import type { FromType } from '@/types/common'
  import type { CSSProperties } from 'vue'

  defineOptions({ inheritAttrs: false })

  const DEFAULT_USER_AVATAR = '/avatar.png'
  const DEFAULT_GROUP_AVATAR = '/group-avatar.png'

  interface Props {
    id: string
    type?: FromType
    size?: number | 'small' | 'medium' | 'large'
    round?: boolean
    /** 是否启用点击头像查看资料 */
    profileEnabled?: boolean
    /** 强制从远程刷新头像（用于资料卡等需要最新头像的场景） */
    refresh?: boolean
    /** 禁用淡入动画（列表切换等场景避免闪烁） */
    instant?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    type: 'user',
    size: 'medium',
    round: false,
    profileEnabled: false,
    refresh: false,
    instant: false
  })

  const avatarStore = useAvatarStore()
  const chatStore = useChatStore()

  const defaultAvatar = computed(() => (props.type === 'group' ? DEFAULT_GROUP_AVATAR : DEFAULT_USER_AVATAR))

  const getInitialAvatarSrc = () => {
    const fallback = props.type === 'group' ? DEFAULT_GROUP_AVATAR : DEFAULT_USER_AVATAR
    if (!props.id) return fallback

    if (!props.refresh) {
      const cached = avatarStore.getCachedSrc(props.type, props.id)
      if (cached) return cached
    }

    return fallback
  }

  interface PopoverInst {
    syncPosition: () => void
  }

  const profileContentStyle: CSSProperties = {
    maxHeight: 'calc(100vh - 16px)',
    padding: 0,
    background: 'var(--bg-primary-color)',
    borderRadius: '10px',
    overflow: 'hidden'
  }

  const popoverRef = ref<PopoverInst | null>(null)
  const src = ref(getInitialAvatarSrc())
  const profileVisible = ref(false)
  const editProfileShow = ref(false)
  const addFriendShow = ref(false)
  const childModalBlocking = computed(() => editProfileShow.value || addFriendShow.value)

  const displaySrc = computed(() => src.value || defaultAvatar.value)

  /** 同步解码，避免切换会话时新建的 <img> 先空白再显示已缓存头像导致闪烁 */
  const imgProps = {
    decoding: 'sync' as const,
    loading: 'eager' as const,
    onError: () => {
      if (src.value !== defaultAvatar.value) {
        src.value = defaultAvatar.value
      }
    }
  }

  const syncProfilePosition = () => {
    nextTick(() => {
      popoverRef.value?.syncPosition()
    })
  }

  const onResizeSync = () => {
    syncProfilePosition()
  }

  const avatarStateClass = computed(() => ({
    'avatar--instant': props.instant,
    'avatar--clickable': props.profileEnabled && !!props.id,
    'avatar--radius': !props.round
  }))

  let loadSeq = 0

  const isStale = (seq: number, id: string, type: string) => seq !== loadSeq || props.id !== id || props.type !== type

  /** 给 URL 追加时间戳参数，强制浏览器重新加载图片 */
  const bustCache = (url: string) => {
    if (!url) return url
    return url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now()
  }

  const applyAvatarSrc = (url: string) => {
    src.value = url || defaultAvatar.value
  }

  const preloadThenApply = (url: string, seq: number, id: string, type: FromType) => {
    const nextSrc = url || defaultAvatar.value
    if (nextSrc === src.value) return

    if (nextSrc === defaultAvatar.value) {
      applyAvatarSrc(nextSrc)
      return
    }

    const img = new Image()
    img.onload = () => {
      if (isStale(seq, id, type)) return
      applyAvatarSrc(nextSrc)
    }
    img.onerror = () => {
      if (isStale(seq, id, type)) return
      applyAvatarSrc(defaultAvatar.value)
    }
    img.src = nextSrc
  }

  const loadAvatar = async () => {
    const id = props.id
    const type = props.type
    const seq = ++loadSeq

    if (!id) {
      applyAvatarSrc(defaultAvatar.value)
      return
    }

    if (props.refresh) {
      const cached = avatarStore.getCachedSrc(type, id)
      applyAvatarSrc(cached || defaultAvatar.value)

      const quickUrl = await avatarStore.resolveSrc(type, id)
      if (isStale(seq, id, type)) return
      preloadThenApply(quickUrl, seq, id, type)

      avatarStore.refreshSrc(type, id).then((url) => {
        if (!isStale(seq, id, type) && url) {
          preloadThenApply(bustCache(url), seq, id, type)
        }
      })
      return
    }

    const cached = avatarStore.getCachedSrc(type, id)
    if (cached) {
      applyAvatarSrc(cached)
      return
    }

    applyAvatarSrc(defaultAvatar.value)

    const url = await avatarStore.resolveSrc(type, id)
    if (isStale(seq, id, type)) return

    preloadThenApply(url, seq, id, type)
  }

  const refreshAvatarOnOpen = () => {
    if (!props.id) return

    const id = props.id
    const type = props.type
    const seq = loadSeq

    avatarStore.refreshSrc(type, id).then((url) => {
      if (!isStale(seq, id, type) && url) {
        preloadThenApply(bustCache(url), seq, id, type)
      }
    })
  }

  const onEditProfileShow = (show: boolean) => {
    editProfileShow.value = show
  }

  const onAddFriendShow = (show: boolean) => {
    addFriendShow.value = show
  }

  const onPopoverClickOutside = () => {
    if (childModalBlocking.value) return
    closeProfile()
  }

  const onProfileShowChange = (show: boolean) => {
    if (show) {
      refreshAvatarOnOpen()
      syncProfilePosition()
      return
    }

    editProfileShow.value = false
    addFriendShow.value = false
    window.removeEventListener('resize', onResizeSync)
  }

  watch(profileVisible, (show) => {
    if (show) {
      window.addEventListener('resize', onResizeSync, { passive: true })
    }
  })

  const closeProfile = () => {
    if (childModalBlocking.value) return
    profileVisible.value = false
  }

  useEscapeOverlay(closeProfile, profileVisible)
  useDismissOnScroll(closeProfile, profileVisible)

  watch(
    () => [props.id, props.type] as const,
    () => {
      void loadAvatar()
    },
    { immediate: true }
  )

  // 当其他 Avatar 实例刷新了同一头像时，同步更新当前实例
  watch(
    () => avatarStore.getLastRefresh(props.type, props.id),
    (newVal, oldVal) => {
      if (newVal && newVal !== oldVal) {
        const url = avatarStore.getCachedSrc(props.type, props.id)
        if (url) {
          preloadThenApply(bustCache(url), loadSeq, props.id, props.type)
        }
      }
    }
  )

  watch(
    () => chatStore.reopenTick,
    () => {
      closeProfile()
    }
  )

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResizeSync)
  })
</script>

<style scoped lang="scss">
  .avatar {
    user-select: none;

    &--instant {
      transition: none;
    }

    &--clickable {
      cursor: pointer;
    }

    &--radius {
      border-radius: 6px;
    }
  }
</style>
