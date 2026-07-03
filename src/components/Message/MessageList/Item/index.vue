<template>
  <div
    class="message-item"
    :class="{
      'message-item--plain': isPlain,
      'message-item--text': message.msgType === 'text',
      'message-item--file': message.msgType === 'file',
      'message-item--ecard': message.msgType === 'ecard',
      'message-item--disabled': disableEvents
    }"
    @contextmenu.prevent="onContextMenu">
    <component :is="bodyComponent" v-if="bodyComponent" v-bind="bodyProps" />
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
  import Text from './Text.vue'
  import Images from './Images.vue'
  import Video from './Video.vue'
  import File from './File.vue'
  import Ecard from './Ecard.vue'
  import Voice from './Voice.vue'
  import Sticker from './Sticker.vue'

  const props = withDefaults(
    defineProps<{
      message: Message
      isSelf?: boolean
      disableEvents?: boolean
    }>(),
    { disableEvents: false }
  )

  const emit = defineEmits<{
    forward: [message: Message]
  }>()

  const { t } = useI18n()

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
    return { content: msg.content }
  })

  const menuOptions = computed(() => {
    const msgType = props.message.msgType
    const options: Array<{ label?: () => string; key: string; type?: string; props?: Record<string, unknown> }> = []

    switch (msgType) {
      case 'ecard':
        options.push({ label: () => t('message.bubbleMenu.forward'), key: 'forward' })
        break
      case 'file':
        options.push(
          { label: () => t('message.bubbleMenu.copy'), key: 'copy' },
          { label: () => t('message.bubbleMenu.forward'), key: 'forward' },
          { label: () => t('message.bubbleMenu.quote'), key: 'quote' }
        )
        break
      case 'image':
      case 'video':
        options.push(
          { label: () => t('message.bubbleMenu.copy'), key: 'copy' },
          { label: () => t('message.bubbleMenu.forward'), key: 'forward' },
          { label: () => t('message.bubbleMenu.quote'), key: 'quote' }
        )
        break
      case 'text':
        options.push(
          { label: () => t('message.bubbleMenu.copy'), key: 'copy' },
          { label: () => t('message.bubbleMenu.forward'), key: 'forward' },
          { label: () => t('message.bubbleMenu.quote'), key: 'quote' }
        )
        break
      case 'voice':
        options.push(
          { label: () => t('message.bubbleMenu.voiceToText'), key: 'voiceToText' },
          { label: () => t('message.bubbleMenu.quote'), key: 'quote' }
        )
        break
      case 'sticker':
        options.push(
          { label: () => t('message.bubbleMenu.collectSticker'), key: 'collectSticker' },
          { label: () => t('message.bubbleMenu.forward'), key: 'forward' },
          { label: () => t('message.bubbleMenu.quote'), key: 'quote' }
        )
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

  const getCopyText = () => {
    const msg = props.message
    switch (msg.msgType) {
      case 'text':
        return msg.content.text
      case 'file':
        return msg.content.fileName
      case 'ecard':
        return msg.content.userName
      default:
        return ''
    }
  }

  const onMenuSelect = (key: string) => {
    menuShow.value = false
    switch (key) {
      case 'copy': {
        const text = getCopyText()
        if (!text) {
          window.$message?.info(t('message.bubbleMenu.copyUnsupported'))
          return
        }
        navigator.clipboard.writeText(text).then(() => {
          window.$message?.success(t('message.bubbleMenu.copySuccess'))
        })
        break
      }
      case 'quote':
        window.$message?.info(t('message.bubbleMenu.quote'))
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
        window.$message?.info(t('message.bubbleMenu.delete'))
        break
    }
  }
</script>

<style scoped lang="scss">
  .message-item {
    max-width: min(72%, 520px);

    &--text {
      max-width: 100%;
      width: fit-content;
    }

    &--file,
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
