<template>
  <span class="name" :class="{ 'name--visible': visible || instant, 'name--instant': instant }">
    <span v-if="displayName" class="name__text truncate">{{ displayName }}</span>
    <span v-if="tagText" class="name__tag">{{ tagText }}</span>
  </span>
</template>

<script setup lang="ts">
  import { useNameStore } from '@/stores/user/name'
  import type { FromType } from '@/types/common'

  interface Props {
    id: string
    type?: FromType
    groupId?: string
    tag?: string
    instant?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    type: 'user',
    groupId: '',
    instant: false
  })

  const nameStore = useNameStore()

  const getInitialNameState = () => {
    const { id, type, groupId } = props

    if (!id || (type !== 'user' && type !== 'robot')) {
      return { name: '', visible: props.instant }
    }

    const cached = nameStore.getCachedName(type, id, type === 'user' ? groupId : '')
    if (cached) {
      return { name: cached, visible: true }
    }

    return { name: '', visible: props.instant }
  }

  const initialNameState = getInitialNameState()
  const displayName = ref(initialNameState.name)
  const visible = ref(initialNameState.visible)

  const tagText = computed(() => props.tag?.trim() || '')

  let loadSeq = 0

  const isStale = (seq: number, id: string, type: FromType, groupId: string) =>
    seq !== loadSeq || props.id !== id || props.type !== type || props.groupId !== groupId

  const loadName = () => {
    const id = props.id
    const type = props.type
    const groupId = type === 'user' ? props.groupId : ''

    if (!id || (type !== 'user' && type !== 'robot')) {
      displayName.value = ''
      visible.value = true
      return
    }

    const cached = nameStore.getCachedName(type, id, groupId)
    if (cached) {
      displayName.value = cached
      visible.value = true
      return
    }

    const seq = ++loadSeq
    if (!props.instant) {
      visible.value = false
    }

    nameStore.resolveName(type, id, groupId).then((name) => {
      if (isStale(seq, id, type, groupId)) return
      displayName.value = name
      visible.value = true
    })
  }

  watch(
    () => [props.id, props.type, props.groupId] as const,
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
    user-select: none;

    &--visible {
      opacity: 1;
    }

    &--instant {
      opacity: 1;
      transition: none;
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
