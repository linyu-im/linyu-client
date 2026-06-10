<template>
  <button
    type="button"
    class="sticker-item"
    :class="{ 'sticker-item--image': sticker.type === 'image' }"
    :title="sticker.name"
    @click="emit('select', sticker)">
    <img v-if="sticker.type === 'image'" class="sticker-item__img" :src="sticker.iconUrl" :alt="sticker.name" />
    <span v-else class="sticker-item__emoji">{{ sticker.iconValue }}</span>
  </button>
</template>

<script setup lang="ts">
  import type { Sticker } from '@/types/api/sticker'

  interface Props {
    sticker: Sticker
  }

  defineProps<Props>()

  const emit = defineEmits<(e: 'select', sticker: Sticker) => void>()
</script>

<style scoped lang="scss">
  .sticker-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-width: 0;
    aspect-ratio: 1;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    padding: 0;
    transition: background-color 0.15s ease;

    &:hover {
      background: var(--icon-hover-color);
    }

    &__emoji {
      font-size: 22px;
      line-height: 1;
    }

    &--image &__img {
      width: 44px;
      height: 44px;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      pointer-events: none;
    }
  }
</style>
