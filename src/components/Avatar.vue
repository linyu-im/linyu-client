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
    @update:show="onProfileShowChange">
    <template #trigger>
      <n-avatar
        v-bind="$attrs"
        class="user-select-none avatar"
        :class="avatarStateClass"
        :src="src || undefined"
        :round="round"
        :size="size"
        fallback-src="/avatar.png" />
    </template>
    <ProfileCard :id="id" :type="type" @position-change="syncProfilePosition" />
  </n-popover>
  <n-avatar
    v-else
    v-bind="$attrs"
    class="user-select-none avatar"
    :class="avatarStateClass"
    :src="src || undefined"
    :round="round"
    :size="size"
    fallback-src="/avatar.png" />
</template>

<script setup lang="ts">
  import { useDismissOnScroll } from '@/composables/useDismissOnScroll'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import { useAvatarStore } from '@/stores/avatar'
  import type { FromType } from '@/types/common'
  import type { CSSProperties } from 'vue'

  defineOptions({ inheritAttrs: false })

  interface Props {
    id: string
    type?: FromType
    size?: number | 'small' | 'medium' | 'large'
    round?: boolean
    /** 是否启用点击头像查看资料 */
    profileEnabled?: boolean
    /** 强制从远程刷新头像（用于资料卡等需要最新头像的场景） */
    refresh?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    type: 'user',
    size: 'medium',
    round: false,
    profileEnabled: false,
    refresh: false
  })

  const avatarStore = useAvatarStore()

  interface PopoverInst {
    syncPosition: () => void
  }

  const profileContentStyle: CSSProperties = {
    maxHeight: 'calc(100vh - 16px)',
    padding: 0
  }

  const popoverRef = ref<PopoverInst | null>(null)
  const src = ref('')
  const visible = ref(false)
  const profileVisible = ref(false)

  const syncProfilePosition = () => {
    nextTick(() => {
      popoverRef.value?.syncPosition()
    })
  }

  const onResizeSync = () => {
    syncProfilePosition()
  }

  const avatarStateClass = computed(() => ({
    'avatar--visible': visible.value,
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

  const loadAvatar = async () => {
    const id = props.id
    const type = props.type

    if (!id) {
      src.value = ''
      visible.value = true
      return
    }

    if (props.refresh) {
      // 刷新模式：先展示缓存/本地版本（快速），再从远程拉取最新替换
      const seq = ++loadSeq
      const quickUrl = await avatarStore.resolveSrc(type, id)
      if (isStale(seq, id, type)) return
      if (quickUrl) {
        src.value = quickUrl
        visible.value = true
      }
      // 后台从远程刷新，加载完成后替换
      avatarStore.refreshSrc(type, id).then((url) => {
        if (!isStale(seq, id, type) && url) {
          src.value = bustCache(url)
          visible.value = true
        }
      })
      return
    }

    // 非刷新模式：优先读内存缓存
    const cached = avatarStore.getCachedSrc(type, id)
    if (cached) {
      src.value = cached
      visible.value = true
      return
    }

    const seq = ++loadSeq
    visible.value = false

    const url = await avatarStore.resolveSrc(type, id)
    if (isStale(seq, id, type)) return

    src.value = url
    visible.value = true
  }

  const refreshAvatarOnOpen = () => {
    if (!props.id) return

    avatarStore.refreshSrc(props.type, props.id).then((url) => {
      if (url) {
        src.value = bustCache(url)
        visible.value = true
      }
    })
  }

  const onProfileShowChange = (show: boolean) => {
    if (show) {
      refreshAvatarOnOpen()
      syncProfilePosition()
      return
    }

    window.removeEventListener('resize', onResizeSync)
  }

  watch(profileVisible, (show) => {
    if (show) {
      window.addEventListener('resize', onResizeSync, { passive: true })
    }
  })

  const closeProfile = () => {
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
          src.value = bustCache(url)
          visible.value = true
        }
      }
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

    &--visible {
      opacity: 1;
    }

    &--clickable {
      cursor: pointer;
    }

    &--radius {
      border-radius: 6px;
    }
  }
</style>
