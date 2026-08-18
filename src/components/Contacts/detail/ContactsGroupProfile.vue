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
                {{ t('contacts.group.groupId') }} {{ groupInfo?.groupNumber || '-' }}
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
                <span>{{ t('contacts.group.remark') }}</span>
              </div>
              <div class="contacts-profile__value-slot">
                <n-input
                  v-if="remarkEditing"
                  ref="remarkInputRef"
                  v-model:value="remarkDraft"
                  size="small"
                  :placeholder="t('contacts.group.placeholders.setRemark')"
                  :disabled="remarkSaving"
                  class="contacts-profile__remark-input"
                  @blur="commitRemark"
                  @keyup.enter="commitRemark" />
                <span
                  v-else
                  class="contacts-profile__row-value contacts-profile__row-value--clickable"
                  :class="{ 'contacts-profile__placeholder': remarkIsPlaceholder }"
                  @click="startRemarkEdit">
                  {{ remarkIsPlaceholder ? t('contacts.group.placeholders.setRemark') : groupRemarkText }}
                </span>
              </div>
            </div>
            <div class="contacts-profile__row">
              <div class="contacts-profile__row-label">
                <svg class="size-14px text-[var(--text-muted-color)]">
                  <use href="#user"></use>
                </svg>
                <span>{{ t('contacts.group.alias') }}</span>
              </div>
              <div class="contacts-profile__value-slot">
                <n-input
                  v-if="aliasEditing"
                  ref="aliasInputRef"
                  v-model:value="aliasDraft"
                  size="small"
                  :placeholder="t('contacts.group.placeholders.setAlias')"
                  :disabled="aliasSaving"
                  class="contacts-profile__remark-input"
                  @blur="commitAlias"
                  @keyup.enter="commitAlias" />
                <span
                  v-else
                  class="contacts-profile__row-value contacts-profile__row-value--clickable"
                  :class="{ 'contacts-profile__placeholder': aliasIsPlaceholder }"
                  @click="startAliasEdit">
                  {{ aliasIsPlaceholder ? t('contacts.group.placeholders.setAlias') : groupAliasText }}
                </span>
              </div>
            </div>
            <div class="contacts-profile__row contacts-profile__row--intro">
              <div class="contacts-profile__row-label">
                <svg class="size-14px text-[var(--text-muted-color)]">
                  <use href="#document"></use>
                </svg>
                <span>{{ t('contacts.group.intro') }}</span>
              </div>
              <div class="contacts-profile__value-slot contacts-profile__value-slot--intro">
                <span
                  v-if="!groupIntroText"
                  class="contacts-profile__row-value contacts-profile__row-value--intro contacts-profile__placeholder">
                  {{ t('contacts.placeholders.noData') }}
                </span>
                <n-tooltip
                  v-else
                  trigger="hover"
                  placement="top"
                  :disabled="!isIntroOverflow"
                  :content-style="introTooltipStyle">
                  <template #trigger>
                    <span
                      :ref="bindIntroOverflowRef"
                      class="contacts-profile__row-value contacts-profile__row-value--intro">
                      {{ groupIntroText }}
                    </span>
                  </template>
                  {{ groupIntroText }}
                </n-tooltip>
              </div>
            </div>
          </div>

          <div class="contacts-profile__top">
            <div class="contacts-profile__row-label contacts-profile__row-label--top">
              <span>{{ t('contacts.group.sections.activeTop') }}</span>
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
                    <!-- <div
                      class="contacts-profile__top-level"
                      :class="index < 3 ? `is-level-rank-${index + 1}` : 'is-level-rank-other'">
                      Lv{{ item.groupUserLevel }}
                    </div> -->
                  </div>
                  <div
                    v-if="item.emotionUrl || item.emotionName"
                    class="contacts-profile__top-emotion text-12px flex gap-2px justify-center items-center m-4px text-[var(--text-muted-color)]">
                    <span>[</span>
                    <EmotionIcon :url="item.emotionUrl" :size="18" />
                    <span>{{ item.emotionName }}</span>
                    <span>]</span>
                  </div>
                </div>
                <!-- <div class="contacts-profile__top-rank">{{ index + 1 }}</div> -->
              </div>
            </div>
            <div v-else class="contacts-profile__empty">
              <n-empty size="small" :description="t('contacts.emptyGroups')" />
            </div>
          </div>
        </div>
        <div class="contacts-profile__actions">
          <n-button class="w-110px" type="primary" round :loading="sendingMessage" @click="onSendMessage">
            {{ t('contacts.actions.sendMessage') }}
          </n-button>
        </div>
      </div>
    </n-scrollbar>
  </n-spin>
</template>

<script setup lang="ts">
  import { useOverflowTooltip } from '@/composables/useOverflowTooltip'
  import { contactsApi, groupApi } from '@/api'
  import { SceneType } from '@/constants/common'
  import { useHomeTabStore } from '@/stores/app/homeTab'
  import { useChatStore } from '@/stores/chat/chat'
  import { useContactsStore } from '@/stores/user/contacts'
  import { useNameStore } from '@/stores/user/name'
  import { usePeerInfoStore } from '@/stores/user/peerInfo'
  import type { GroupInfoResult } from '@/types/api/group'
  import type { GroupMember } from '@/types/api/groupMember'
  import type { InputInst } from 'naive-ui'
  import type { CSSProperties } from 'vue'
  import { useI18n } from 'vue-i18n'

  const introTooltipStyle: CSSProperties = {
    maxWidth: '360px',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    lineHeight: '1.2'
  }

  const props = defineProps<{
    groupId: string
    remark?: string
  }>()

  const emit = defineEmits<{
    remarkUpdated: [payload: { peerId: string; remark: string }]
  }>()

  const { t } = useI18n()
  const peerInfoStore = usePeerInfoStore()
  const homeTabStore = useHomeTabStore()
  const contactsStore = useContactsStore()
  const chatStore = useChatStore()
  const nameStore = useNameStore()

  const sendingMessage = ref(false)
  const groupProfile = computed(() => peerInfoStore.read(props.groupId, 'group') as GroupInfoResult | null)
  const loading = computed(() => !!props.groupId && !groupProfile.value)
  const groupRemarkText = ref('')
  const remarkEditing = ref(false)
  const remarkDraft = ref('')
  const remarkSaving = ref(false)
  const remarkInputRef = ref<InputInst | null>(null)
  const groupAliasText = ref('')
  const aliasEditing = ref(false)
  const aliasDraft = ref('')
  const aliasSaving = ref(false)
  const aliasInputRef = ref<InputInst | null>(null)

  watch(
    () => props.groupId,
    (groupId) => {
      remarkEditing.value = false
      aliasEditing.value = false
      if (!groupId) return
      peerInfoStore.get(groupId, 'group')
    },
    { immediate: true }
  )

  const getCurrentMember = (): GroupMember | undefined => {
    return groupProfile.value?.currentMember
  }

  const syncRemarkFromProfile = () => {
    groupRemarkText.value = props.remark?.trim() || ''
  }

  const syncAliasFromProfile = () => {
    groupAliasText.value = getCurrentMember()?.groupNickName?.trim() || ''
  }

  watch(() => props.remark, syncRemarkFromProfile, { immediate: true })
  watch(groupProfile, syncAliasFromProfile, { immediate: true })

  const remarkIsPlaceholder = computed(() => !groupRemarkText.value)

  const startRemarkEdit = () => {
    if (remarkEditing.value || remarkSaving.value) return
    aliasEditing.value = false
    remarkDraft.value = groupRemarkText.value
    remarkEditing.value = true
    nextTick(() => remarkInputRef.value?.focus())
  }

  const commitRemark = () => {
    if (!remarkEditing.value || remarkSaving.value) return

    const next = remarkDraft.value.trim()
    remarkEditing.value = false

    if (next === groupRemarkText.value) return

    remarkSaving.value = true
    contactsApi
      .updateRemark({ peerId: props.groupId, remark: next })
      .then((res) => {
        if (res.code === 0) {
          groupRemarkText.value = next
          contactsStore.patchContactRemark(props.groupId, next)
          chatStore.patchPeerRemark(props.groupId, next)
          emit('remarkUpdated', { peerId: props.groupId, remark: next })
          return
        }
        window.$message.error(res.msg)
      })
      .finally(() => {
        remarkSaving.value = false
      })
  }

  const aliasIsPlaceholder = computed(() => !groupAliasText.value)

  const startAliasEdit = () => {
    if (aliasEditing.value || aliasSaving.value) return
    remarkEditing.value = false
    aliasDraft.value = groupAliasText.value
    aliasEditing.value = true
    nextTick(() => aliasInputRef.value?.focus())
  }

  const commitAlias = () => {
    if (!aliasEditing.value || aliasSaving.value) return

    const next = aliasDraft.value.trim()
    aliasEditing.value = false

    if (next === groupAliasText.value) return

    aliasSaving.value = true
    groupApi
      .updateNickname({ groupId: props.groupId, groupNickName: next })
      .then((res) => {
        if (res.code === 0) {
          groupAliasText.value = next
          peerInfoStore.refreshGroup(props.groupId)
          const userId = getCurrentMember()?.userId
          if (userId) {
            nameStore.removeCachedName('user', userId, props.groupId)
          }
          return
        }
        window.$message.error(res.msg)
      })
      .finally(() => {
        aliasSaving.value = false
      })
  }

  const groupInfo = computed(() => groupProfile.value?.info)
  const groupIntroText = computed(() => groupInfo.value?.describe?.trim() ?? '')
  const topList = computed(() => (groupProfile.value?.tops || []).slice(0, 9))

  const { bindTargetRef: bindIntroOverflowRef, isOverflow: isIntroOverflow } = useOverflowTooltip([
    groupIntroText,
    loading
  ])

  const onSendMessage = () => {
    if (sendingMessage.value || !props.groupId) return

    sendingMessage.value = true
    homeTabStore.openMessageWithPeer(props.groupId, SceneType.Group).finally(() => {
      sendingMessage.value = false
    })
  }
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

      &--clickable {
        cursor: pointer;
      }

      &--intro {
        display: -webkit-box;
        height: auto;
        line-height: 1.5;
        color: var(--text-color);
        -webkit-line-clamp: 3;
        line-clamp: 3;
        -webkit-box-orient: vertical;
        white-space: normal;
        text-overflow: unset;
      }
    }

    &__remark-input {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      height: 28px;

      :deep(.n-input) {
        height: 28px;
      }

      :deep(.n-input-wrapper) {
        height: 28px;
        min-height: 28px;
        padding-top: 0;
        padding-bottom: 0;
        box-sizing: border-box;
        justify-content: flex-start;
      }

      :deep(.n-input__input) {
        text-align: left;
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

    &__empty {
      display: flex;
      justify-content: center;
      padding: 12px 0;
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
