<template>
  <n-avatar
    class="user-select-none avatar"
    :class="{ 'avatar--visible': visible }"
    :src="src || undefined"
    :round="round"
    :size="size"
    fallback-src="/avatar.png" />
</template>

<script setup lang="ts">
  import { useAvatarStore } from '@/stores/avatar'

  interface Props {
    id: string
    type?: string
    size?: number | 'small' | 'medium' | 'large'
    round?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    type: 'user',
    size: 'medium',
    round: false
  })

  const avatarStore = useAvatarStore()

  const src = ref('')
  const visible = ref(false)

  let loadSeq = 0

  const isStale = (seq: number, id: string, type: string) => seq !== loadSeq || props.id !== id || props.type !== type

  const loadAvatar = async () => {
    const id = props.id
    const type = props.type

    if (!id) {
      src.value = ''
      visible.value = true
      return
    }

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

  watch(
    () => [props.id, props.type] as const,
    () => {
      void loadAvatar()
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  .avatar {
    opacity: 0;
    transition: opacity 0.12s ease;

    &--visible {
      opacity: 1;
    }
  }
</style>
