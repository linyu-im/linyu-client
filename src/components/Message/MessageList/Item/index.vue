<template>
  <div
    class="message-item"
    :class="{
      'message-item--plain': isPlain,
      'message-item--text': message.msgType === 'text',
      'message-item--file': message.msgType === 'file',
      'message-item--cloud-share': message.msgType === 'cloud_share',
      'message-item--ecard': message.msgType === 'ecard',
      'message-item--disabled': disableEvents
    }"
    @contextmenu.prevent="onContextMenu">
    <component :is="bodyComponent" v-if="bodyComponent" :key="mediaBodyKey" v-bind="bodyProps" />
    <span v-else class="message-item__unknown">{{ t('message.msgType.unknown') }}</span>
    <n-dropdown
      trigger="manual"
      placement="bottom-start"
      :x="menuX"
      :y="menuY"
      :options="menuOptions"
      :show="menuShow"
      @select="onMenuSelect"
      @clickoutside="onMenuClickoutside" />
  </div>
</template>

<script setup lang="ts">
  import type { Component } from 'vue'
  import { useI18n } from 'vue-i18n'
  import type { Message } from '@/types/api/message'
  import { copyMessageToClipboard } from '@/utils/message/messageClipboard'
  import Text from './Text.vue'
  import Images from './Images.vue'
  import Video from './Video.vue'
  import File from './File.vue'
  import CloudShare from './CloudShare.vue'
  import Ecard from './Ecard.vue'
  import Voice from './Voice.vue'
  import Sticker from './Sticker.vue'

  const props = withDefaults(
    defineProps<{
      message: Message
      isSelf?: boolean
      disableEvents?: boolean
      menuPreset?: 'chat' | 'record'
    }>(),
    { disableEvents: false, menuPreset: 'chat' }
  )

  const emit = defineEmits<{
    forward: [message: Message]
    quote: [message: Message]
    delete: [message: Message]
  }>()

  const { t } = useI18n()
  const dialog = useDialog()

  const menuShow = ref(false)
  const menuX = ref(0)
  const menuY = ref(0)

  const plainTypes = new Set(['image', 'video', 'sticker'])

  const isPlain = computed(() => plainTypes.has(props.message.msgType))

  const bodyComponent = computed<Component | null>(() => {
    switch (props.message.msgType) {
      case 'text':
        return Text
      case 'image':
        return Images
      case 'file':
        return File
      case 'cloud_share':
        return CloudShare
      case 'ecard':
        return Ecard
      case 'voice':
        return Voice
      case 'sticker':
        return Sticker
      case 'video':
        return Video
      default:
        return null
    }
  })

  const bodyProps = computed(() => {
    const msg = props.message
    if (msg.msgType === 'voice') {
      return { content: msg.content, isSelf: props.isSelf }
    }
    if (msg.msgType === 'image') {
      return { messageId: msg.id, content: msg.content, localExt: msg.localExt }
    }
    if (msg.msgType === 'video') {
      return { messageId: msg.id, content: msg.content, localExt: msg.localExt }
    }
    if (msg.msgType === 'file') {
      return { messageId: msg.id, content: msg.content, localExt: msg.localExt }
    }
    if (msg.msgType === 'sticker') {
      return { messageId: msg.id, content: msg.content, localExt: msg.localExt }
    }
    if (msg.msgType === 'cloud_share') {
      return { content: msg.content, disableEvents: props.disableEvents }
    }
    return { content: msg.content }
  })

  const mediaBodyKey = computed(() => {
    const msg = props.message
    if (msg.msgType === 'image' || msg.msgType === 'video' || msg.msgType === 'sticker') {
      return msg.renderKey ?? msg.id
    }
    return msg.id
  })

  const menuOptions = computed(() => {
    const msgType = props.message.msgType
    const options: Array<{ label?: () => string; key: string; type?: string; props?: Record<string, unknown> }> = []
    const quoteEnabled = props.menuPreset !== 'record'
    const pushQuote = () => {
      if (quoteEnabled) options.push({ label: () => t('message.bubbleMenu.quote'), key: 'quote' })
    }

    switch (msgType) {
      case 'ecard':
        options.push({ label: () => t('message.bubbleMenu.forward'), key: 'forward' })
        break
      case 'file':
        options.push(
          { label: () => t('message.bubbleMenu.copy'), key: 'copy' },
          { label: () => t('message.bubbleMenu.forward'), key: 'forward' }
        )
        pushQuote()
        break
      case 'cloud_share':
        pushQuote()
        break
      case 'image':
      case 'video':
        options.push(
          { label: () => t('message.bubbleMenu.copy'), key: 'copy' },
          { label: () => t('message.bubbleMenu.forward'), key: 'forward' }
        )
        pushQuote()
        break
      case 'text':
        options.push(
          { label: () => t('message.bubbleMenu.copy'), key: 'copy' },
          { label: () => t('message.bubbleMenu.forward'), key: 'forward' }
        )
        pushQuote()
        break
      case 'voice':
        options.push({ label: () => t('message.bubbleMenu.voiceToText'), key: 'voiceToText' })
        pushQuote()
        break
      case 'sticker':
        options.push(
          { label: () => t('message.bubbleMenu.collectSticker'), key: 'collectSticker' },
          { label: () => t('message.bubbleMenu.forward'), key: 'forward' }
        )
        pushQuote()
        break
    }

    options.push({ type: 'divider', key: 'd1' })
    options.push({
      label: () => t('message.bubbleMenu.delete'),
      key: 'delete',
      props: { class: 'menu-item--danger' }
    })

    return options
  })

  const onContextMenu = (e: MouseEvent) => {
    if (props.disableEvents) return
    menuX.value = e.clientX
    menuY.value = e.clientY
    nextTick(() => {
      menuShow.value = true
    })
  }

  const onMenuClickoutside = () => {
    menuShow.value = false
  }

  const onGlobalWheel = (e: WheelEvent) => {
    if (menuShow.value) {
      e.preventDefault()
      menuShow.value = false
    }
  }

  watch(menuShow, (show) => {
    if (show) {
      document.addEventListener('wheel', onGlobalWheel, { passive: false })
    } else {
      document.removeEventListener('wheel', onGlobalWheel)
    }
  })

  onBeforeUnmount(() => {
    document.removeEventListener('wheel', onGlobalWheel)
  })

  const onMenuSelect = (key: string) => {
    menuShow.value = false
    switch (key) {
      case 'copy': {
        copyMessageToClipboard(props.message).catch(() => {
          window.$message?.error(t('message.bubbleMenu.copyFailed'))
        })
        break
      }
      case 'quote':
        emit('quote', props.message)
        break
      case 'forward':
        emit('forward', props.message)
        break
      case 'favorite':
        window.$message?.info(t('message.bubbleMenu.favorite'))
        break
      case 'multiSelect':
        window.$message?.info(t('message.bubbleMenu.multiSelect'))
        break
      case 'delete':
        dialog.warning({
          title: t('message.bubbleMenu.deleteConfirmTitle'),
          content: t('message.bubbleMenu.deleteConfirmContent'),
          positiveText: t('message.bubbleMenu.deleteConfirm'),
          negativeText: t('message.bubbleMenu.deleteCancel'),
          showIcon: false,
          positiveButtonProps: { type: 'error' },
          negativeButtonProps: { ghost: false, size: 'small' },
          onPositiveClick: () => {
            emit('delete', props.message)
          }
        })
        break
    }
  }
</script>

<style scoped lang="scss">
  .message-item {
    max-width: min(72%, 520px);
    padding: 8px 10px;
    box-sizing: border-box;

    &--text {
      max-width: 100%;
      width: fit-content;
    }

    &--file,
    &--cloud-share,
    &--ecard,
    &--plain {
      padding: 0;
    }

    &--file,
    &--cloud-share,
    &--ecard {
      width: 100%;
      max-width: 100%;
    }

    &--plain {
      max-width: min(80%, 560px);
    }

    &--disabled {
      pointer-events: none;
      user-select: none;
    }

    &__unknown {
      color: var(--text-secondary-color);
    }
  }

  :global(.n-dropdown-menu) {
    min-width: 80px;
  }

  :global(.n-dropdown-menu .menu-item--danger:hover) {
    color: var(--red) !important;
  }

  :global(.message-item a:focus),
  :global(.message-item a:focus-visible),
  :global(.message-item button:focus),
  :global(.message-item button:focus-visible) {
    outline: none;
  }
</style>
