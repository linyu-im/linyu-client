<template>
  <n-spin :show="loading" class="contacts-profile-spin">
    <n-scrollbar class="contacts-profile__scroll">
      <div class="contacts-profile">
        <div class="contacts-profile__content">
          <div class="contacts-profile__head">
            <Avatar class="size-72px rounded-10px bg-#FFF shrink-0" type="group" :id="groupId" />
            <div class="min-w-0 flex-1">
              <div class="contacts-profile__title">
                <span class="contacts-profile__name truncate">{{ groupInfo?.name || '' }}</span>
                <span class="contacts-profile__count">({{ groupInfo?.memberNum ?? 0 }})</span>
              </div>
              <div class="contacts-profile__id truncate">
                {{ t('contacts.fields.groupId') }} {{ groupInfo?.groupNumber || '-' }}
              </div>
            </div>
          </div>

          <n-divider class="contacts-profile__divider" />

          <div class="contacts-profile__meta">
            <div class="contacts-profile__row">
              <div class="contacts-profile__row-label">
                <svg class="size-14px text-[var(--text-muted-color)]">
                  <use href="#edit"></use>
                </svg>
                <span>{{ t('contacts.fields.groupRemark') }}</span>
              </div>
              <div class="contacts-profile__value-slot">
                <span class="contacts-profile__row-value" :class="{ 'contacts-profile__placeholder': !groupRemark }">
                  {{ groupRemark || t('contacts.placeholders.setGroupRemark') }}
                </span>
              </div>
            </div>
            <div class="contacts-profile__row">
              <div class="contacts-profile__row-label">
                <svg class="size-14px text-[var(--text-muted-color)]">
                  <use href="#user"></use>
                </svg>
                <span>{{ t('contacts.fields.groupAlias') }}</span>
              </div>
              <div class="contacts-profile__value-slot">
                <span class="contacts-profile__row-value" :class="{ 'contacts-profile__placeholder': !groupAlias }">
                  {{ groupAlias || t('contacts.placeholders.noData') }}
                </span>
              </div>
            </div>
            <div class="contacts-profile__row contacts-profile__row--intro">
              <div class="contacts-profile__row-label">
                <svg class="size-14px text-[var(--text-muted-color)]">
                  <use href="#signature"></use>
                </svg>
                <span>{{ t('contacts.fields.groupIntro') }}</span>
              </div>
              <div class="contacts-profile__value-slot contacts-profile__value-slot--intro">
                <span
                  class="contacts-profile__row-value contacts-profile__row-value--intro"
                  :class="{ 'contacts-profile__placeholder': !groupInfo?.describe }">
                  {{ groupInfo?.describe || t('contacts.placeholders.noData') }}
                </span>
              </div>
            </div>
          </div>

          <div class="contacts-profile__top">
            <div class="contacts-profile__row-label contacts-profile__row-label--top">
              <span>{{ t('contacts.sections.activeTop') }}</span>
            </div>
            <div v-if="topList.length > 0" class="contacts-profile__top-grid">
              <div
                v-for="(item, index) in topList"
                :key="item.id"
                class="contacts-profile__top-item"
                :class="[`is-rank-${index + 1}`, { 'is-top-three': index < 3 }]">
                <div v-if="index < 3" class="contacts-profile__top-avatar-wrap">
                  <Avatar
                    class="contacts-profile__top-avatar rounded-50%"
                    :class="{ 'is-rank-1': index === 0 }"
                    :id="item.userId" />
                </div>
                <div class="contacts-profile__top-user">
                  <div class="contacts-profile__top-main">
                    <Avatar v-if="index >= 3" class="size-20px rounded-50% flex-shrink-0" :id="item.userId" />
                    <div class="contacts-profile__top-name">{{ item.username }}</div>
                    <div
                      class="contacts-profile__top-level"
                      :class="index < 3 ? `is-level-rank-${index + 1}` : 'is-level-rank-other'">
                      Lv{{ item.groupUserLevel }}
                    </div>
                  </div>
                  <div
                    class="contacts-profile__top-emotion text-12px flex gap-2px justify-center items-center m-4px text-[var(--text-muted-color)]">
                    <span>[</span>
                    <img v-if="item.emotionUrl" class="size-14px" :src="item.emotionUrl" alt="" />
                    <span>{{ item.emotionName }}</span>
                    <span>]</span>
                  </div>
                </div>
                <div class="contacts-profile__top-rank">{{ index + 1 }}</div>
              </div>
            </div>
            <n-empty v-else size="small" :description="t('contacts.emptyGroups')" />
          </div>
        </div>
        <div class="contacts-profile__actions">
          <n-button class="w-110px" round>{{ t('contacts.actions.share') }}</n-button>
          <n-button class="w-110px" type="primary" round>{{ t('contacts.actions.sendMessage') }}</n-button>
        </div>
      </div>
    </n-scrollbar>
  </n-spin>
</template>

<script setup lang="ts">
  import { groupApi } from '@/api'
  import type { GroupInfoResult } from '@/types/api/group'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    groupId: string
  }>()

  const { t } = useI18n()

  const loading = ref(false)
  const groupProfile = ref<GroupInfoResult | null>(null)

  const fetchGroupInfo = async () => {
    if (!props.groupId) return
    loading.value = true
    groupProfile.value = null
    try {
      const res = await groupApi.getGroupInfo({ groupId: props.groupId })
      if (res.code === 0 && res.data) {
        groupProfile.value = res.data
      } else {
        window.$message.error(res.msg)
      }
    } finally {
      loading.value = false
    }
  }

  watch(
    () => props.groupId,
    () => {
      void fetchGroupInfo()
    },
    { immediate: true }
  )

  const groupInfo = computed(() => groupProfile.value?.info)
  const topList = computed(() => (groupProfile.value?.tops || []).slice(0, 9))
  const groupRemark = computed(() => topList.value.find((item) => item.groupRemark?.trim())?.groupRemark?.trim() || '')
  const groupAlias = computed(
    () => topList.value.find((item) => item.groupNickName?.trim())?.groupNickName?.trim() || ''
  )
</script>

<style scoped lang="scss">
  .contacts-profile-spin {
    width: 100%;
    min-width: 0;
    height: 100%;
    overflow: hidden;

    :deep(.n-spin-container) {
      width: 100%;
      min-width: 0;
      height: 100%;
    }

    :deep(.n-spin-content) {
      width: 100%;
      min-width: 0;
      height: 100%;
    }
  }

  .contacts-profile {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    max-width: 560px;
    height: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    overflow: hidden;

    &__scroll {
      flex: 1;
      min-height: 0;

      :deep(.n-scrollbar-container) {
        height: 100%;
      }

      :deep(.n-scrollbar-content) {
        box-sizing: border-box;
      }
    }

    &__content {
      padding: 60px 40px 16px;
      box-sizing: border-box;
    }

    &__head {
      display: flex;
      gap: 16px;
      align-items: center;
      width: 100%;
      min-width: 0;
    }

    &__title {
      display: flex;
      align-items: baseline;
      gap: 8px;
      width: 100%;
      min-width: 0;
    }

    &__name {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.2;
    }

    &__count {
      font-size: 24px;
      font-weight: 400;
      color: var(--text-secondary-color);
      line-height: 1;
    }

    &__id {
      margin-top: 6px;
      font-size: 13px;
      color: var(--text-muted-color);
    }

    &__divider {
      margin: 16px 0;
    }

    &__meta {
      display: flex;
      flex-direction: column;
      gap: 5px;
      width: 100%;
      min-width: 0;
      overflow: hidden;
    }

    &__row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-width: 0;
      min-height: 28px;
      font-size: 14px;
      color: var(--text-color);
      overflow: hidden;

      &--intro {
        align-items: flex-start;

        .contacts-profile__row-label {
          height: 20px;
        }

        .contacts-profile__value-slot {
          min-height: 20px;
          height: auto;
        }
      }
    }

    &__row-label {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      color: var(--text-muted-color);
      flex-shrink: 0;
      font-size: 14px;
      user-select: none;

      &--top {
        margin-bottom: 20px;
        font-size: 16px;
        color: var(--text-color);
        font-weight: 600;
      }
    }

    &__value-slot {
      flex: 1 1 0;
      min-width: 0;
      max-width: 60%;
      height: 28px;
      overflow: hidden;

      &--intro {
        max-width: 64%;
      }
    }

    &__row-value {
      display: block;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      height: 28px;
      line-height: 28px;
      color: var(--text-secondary-color);
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      box-sizing: border-box;

      &--intro {
        display: -webkit-box;
        height: auto;
        line-height: 1.5;
        -webkit-line-clamp: 3;
        line-clamp: 3;
        -webkit-box-orient: vertical;
        white-space: normal;
        text-overflow: unset;
      }
    }

    &__placeholder {
      color: var(--text-secondary-color);
      opacity: 0.75;
    }

    &__top {
      margin-top: 10px;
      overflow: visible;
    }

    &__top-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      overflow: visible;
    }

    &__top-item {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      overflow: visible;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, var(--divider-color) 60%, transparent);

      &.is-rank-1 {
        background: linear-gradient(
          180deg,
          color-mix(in srgb, #ffd670 20%, var(--card-bg-color)) 0%,
          color-mix(in srgb, #ffd670 0%, var(--card-bg-color)) 100%
        );
      }

      &.is-rank-2 {
        background: linear-gradient(
          180deg,
          color-mix(in srgb, #e8e8e8 20%, var(--card-bg-color)) 0%,
          color-mix(in srgb, #e8e8e8 0%, var(--card-bg-color)) 100%
        );
      }

      &.is-rank-3 {
        background: linear-gradient(
          180deg,
          color-mix(in srgb, #ff9f73 20%, var(--card-bg-color)) 0%,
          color-mix(in srgb, #ff9f73 0%, var(--card-bg-color)) 100%
        );
      }

      &.is-top-three {
        position: relative;
        flex-direction: column;
        align-items: center;
        margin-top: 22px;
        padding: 10px;
        min-height: 60px;
        justify-content: center;
        overflow: visible;

        .contacts-profile__top-avatar-wrap {
          position: absolute;
          left: 50%;
          top: -28px;
          transform: translateX(-50%);
          z-index: 2;
          user-select: none;
        }

        &.is-rank-1 {
          grid-column: 2;
          grid-row: 1;

          .contacts-profile__top-avatar-wrap {
            top: -36px;
          }
        }

        &.is-rank-2 {
          grid-column: 1;
          grid-row: 1;
        }

        &.is-rank-3 {
          grid-column: 3;
          grid-row: 1;
        }

        .contacts-profile__top-user {
          position: relative;
          z-index: 2;
          width: 100%;
          flex: none;
          text-align: center;
        }

        .contacts-profile__top-name,
        .contacts-profile__top-level {
          text-align: center;
        }

        .contacts-profile__top-rank {
          position: absolute;
          right: 2px;
          bottom: 8px;
          margin-left: 0;
          z-index: 1;
          pointer-events: none;
          font-size: 40px;
          line-height: 1;
          padding: 0 6px 0 0;
          overflow: visible;
        }
      }

      &:not(.is-top-three) {
        position: relative;
        justify-content: center;
        align-items: center;

        .contacts-profile__top-user {
          flex: none;
          width: 100%;
          min-width: 0;
          text-align: center;
        }

        .contacts-profile__top-main {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          width: 100%;
          min-width: 0;
        }

        .contacts-profile__top-name {
          flex: 0 1 auto;
          max-width: 100%;
        }

        > .contacts-profile__top-level {
          position: absolute;
          top: 6px;
          right: 6px;
          z-index: 2;
          pointer-events: none;
        }

        .contacts-profile__top-rank {
          position: absolute;
          right: 2px;
          bottom: 6px;
          margin-left: 0;
          z-index: 1;
          pointer-events: none;
          font-size: 28px;
          line-height: 1;
          padding: 0 4px 0 0;
        }
      }
    }

    &__top-main {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-width: 0;
    }

    &__top-avatar-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    &__top-avatar {
      width: 36px;
      height: 36px;
      border: 2px solid color-mix(in srgb, var(--card-bg-color) 90%, transparent);

      &.is-rank-1 {
        width: 44px;
        height: 44px;
      }
    }

    &__top-user {
      min-width: 0;
      flex: 1;
    }

    &__top-name {
      font-size: 14px;
      color: var(--text-color);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      user-select: none;
    }

    &__top-level {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      border: 1px solid;
      user-select: none;

      &.is-level-rank-1 {
        border-color: #ffbd16;
        background-color: color-mix(in srgb, #ffe6a5 25%, transparent);
        color: #ffbd16;
      }

      &.is-level-rank-2 {
        border-color: #c8c8c8;
        background-color: color-mix(in srgb, #d0d0d0 25%, transparent);
        color: #c8c8c8;
      }

      &.is-level-rank-3 {
        border-color: #ff9767;
        background-color: color-mix(in srgb, #ffccb4 25%, transparent);
        color: #ff8952;
      }

      &.is-level-rank-other {
        border-color: var(--card-bg-color);
        background-color: var(--card-bg-color);
        color: var(--text-secondary-color);
      }
    }

    &__top-rank {
      user-select: none;
      display: inline-block;
      flex-shrink: 0;
      font-size: 24px;
      font-weight: 600;
      line-height: 1.25;
      font-style: italic;
      overflow: visible;
      padding: 2px 4px 2px 0;
      color: color-mix(in srgb, var(--text-secondary-color) 15%, transparent);
    }

    &__top-item.is-rank-1 &__top-rank,
    &__top-item.is-rank-2 &__top-rank,
    &__top-item.is-rank-3 &__top-rank {
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      -webkit-text-fill-color: transparent;
      overflow: visible;
      font-style: normal;
      font-style: italic;
    }

    &__top-item.is-rank-1 &__top-rank {
      background-image: linear-gradient(
        180deg,
        color-mix(in srgb, #ffd569 60%, transparent) 0%,
        color-mix(in srgb, #ffd569 0%, transparent) 100%
      );
    }

    &__top-item.is-rank-2 &__top-rank {
      background-image: linear-gradient(
        180deg,
        color-mix(in srgb, #d0d0d0 60%, transparent) 0%,
        color-mix(in srgb, #d0d0d0 0%, transparent) 100%
      );
    }

    &__top-item.is-rank-3 &__top-rank {
      background-image: linear-gradient(
        180deg,
        color-mix(in srgb, #ffccb4 60%, transparent) 0%,
        color-mix(in srgb, #ffccb4 0%, transparent) 100%
      );
    }

    &__actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-shrink: 0;
      padding: 12px 40px 24px;
      flex-wrap: wrap;
    }
  }
</style>
