<template>
  <n-spin v-show="!editProfileShow" :show="loading" class="profile-card__spin">
    <div class="profile-card">
      <ProfileCardUser
        v-if="type === 'user'"
        :id="id"
        :user-info="userInfo"
        @update:edit-profile-show="onEditProfileShow" />
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
  import { usePeerInfoStore } from '@/stores/peerInfo'
  import { useUserStore } from '@/stores/user'
  import type { EnterprisInfo } from '@/types/api/enterprise'
  import type { GroupInfoResult } from '@/types/api/group'
  import type { UserInfoResult } from '@/types/api/user'
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
  }>()

  const userStore = useUserStore()
  const peerInfoStore = usePeerInfoStore()
  const editProfileShow = ref(false)

  const onEditProfileShow = (show: boolean) => {
    editProfileShow.value = show
    emit('update:editProfileShow', show)
  }

  const userInfo = computed(() =>
    props.type === 'user' ? (peerInfoStore.read(props.id, 'user') as UserInfoResult | null) : null
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
  @use './profileCard.scss';

  .profile-card__spin {
    width: 320px;
    max-width: calc(100vw - 24px);

    :deep(.n-spin-container),
    :deep(.n-spin-content) {
      width: 100%;
    }
  }
</style>
