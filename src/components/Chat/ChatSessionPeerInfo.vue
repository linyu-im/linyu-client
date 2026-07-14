<template>
  <div class="chat-session-peer-info" :class="{ 'chat-session-peer-info--visible': visible }">
    <template v-if="sceneType === SceneType.User">
      <div class="text-16px font-bold truncate">{{ displayName }}</div>
      <div
        v-if="userInfo?.emotionUrl"
        class="flex items-center justify-center text-12px text-[var(--text-muted-color)] m-l-10px flex-shrink-0">
        <img class="size-14px" :src="userInfo.emotionUrl" alt="" />
        <div class="m-l-2px">{{ userInfo.emotionName }}</div>
      </div>
    </template>
    <template v-else-if="sceneType === SceneType.Group">
      <div class="text-16px font-bold truncate">{{ groupName }}</div>
      <div class="text-12px text-[var(--text-muted-color)] m-l-10px flex-shrink-0">
        {{ t('avatarProfile.memberCount', { count: memberCount }) }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { SceneType } from '@/constants/common'
  import { useChatStore } from '@/stores/chat/chat'
  import { useContactsStore } from '@/stores/user/contacts'
  import { usePeerInfoStore } from '@/stores/user/peerInfo'
  import type { GroupInfoResult } from '@/types/api/group'
  import type { User } from '@/types/api/user'

  const props = withDefaults(
    defineProps<{
      peerId: string
      sceneType?: SceneType
    }>(),
    {
      sceneType: SceneType.User
    }
  )

  const { t } = useI18n()
  const peerInfoStore = usePeerInfoStore()
  const contactsStore = useContactsStore()
  const chatStore = useChatStore()

  const userInfo = computed(() =>
    props.sceneType === SceneType.User ? (peerInfoStore.read(props.peerId, props.sceneType) as User | null) : null
  )

  const groupInfo = computed(() =>
    props.sceneType === SceneType.Group
      ? (peerInfoStore.read(props.peerId, props.sceneType) as GroupInfoResult | null)
      : null
  )

  const visible = computed(() => {
    if (!props.peerId) return false
    return props.sceneType === SceneType.Group ? !!groupInfo.value : !!userInfo.value
  })

  const displayName = computed(() => {
    if (!userInfo.value) return ''
    return userInfo.value.remark || userInfo.value.username
  })

  const groupName = computed(() => {
    const contactRemark = contactsStore.groupList.find((item) => item.peerId === props.peerId)?.remark?.trim()
    if (contactRemark) return contactRemark
    const chatRemark = chatStore.chatList.find((item) => item.peerId === props.peerId)?.peerRemark?.trim()
    if (chatRemark) return chatRemark
    return groupInfo.value?.info.name ?? ''
  })

  const memberCount = computed(() => groupInfo.value?.info.memberNum ?? 0)

  watch(
    () => [props.peerId, props.sceneType] as const,
    ([peerId, sceneType]) => {
      if (!peerId) return
      peerInfoStore.get(peerId, sceneType)
    },
    { immediate: true }
  )

  defineExpose({
    userInfo,
    groupInfo
  })
</script>

<style scoped lang="scss">
  .chat-session-peer-info {
    display: flex;
    align-items: center;
    align-self: stretch;
    min-width: 0;
    flex: 1;
    user-select: none;
    opacity: 0;
    transition: opacity 0.12s ease;

    &--visible {
      opacity: 1;
    }
  }
</style>
