<template>
  <n-spin :show="loading" class="avatar-profile-card__spin">
    <div class="avatar-profile-card">
      <AvatarProfileCardUser v-if="type === 'user'" :id="id" :user-info="userInfo" />
      <AvatarProfileCardGroup
        v-else-if="type === 'group'"
        :id="id"
        :group-profile="groupProfile"
        :current-user-id="currentUserId" />
      <AvatarProfileCardEnterprise v-else :id="id" :enterprise-info="enterpriseInfo" />
      <AvatarProfileCardActions :show-call-actions="showCallActions" />
    </div>
  </n-spin>
</template>

<script setup lang="ts">
  import { enterpriseApi, groupApi, userApi } from '@/api'
  import AvatarProfileCardActions from '@/components/AvatarProfileCard/AvatarProfileCardActions.vue'
  import AvatarProfileCardEnterprise from '@/components/AvatarProfileCard/AvatarProfileCardEnterprise.vue'
  import AvatarProfileCardGroup from '@/components/AvatarProfileCard/AvatarProfileCardGroup.vue'
  import AvatarProfileCardUser from '@/components/AvatarProfileCard/AvatarProfileCardUser.vue'
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
  }>()

  const userStore = useUserStore()

  const loading = ref(false)
  const userInfo = ref<UserInfoResult | null>(null)
  const groupProfile = ref<GroupInfoResult | null>(null)
  const enterpriseInfo = ref<EnterprisInfo | null>(null)

  const currentUserId = computed(() => userStore.userInfo?.id || userStore.authInfo?.userId || '')

  const isSelf = computed(() => props.type === 'user' && props.id === currentUserId.value)

  const showCallActions = computed(() => props.type === 'user' && !isSelf.value)

  const fetchProfile = () => {
    if (!props.id) return

    loading.value = true
    userInfo.value = null
    groupProfile.value = null
    enterpriseInfo.value = null

    if (props.type === 'user') {
      userApi
        .getUserInfo({ userId: props.id })
        .then((res) => {
          if (res.code === 0 && res.data) {
            userInfo.value = res.data
          } else {
            window.$message.error(res.msg)
          }
        })
        .finally(() => {
          loading.value = false
        })
      return
    }

    if (props.type === 'group') {
      groupApi
        .getGroupInfo({ groupId: props.id })
        .then((res) => {
          if (res.code === 0 && res.data) {
            groupProfile.value = res.data
          } else {
            window.$message.error(res.msg)
          }
        })
        .finally(() => {
          loading.value = false
        })
      return
    }

    enterpriseApi
      .getEnterpriseInfo({ enterpriseId: props.id })
      .then((res) => {
        if (res.code === 0 && res.data) {
          enterpriseInfo.value = res.data
        } else {
          window.$message.error(res.msg)
        }
      })
      .finally(() => {
        loading.value = false
      })
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
  @use './avatarProfileCard.scss';

  .avatar-profile-card__spin {
    width: 320px;
    max-width: calc(100vw - 24px);

    :deep(.n-spin-container),
    :deep(.n-spin-content) {
      width: 100%;
    }
  }
</style>
