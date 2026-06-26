<template>
  <div ref="ecardRef" class="message-ecard" @click.stop="onEcardClick">
    <div class="message-ecard__main">
      <Avatar class="message-ecard__avatar" :id="content.userId" :size="36" />
      <div class="message-ecard__name">{{ content.userName }}</div>
    </div>
    <div class="message-ecard__footer">{{ t('message.ecard.recommend') }}</div>
  </div>

  <n-popover
    v-if="content.userId"
    ref="popoverRef"
    v-model:show="profileVisible"
    trigger="manual"
    :x="profileX"
    :y="profileY"
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
    @clickoutside="onPopoverClickOutside"
    @update:show="onProfileShowChange">
    <ProfileCard :id="content.userId" type="user" @position-change="syncProfilePosition" />
  </n-popover>
</template>

<script setup lang="ts">
  import { useDismissOnScroll } from '@/composables/useDismissOnScroll'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import type { ECardContent } from '@/types/api/message'
  import type { CSSProperties } from 'vue'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    content: ECardContent
  }>()

  const { t } = useI18n()

  interface PopoverInst {
    syncPosition: () => void
  }

  const profileContentStyle: CSSProperties = {
    maxHeight: 'calc(100vh - 16px)',
    padding: 0
  }

  const popoverRef = ref<PopoverInst | null>(null)
  const ecardRef = ref<HTMLElement | null>(null)
  const profileVisible = ref(false)
  const profileX = ref(0)
  const profileY = ref(0)

  const openProfileAt = (x: number, y: number) => {
    profileX.value = x
    profileY.value = y
    profileVisible.value = true
    syncProfilePosition()
  }

  const onEcardClick = (e: MouseEvent) => {
    if (!props.content.userId) return
    openProfileAt(e.clientX, e.clientY)
  }

  const onPopoverClickOutside = (e: MouseEvent) => {
    const target = e.target as Node | null
    if (target && ecardRef.value?.contains(target)) return
    closeProfile()
  }

  const syncProfilePosition = () => {
    nextTick(() => {
      popoverRef.value?.syncPosition()
    })
  }

  const onResizeSync = () => {
    syncProfilePosition()
  }

  const closeProfile = () => {
    profileVisible.value = false
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  const onProfileShowChange = (show: boolean) => {
    if (show) {
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

  useEscapeOverlay(closeProfile, profileVisible)
  useDismissOnScroll(closeProfile, profileVisible)

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResizeSync)
  })
</script>

<style scoped lang="scss">
  .message-ecard {
    box-sizing: border-box;
    width: 240px;
    background: var(--bg-primary-color);
    border-radius: 8px;
    overflow: hidden;
    color: var(--text-primary-color);
    cursor: pointer;
    user-select: none;

    &__main {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
    }

    &__avatar {
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
    }

    &__name {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text-color);
    }

    &__footer {
      padding: 8px 12px;
      border-top: 1px solid var(--divider-color);
      font-size: 12px;
      line-height: 1;
      color: var(--text-secondary-color);
    }
  }
</style>
