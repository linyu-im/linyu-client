<template>
  <div class="contacts-detail">
    <div class="contacts-detail__title">{{ t('contacts.views.groupNotice.title') }}</div>
    <n-spin :show="loading" class="contacts-detail__spin">
      <div v-if="!loading && list.length === 0" class="contacts-detail__empty">
        {{ t('contacts.views.groupNotice.empty') }}
      </div>
      <n-scrollbar v-else class="contacts-detail__scroll" trigger="none" :theme-overrides="{ width: '6px' }">
        <div class="contacts-detail__cards">
          <div v-for="item in list" :key="item.id" class="contacts-apply-card">
            <template v-if="isLeaveNotice(item)">
              <Avatar class="size-48px shrink-0 rounded-full bg-#FFF" :id="item.extra.leaveUserId" />
              <div class="min-w-0 flex-1">
                <div class="contacts-apply-card__head">
                  <Name
                    class="contacts-apply-card__name contacts-apply-card__name--link"
                    :id="item.extra.leaveUserId" />
                  <span class="contacts-apply-card__time">{{ formatTime(item.createdAt) }}</span>
                </div>
                <div class="contacts-apply-card__msg contacts-apply-card__msg--inline">
                  <span>{{ t('contacts.views.groupNotice.action.leave') }}</span>
                  <Name class="contacts-apply-card__name--link" type="group" :id="item.extra.groupId" />
                </div>
              </div>
            </template>
            <template v-else>
              <Avatar class="size-48px shrink-0 rounded-8px bg-#FFF" type="group" :id="item.extra.groupId" />
              <div class="min-w-0 flex-1">
                <div class="contacts-apply-card__head">
                  <Name class="contacts-apply-card__name" type="group" :id="item.extra.groupId" />
                  <span class="contacts-apply-card__time">{{ formatTime(item.createdAt) }}</span>
                </div>
                <div class="contacts-apply-card__msg">{{ getNoticeMessage(item) }}</div>
              </div>
            </template>
          </div>
        </div>
      </n-scrollbar>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
  import { noticeApi } from '@/api'
  import Name from '@/components/Name.vue'
  import { GroupNoticeExtraStatus } from '@/constants/notice'
  import type { Notice } from '@/types/api/notice'
  import { formatTime } from '@/utils/common/time'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const loading = ref(false)
  const list = ref<Notice[]>([])

  const isLeaveNotice = (item: Notice) => item.extra.status === GroupNoticeExtraStatus.Leave

  const getNoticeMessage = (item: Notice) => {
    switch (item.extra.status) {
      case GroupNoticeExtraStatus.Dissolve:
        return t('contacts.views.groupNotice.message.dissolve')
      case GroupNoticeExtraStatus.Remove:
        return t('contacts.views.groupNotice.message.remove')
      default:
        return t('contacts.views.groupNotice.message.unknown')
    }
  }

  const fetchList = () => {
    if (loading.value) return
    loading.value = true
    noticeApi
      .listGroup()
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
    background-color: var(--content-card-bg);
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

      &--link {
        color: var(--primary-color);
        font-weight: 500;
      }
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

      &--inline {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        flex-wrap: wrap;
      }
    }
  }
</style>
