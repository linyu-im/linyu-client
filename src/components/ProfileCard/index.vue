<template>
  <n-spin v-show="!overlayBlocking" :show="loading" :size="24" class="profile-card__spin">
    <div class="profile-card">
      <ProfileCardUser
        v-if="type === 'user'"
        :id="id"
        :user-info="userInfo"
        @update:edit-profile-show="onEditProfileShow"
        @update:add-friend-show="onAddFriendShow" />
      <ProfileCardGroup
        v-else-if="type === 'group'"
        :id="id"
        :group-profile="groupProfile"
        :current-user-id="currentUserId" />
      <ProfileCardEnterprise v-else :id="id" :enterprise-info="enterpriseInfo" />
    </div>
  </n-spin>
</template>

<script setup lang="ts">
  import { usePeerInfoStore } from '@/stores/user/peerInfo'
  import { useUserStore } from '@/stores/user/user'
  import type { EnterprisInfo } from '@/types/api/enterprise'
  import type { GroupInfoResult } from '@/types/api/group'
  import type { User } from '@/types/api/user'
  import type { FromType } from '@/types/common'

  const props = withDefaults(
    defineProps<{
      id: string
      type?: FromType
    }>(),
    {
      type: 'user'
    }
  )

  const emit = defineEmits<{
    positionChange: []
    'update:editProfileShow': [show: boolean]
    'update:addFriendShow': [show: boolean]
  }>()

  const userStore = useUserStore()
  const peerInfoStore = usePeerInfoStore()
  const editProfileShow = ref(false)
  const addFriendShow = ref(false)
  const overlayBlocking = computed(() => editProfileShow.value || addFriendShow.value)

  const onEditProfileShow = (show: boolean) => {
    editProfileShow.value = show
    emit('update:editProfileShow', show)
  }

  const onAddFriendShow = (show: boolean) => {
    addFriendShow.value = show
    emit('update:addFriendShow', show)
  }

  const userInfo = computed(() =>
    props.type === 'user' ? (peerInfoStore.read(props.id, 'user') as User | null) : null
  )
  const groupProfile = computed(() =>
    props.type === 'group' ? (peerInfoStore.read(props.id, 'group') as GroupInfoResult | null) : null
  )
  const enterpriseInfo = computed(() =>
    props.type === 'enterprise' ? (peerInfoStore.read(props.id, 'enterprise') as EnterprisInfo | null) : null
  )

  const loading = computed(() => {
    if (!props.id || props.type === 'robot') return false
    if (props.type === 'user') return !userInfo.value
    if (props.type === 'group') return !groupProfile.value
    return !enterpriseInfo.value
  })

  const currentUserId = computed(() => userStore.userInfo?.id || userStore.authInfo?.userId || '')

  const fetchProfile = () => {
    if (!props.id || props.type === 'robot') return

    if (props.type === 'enterprise') {
      peerInfoStore.get(props.id, 'enterprise')
      return
    }

    if (props.type === 'group') {
      peerInfoStore.get(props.id, 'group')
      return
    }

    peerInfoStore.get(props.id, 'user')
  }

  watch(
    () => [props.id, props.type] as const,
    () => {
      fetchProfile()
    },
    { immediate: true }
  )

  watch(loading, (isLoading) => {
    if (!isLoading) {
      nextTick(() => {
        emit('positionChange')
      })
    }
  })
</script>

<style scoped lang="scss">
  .profile-card {
    width: 100%;
    box-sizing: border-box;
    padding: 20px 16px 16px;
    background: var(--bg-primary-color);
    border-radius: 10px;
    border: 1px solid var(--border-color);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  .profile-card__spin {
    width: 320px;
    max-width: calc(100vw - 24px);
    background: var(--bg-primary-color);
    border-radius: 10px;
    overflow: hidden;

    :deep(.n-spin-container),
    :deep(.n-spin-content) {
      width: 100%;
      background: var(--bg-primary-color);
      border-radius: 10px;
    }

    :deep(.n-spin-content) {
      opacity: 1 !important;
    }
  }
</style>
