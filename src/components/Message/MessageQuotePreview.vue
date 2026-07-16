<template>
  <div v-if="visible" class="message-quote-preview">
    <div class="message-quote-preview__line" />
    <div class="message-quote-preview__body">
      <template v-if="resolvedMessage">
        <span class="message-quote-preview__name">{{ quoteName }}</span>
        <span class="message-quote-preview__sep">:</span>
        <component :is="previewContent" />
      </template>
      <span v-else class="message-quote-preview__preview truncate">{{ missingText }}</span>
    </div>
  </div>
</template>

<script setup lang="tsx">
  import { useI18n } from 'vue-i18n'
  import type { Message } from '@/types/api/message'
  import { SceneType } from '@/constants/common'
  import { useMessageDbStore } from '@/stores/message/messageDb'
  import { useNameStore } from '@/stores/user/name'
  import { resolveLocalMediaDisplayUrl, toLocalFileDisplayUrl } from '@/utils/blobFilePath'

  const props = withDefaults(
    defineProps<{
      message?: Message | null
      /** 传入引用消息 id 时从本地库查询（与 message 二选一，message 优先） */
      quoteMsgId?: string
      /** 消息查不到时的占位文案；为空则不渲染缺省态 */
      missingText?: string
    }>(),
    {
      message: null,
      quoteMsgId: '',
      missingText: ''
    }
  )

  const { t } = useI18n()
  const nameStore = useNameStore()
  const messageDbStore = useMessageDbStore()
  const quoteName = ref('...')
  const resolvedMessage = ref<Message | null>(null)
  const lookupDone = ref(false)

  const visible = computed(() => {
    if (props.message) return true
    if (props.quoteMsgId) return lookupDone.value && (!!resolvedMessage.value || !!props.missingText)
    return !!props.missingText
  })

  const IMAGE_THUMB_PATTERN = /\.(jpe?g|png|gif|webp|bmp|avif)(\?|#|$)/i

  const isImageThumbUrl = (thumbUrl: string, mediaUrl = '') => {
    if (!thumbUrl) return false
    if (mediaUrl && thumbUrl !== mediaUrl) return true
    return /^data:image\//i.test(thumbUrl) || IMAGE_THUMB_PATTERN.test(thumbUrl)
  }

  const renderMedia = (src: string, options?: { play?: boolean; asVideo?: boolean }) => (
    <div class="message-quote-preview__media-wrap">
      {options?.asVideo ? (
        <video class="message-quote-preview__media" src={src} preload="metadata" muted playsinline />
      ) : (
        <img class="message-quote-preview__media" src={src} alt="" />
      )}
      {options?.play ? <div class="message-quote-preview__media-play" /> : null}
    </div>
  )

  const renderPreview = (message: Message) => {
    switch (message.msgType) {
      case 'text':
        return (
          <span class="message-quote-preview__preview truncate">
            {message.content.text.replace(/\s+/g, ' ').trim()}
          </span>
        )
      case 'image': {
        const localPath = message.localExt?.localPath
        const url = localPath
          ? toLocalFileDisplayUrl(localPath)
          : resolveLocalMediaDisplayUrl(message.content.imgThumbUrl || message.content.imgUrl)
        if (url) return renderMedia(url)
        return <span class="message-quote-preview__preview truncate">[{t('message.msgType.image')}]</span>
      }
      case 'video': {
        const { videoThumbUrl, videoUrl } = message.content
        if (isImageThumbUrl(videoThumbUrl, videoUrl)) {
          const src = resolveLocalMediaDisplayUrl(videoThumbUrl)
          if (src) return renderMedia(src, { play: true })
        }
        const localPath = message.localExt?.localPath
        const videoSrc = localPath
          ? toLocalFileDisplayUrl(localPath)
          : resolveLocalMediaDisplayUrl(videoUrl || videoThumbUrl)
        if (videoSrc) return renderMedia(videoSrc, { play: true, asVideo: true })
        return <span class="message-quote-preview__preview truncate">[{t('message.msgType.video')}]</span>
      }
      case 'file':
        return (
          <span class="message-quote-preview__preview truncate">
            {message.content.fileName || `[${t('message.msgType.file')}]`}
          </span>
        )
      case 'voice':
        return <span class="message-quote-preview__preview truncate">[{t('message.msgType.voice')}]</span>
      case 'sticker':
        return <span class="message-quote-preview__preview truncate">[{t('message.msgType.sticker')}]</span>
      case 'ecard':
        return (
          <span class="message-quote-preview__preview truncate">
            {`[${t('message.msgType.ecard')}] ${message.content.userName || ''}`.trim()}
          </span>
        )
      default:
        return <span class="message-quote-preview__preview truncate">[{t('message.msgType.unknown')}]</span>
    }
  }

  const previewContent = computed(() => {
    const message = resolvedMessage.value
    if (!message) return () => <span />
    return () => renderPreview(message)
  })

  watch(
    () => [props.message, props.quoteMsgId] as const,
    ([message, quoteMsgId]) => {
      if (message) {
        resolvedMessage.value = message
        lookupDone.value = true
        return
      }
      resolvedMessage.value = null
      if (!quoteMsgId) {
        lookupDone.value = true
        return
      }
      lookupDone.value = false
      messageDbStore.getMessageById(quoteMsgId).then((msg) => {
        if (props.message || props.quoteMsgId !== quoteMsgId) return
        resolvedMessage.value = msg
        lookupDone.value = true
      })
    },
    { immediate: true }
  )

  watch(
    resolvedMessage,
    (message) => {
      if (!message) {
        quoteName.value = '...'
        return
      }
      const type = message.fromType === 'robot' ? 'robot' : 'user'
      const groupId = message.sceneType === SceneType.Group && type === 'user' ? message.toId : ''
      const cached = nameStore.getCachedName(type, message.fromId, groupId)
      quoteName.value = cached || '...'
      if (cached) return
      nameStore.resolveName(type, message.fromId, groupId).then((name) => {
        if (resolvedMessage.value?.id === message.id && name) {
          quoteName.value = name
        }
      })
    },
    { immediate: true }
  )
</script>

<style lang="scss">
  .message-quote-preview {
    display: flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
    max-width: 100%;
    min-width: 0;
    padding: 5px;
    box-sizing: border-box;
    user-select: none;
    cursor: default;
    background-color: var(--bg-tertiary-color);
    border-radius: 5px;

    &__line {
      flex-shrink: 0;
      width: 3px;
      align-self: stretch;
      min-height: 16px;
      border-radius: 1px;
      background: var(--text-secondary-color);
      opacity: 0.55;
    }

    &__body {
      min-width: 0;
      display: flex;
      align-items: center;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-muted-color);
    }

    &__name {
      flex-shrink: 0;
      font-weight: 500;
    }

    &__sep {
      flex-shrink: 0;
      margin: 0 2px;
    }

    &__preview {
      min-width: 0;
    }

    &__media-wrap {
      position: relative;
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      margin-left: 2px;
      border-radius: 4px;
      overflow: hidden;
      background: var(--bg-secondary-color);
    }

    &__media {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: var(--bg-secondary-color);
    }

    &__media-play {
      position: absolute;
      inset: 0;
      margin: auto;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--bg-primary-color) 90%, transparent);
      pointer-events: none;

      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 55%;
        transform: translate(-50%, -50%);
        border-left: 6px solid var(--text-color);
        border-top: 4px solid transparent;
        border-bottom: 4px solid transparent;
      }
    }
  }
</style>
