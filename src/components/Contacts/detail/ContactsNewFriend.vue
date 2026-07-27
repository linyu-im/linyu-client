<template>
  <div class="contacts-detail">
    <div class="contacts-detail__title">{{ t('contacts.views.newFriend.title') }}</div>
    <n-spin :show="loading" class="contacts-detail__spin">
      <div v-if="!loading && list.length === 0" class="contacts-detail__empty">
        {{ t('contacts.views.newFriend.empty') }}
      </div>
      <n-scrollbar v-else class="contacts-detail__scroll" trigger="none" :theme-overrides="{ width: '6px' }">
        <div class="contacts-detail__cards">
          <div v-for="item in list" :key="item.id" class="contacts-apply-card">
            <Avatar class="size-48px shrink-0 rounded-8px bg-#FFF" :id="item.userId" />
            <div class="min-w-0 flex-1">
              <div class="contacts-apply-card__head">
                <Name class="contacts-apply-card__name" :id="item.userId" instant />
                <ColorTag :label="getApplySourceLabel(item.applySource)" color="var(--primary-color)" />
                <span class="contacts-apply-card__time">{{ formatTime(item.createdAt) }}</span>
              </div>
              <div class="contacts-apply-card__msg">{{ item.describe }}</div>
            </div>
            <div v-if="isApplyPending(item)" class="contacts-apply-card__actions">
              <n-button size="tiny" class="contacts-apply-card__reject" text @click="handleReject(item)">
                {{ t('contacts.actions.reject') }}
              </n-button>
              <n-button size="tiny" class="contacts-apply-card__agree" type="primary" @click="handleAgree(item)">
                {{ t('contacts.actions.agree') }}
              </n-button>
            </div>
            <div v-else class="contacts-apply-card__done">{{ getStatusLabel(item.status) }}</div>
          </div>
        </div>
      </n-scrollbar>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
  import ColorTag from '@/components/ColorTag.vue'
  import Name from '@/components/Name.vue'
  import { applyApi } from '@/api'
  import { isApplySource, ApplyStatusEnum } from '@/constants/apply'
  import type { Apply } from '@/types/api/apply'
  import { formatTime } from '@/utils/common/time'
  import { useUserStore } from '@/stores/user/user'
  import { useContactsStore } from '@/stores/user/contacts'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const userStore = useUserStore()
  const contactsStore = useContactsStore()

  const loading = ref(false)
  const list = ref<Apply[]>([])

  const currentUserId = computed(() => userStore.authInfo.userId)

  const getApplySourceLabel = (source?: string) => {
    const normalized = (source || '').trim().toLowerCase()
    if (isApplySource(normalized)) {
      return t(`contacts.views.newFriend.applySource.${normalized}`)
    }
    return t('contacts.views.newFriend.applySource.unknown')
  }

  const isApplyPending = (item: Apply) => {
    if (!item.status?.trim()) return true
    if (item.status === ApplyStatusEnum.Wait && item.userId !== currentUserId.value) return true
    return false
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case ApplyStatusEnum.Wait:
        return t('contacts.actions.wait')
      case ApplyStatusEnum.Agree:
        return t('contacts.actions.agreed')
      case ApplyStatusEnum.Reject:
        return t('contacts.actions.rejected')
      case ApplyStatusEnum.Cancel:
        return t('contacts.actions.cancelled')
      default:
        return t('contacts.actions.unknown')
    }
  }

  const fetchList = () => {
    if (loading.value) return
    loading.value = true
    applyApi
      .friendList()
      .then((res) => {
        if (res.code === 0 && res.data) {
          list.value = [...res.data].sort(
            (a, b) =>
              new Date(b.createdAt.replace(/-/g, '/')).getTime() - new Date(a.createdAt.replace(/-/g, '/')).getTime()
          )
        } else {
          window.$message.error(res.msg)
        }
      })
      .finally(() => {
        loading.value = false
      })
  }

  const handleAgree = (item: Apply) => {
    if (!item.id) return
    applyApi.agreeFriend({ applyId: item.id }).then((res) => {
      if (res.code === 0) {
        item.status = ApplyStatusEnum.Agree
        contactsStore.fetchFriendList()
        return
      }
      window.$message.error(res.msg)
    })
  }

  const handleReject = (item: Apply) => {
    if (!item.id) return
    applyApi.reject({ applyId: item.id }).then((res) => {
      if (res.code === 0) {
        item.status = ApplyStatusEnum.Reject
        return
      }
      window.$message.error(res.msg)
    })
  }

  onMounted(() => {
    fetchList()
  })

  onActivated(() => {
    fetchList()
  })
</script>

<style scoped lang="scss">
  .contacts-detail {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    max-width: 860px;
    height: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    padding: 22px 14px 24px 20px;
    overflow: hidden;

    &__title {
      flex-shrink: 0;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--text-color);
      user-select: none;
    }

    &__spin {
      flex: 1;
      min-height: 0;
      width: 100%;
      overflow: hidden;

      :deep(.n-spin-container),
      :deep(.n-spin-content) {
        width: 100%;
        height: 100%;
        min-height: 0;
      }
    }

    &__scroll {
      height: 100%;

      :deep(.n-scrollbar-container) {
        height: 100%;
      }

      :deep(.n-scrollbar-content) {
        box-sizing: border-box;
      }

      :deep(.n-scrollbar-rail) {
        right: 0;
      }
    }

    &__empty {
      padding: 24px 0;
      font-size: 14px;
      color: var(--text-secondary-color);
      user-select: none;
      text-align: center;
    }

    &__cards {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-right: 10px;
      padding-bottom: 4px;
      box-sizing: border-box;
    }
  }

  .contacts-apply-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background-color: var(--bg-primary-color);
    border: 1px solid color-mix(in srgb, var(--border-color) 60%, transparent);
    border-radius: 10px;
    padding: 14px 16px;

    &__head {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    &__name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-shrink: 1;
      min-width: 0;
    }

    &__time {
      flex-shrink: 0;
      font-size: 11px;
      color: var(--text-secondary-color);
      user-select: none;
    }

    &__msg {
      margin-top: 4px;
      font-size: 13px;
      line-height: 1.45;
      color: var(--text-secondary-color);
      word-break: break-word;
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: 15px;
      flex-shrink: 0;
    }

    &__reject {
      color: var(--text-secondary-color) !important;

      &:hover {
        color: var(--text-color) !important;
      }
    }

    &__done {
      flex-shrink: 0;
      font-size: 12px;
      color: var(--text-secondary-color);
      user-select: none;
    }
  }
</style>
