<template>
  <button type="button" class="message-voice" :disabled="uploading" @click="onPlay">
    <svg
      class="message-voice__icon"
      :class="{
        'message-voice__icon--self': isSelf,
        'message-voice__icon--playing': isPlaying
      }"
      viewBox="0 0 24 24"
      aria-hidden="true">
      <rect class="message-voice__bar message-voice__bar--1" x="4" y="9" width="2" height="8" rx="1" />
      <rect class="message-voice__bar message-voice__bar--2" x="8" y="6" width="2" height="14" rx="1" />
      <rect class="message-voice__bar message-voice__bar--3" x="12" y="3" width="2" height="20" rx="1" />
      <rect class="message-voice__bar message-voice__bar--4" x="16" y="6" width="2" height="14" rx="1" />
      <rect class="message-voice__bar message-voice__bar--5" x="20" y="9" width="2" height="8" rx="1" />
    </svg>
    <span class="message-voice__duration">{{ content.voiceDuration }}"</span>
  </button>
</template>

<script setup lang="ts">
  import type { VoiceContent } from '@/types/api/message'

  const props = defineProps<{
    content: VoiceContent
    isSelf?: boolean
    uploading?: boolean
    uploadProgress?: number
  }>()

  const isPlaying = ref(false)
  const audioRef = ref<HTMLAudioElement | null>(null)

  const resetPlaying = () => {
    isPlaying.value = false
  }

  const onPlay = () => {
    if (props.uploading) return

    if (isPlaying.value) {
      audioRef.value?.pause()
      resetPlaying()
      return
    }

    if (!props.content.voiceUrl) {
      return
    }

    if (!audioRef.value) {
      audioRef.value = new Audio(props.content.voiceUrl)
      audioRef.value.addEventListener('ended', resetPlaying)
      audioRef.value.addEventListener('pause', resetPlaying)
    }

    audioRef.value.play().then(() => {
      isPlaying.value = true
    })
  }

  onBeforeUnmount(() => {
    audioRef.value?.pause()
    resetPlaying()
  })
</script>

<style scoped lang="scss">
  .message-voice {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 72px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    color: inherit;
    font: inherit;

    &__icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: var(--text-primary-color);
      transform: scaleX(1);

      &--self {
        transform: scaleX(-1);
        color: #fff;
      }
    }

    &__bar {
      fill: currentColor;
      transform-box: fill-box;
      transform-origin: center center;
    }

    &__icon--playing &__bar {
      animation: message-voice-bar 0.9s ease-in-out infinite;

      &--1 {
        animation-delay: 0s;
      }

      &--2 {
        animation-delay: 0.12s;
      }

      &--3 {
        animation-delay: 0.24s;
      }

      &--4 {
        animation-delay: 0.12s;
      }

      &--5 {
        animation-delay: 0s;
      }
    }

    &__duration {
      line-height: 1;
    }
  }

  @keyframes message-voice-bar {
    0%,
    100% {
      transform: scaleY(0.35);
    }

    50% {
      transform: scaleY(1);
    }
  }
</style>
