<template>
  <div class="contacts-detail">
    <div class="contacts-detail__title">{{ t('contacts.views.groupNotice.title') }}</div>
    <n-spin :show="loading">
      <div v-if="!loading && list.length === 0" class="contacts-detail__empty">
        {{ t('contacts.views.groupNotice.empty') }}
      </div>
      <div v-else class="contacts-detail__cards">
        <div v-for="item in list" :key="item.id" class="contacts-apply-card">
          <Avatar class="size-48px shrink-0 rounded-8px bg-#FFF" :id="getApplicantId(item)" />
          <div class="min-w-0 flex-1">
            <div class="contacts-apply-card__head">
              <span class="contacts-apply-card__name">{{ getApplicantName(item) }}</span>
              <span class="contacts-apply-card__invite">{{ t('contacts.views.groupNotice.inviteTag') }}</span>
              <span class="contacts-apply-card__group">{{ getGroupName(item) }}</span>
              <span class="contacts-apply-card__time">{{ formatTime(item.createdAt) }}</span>
            </div>
            <div class="contacts-apply-card__msg">{{ item.describe }}</div>
          </div>
          <div v-if="isApplyPending(item.status)" class="contacts-apply-card__actions">
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
    </n-spin>
  </div>
</template>

<script setup lang="ts">
  import { applyApi } from '@/api'
  import type { Apply } from '@/types/api/apply'
  import { formatTime } from '@/utils/time'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const loading = ref(false)
  const list = ref<Apply[]>([])

  const getApplicantId = (item: Apply) => item.userId

  const getApplicantName = (item: Apply) => item.userName?.trim() || getApplicantId(item)

  const getGroupName = (item: Apply) => item.peerName?.trim() || item.peerId

  const isApplyPending = (status: string) => !status?.trim()

  const getStatusLabel = (status: string) => {
    if (status === 'agree') return t('contacts.actions.completed')
    if (status === 'reject' || status === 'rejected') return t('contacts.actions.rejected')
    return t('contacts.actions.completed')
  }

  const fetchList = async () => {
    if (loading.value) return
    loading.value = true
    try {
      const res = await applyApi.groupList()
      if (res.code === 0 && res.data) {
        list.value = [...res.data].sort(
          (a, b) =>
            new Date(b.createdAt.replace(/-/g, '/')).getTime() - new Date(a.createdAt.replace(/-/g, '/')).getTime()
        )
      } else {
        window.$message.error(res.msg)
      }
    } finally {
      loading.value = false
    }
  }

  const handleAgree = (_item: Apply) => {
    // TODO: agree group apply API
  }

  const handleReject = (_item: Apply) => {
    // TODO: reject group apply API
  }

  onMounted(() => {
    void fetchList()
  })

  onActivated(() => {
    void fetchList()
  })
</script>

<style scoped lang="scss">
  .contacts-detail {
    width: 100%;
    min-width: 0;
    max-width: 860px;
    margin: 0 auto;
    box-sizing: border-box;
    padding: 22px 24px 20px;

    &__title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--text-color);
      user-select: none;
    }

    &__empty {
      padding: 24px 0;
      font-size: 14px;
      color: var(--text-secondary-color);
      user-select: none;
    }

    &__cards {
      display: flex;
      flex-direction: column;
      gap: 12px;
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
      flex-wrap: wrap;
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
      max-width: 100%;
    }

    &__invite {
      flex-shrink: 0;
      font-size: 13px;
      color: var(--text-secondary-color);
      user-select: none;
    }

    &__group {
      flex-shrink: 1;
      min-width: 0;
      font-size: 13px;
      font-weight: 500;
      color: var(--primary-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      user-select: none;
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
