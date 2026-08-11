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
      @update:edit-profile-show="onEditProfileShow" />
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

  const getInitialAvatarState = () => {
    const fallback = props.type === 'group' ? DEFAULT_GROUP_AVATAR : DEFAULT_USER_AVATAR
    if (!props.id) {
      return { src: fallback, visible: true }
    }

    if (!props.refresh) {
      const cached = avatarStore.getCachedSrc(props.type, props.id)
      if (cached) {
        return { src: cached, visible: true }
      }
    }

    return { src: fallback, visible: props.instant }
  }

  const initialAvatarState = getInitialAvatarState()

  interface PopoverInst {
    syncPosition: () => void
  }

  const profileContentStyle: CSSProperties = {
    maxHeight: 'calc(100vh - 16px)',
    padding: 0
  }

  const popoverRef = ref<PopoverInst | null>(null)
  const src = ref(initialAvatarState.src)
  const visible = ref(initialAvatarState.visible)
  const profileVisible = ref(false)
  const editProfileShow = ref(false)

  const displaySrc = computed(() => src.value || defaultAvatar.value)

  /** 同步解码，避免切换会话时新建的 <img> 先空白再显示已缓存头像导致闪烁 */
  const imgProps = {
    decoding: 'sync' as const,
    loading: 'eager' as const,
    onError: () => {
      if (src.value !== defaultAvatar.value) {
        src.value = defaultAvatar.value
      }
      visible.value = true
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
    'avatar--visible': visible.value || props.instant,
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
    visible.value = true
  }

  const loadAvatar = async () => {
    const id = props.id
    const type = props.type

    if (!id) {
      applyAvatarSrc(defaultAvatar.value)
      return
    }

    if (props.refresh) {
      // 刷新模式：先展示缓存/本地版本（快速），再从远程拉取最新替换
      const seq = ++loadSeq
      const quickUrl = await avatarStore.resolveSrc(type, id)
      if (isStale(seq, id, type)) return
      if (quickUrl) {
        applyAvatarSrc(quickUrl)
      } else {
        applyAvatarSrc(defaultAvatar.value)
      }
      // 后台从远程刷新，加载完成后替换
      avatarStore.refreshSrc(type, id).then((url) => {
        if (!isStale(seq, id, type) && url) {
          applyAvatarSrc(bustCache(url))
        }
      })
      return
    }

    // 非刷新模式：优先读内存缓存
    const cached = avatarStore.getCachedSrc(type, id)
    if (cached) {
      applyAvatarSrc(cached)
      return
    }

    const seq = ++loadSeq
    if (!props.instant) {
      visible.value = false
    }

    const url = await avatarStore.resolveSrc(type, id)
    if (isStale(seq, id, type)) return

    applyAvatarSrc(url)
  }

  const refreshAvatarOnOpen = () => {
    if (!props.id) return

    avatarStore.refreshSrc(props.type, props.id).then((url) => {
      if (url) {
        applyAvatarSrc(bustCache(url))
      }
    })
  }

  const onEditProfileShow = (show: boolean) => {
    editProfileShow.value = show
  }

  const onPopoverClickOutside = () => {
    if (editProfileShow.value) return
    closeProfile()
  }

  const onProfileShowChange = (show: boolean) => {
    if (show) {
      refreshAvatarOnOpen()
      syncProfilePosition()
      return
    }

    editProfileShow.value = false
    window.removeEventListener('resize', onResizeSync)
  }

  watch(profileVisible, (show) => {
    if (show) {
      window.addEventListener('resize', onResizeSync, { passive: true })
    }
  })

  const closeProfile = () => {
    if (editProfileShow.value) return
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
          applyAvatarSrc(bustCache(url))
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
    opacity: 0;
    transition: opacity 0.12s ease;
    user-select: none;

    &--visible {
      opacity: 1;
    }

    &--instant {
      opacity: 1;
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
