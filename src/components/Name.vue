<template>
  <span class="name" :class="{ 'name--visible': visible }">
    <span v-if="displayName" class="name__text truncate">{{ displayName }}</span>
    <span v-if="tagText" class="name__tag">{{ tagText }}</span>
  </span>
</template>

<script setup lang="ts">
  import { useNameStore } from '@/stores/name'
  import type { FromType } from '@/types/common'

  interface Props {
    id: string
    type?: FromType
    tag?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    type: 'user'
  })

  const nameStore = useNameStore()
  const displayName = ref('')
  const visible = ref(false)

  const tagText = computed(() => props.tag?.trim() || '')

  let loadSeq = 0

  const isStale = (seq: number, id: string, type: FromType) => seq !== loadSeq || props.id !== id || props.type !== type

  const loadName = () => {
    const id = props.id
    const type = props.type

    if (!id || (type !== 'user' && type !== 'robot')) {
      displayName.value = ''
      visible.value = true
      return
    }

    const cached = nameStore.getCachedName(type, id)
    if (cached) {
      displayName.value = cached
      visible.value = true
      return
    }

    const seq = ++loadSeq
    visible.value = false

    nameStore.resolveName(type, id).then((name) => {
      if (isStale(seq, id, type)) return
      displayName.value = name
      visible.value = true
    })
  }

  watch(
    () => [props.id, props.type] as const,
    () => {
      loadName()
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  .name {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    max-width: 100%;
    opacity: 0;
    transition: opacity 0.12s ease;

    &--visible {
      opacity: 1;
    }

    &__text {
      min-width: 0;
    }

    &__tag {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      padding: 1px 7px;
      border-radius: 999px;
      font-size: 11px;
      line-height: 1.35;
      user-select: none;
      color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--primary-color) 36%, transparent);
    }
  }
</style>
