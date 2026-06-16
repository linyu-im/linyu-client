<template>
  <div
    class="message-item"
    :class="{
      'message-item--plain': isPlain,
      'message-item--text': message.msgType === 'text',
      'message-item--file': message.msgType === 'file',
      'message-item--ecard': message.msgType === 'ecard'
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

  const props = defineProps<{
    message: Message
    isSelf?: boolean
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
    if (msg.msgType === 'image' || msg.msgType === 'video' || msg.msgType === 'file') {
      return { messageId: msg.id, content: msg.content }
    }
    return { content: msg.content }
  })

  const menuOptions = computed(() => [
    { label: () => t('message.bubbleMenu.copy'), key: 'copy' },
    { label: () => t('message.bubbleMenu.quote'), key: 'quote' },
    { label: () => t('message.bubbleMenu.forward'), key: 'forward' },
    { label: () => t('message.bubbleMenu.favorite'), key: 'favorite' },
    { label: () => t('message.bubbleMenu.multiSelect'), key: 'multiSelect' },
    { type: 'divider', key: 'd1' },
    { label: () => t('message.bubbleMenu.delete'), key: 'delete' }
  ])

  const onContextMenu = (e: MouseEvent) => {
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
        window.$message?.info(t('message.bubbleMenu.forward'))
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

    &__unknown {
      color: var(--text-secondary-color);
    }
  }
</style>
