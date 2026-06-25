<template>
  <n-spin :show="loading" class="contacts-profile-spin">
    <n-scrollbar class="contacts-profile__scroll">
      <div class="contacts-profile">
        <div class="contacts-profile__content">
          <div class="contacts-profile__head">
            <Avatar class="size-72px rounded-10px bg-#FFF shrink-0" :id="userId" />
            <div class="min-w-0 flex-1">
              <div class="text-18px font-700 truncate">{{ userInfo?.username ?? '' }}</div>
              <div class="contacts-profile__id truncate">
                <span class="select-none">{{ t('contacts.fields.linyuId') }}</span>
                {{ accountText }}
              </div>
              <div v-if="showMetaRow" class="contacts-profile__meta-row">
                <template v-if="emotionName">
                  <span class="contacts-profile__meta-item">
                    <span>[</span>
                    <img v-if="emotionUrl" class="size-14px" :src="emotionUrl" alt="" />
                    <span>{{ emotionName }}</span>
                    <span>]</span>
                  </span>
                </template>
                <n-divider v-if="emotionName && showGender" vertical class="contacts-profile__meta-divider" />
                <span v-if="showGender" class="contacts-profile__meta-item contacts-profile__gender">
                  <svg v-if="genderIconHref" class="contacts-profile__gender-icon size-14px" :class="genderClass">
                    <use :href="genderIconHref" />
                  </svg>
                  <span>{{ genderLabel }}</span>
                </span>
                <n-divider
                  v-if="(emotionName || showGender) && locationText"
                  vertical
                  class="contacts-profile__meta-divider" />
                <span v-if="locationText" class="contacts-profile__meta-item">{{ locationText }}</span>
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
                <span>{{ t('contacts.fields.remark') }}</span>
              </div>
              <div class="contacts-profile__value-slot">
                <n-input
                  v-if="remarkEditing"
                  ref="remarkInputRef"
                  v-model:value="remarkDraft"
                  size="small"
                  :placeholder="t('contacts.placeholders.setRemark')"
                  :disabled="remarkSaving"
                  class="contacts-profile__remark-input"
                  @blur="commitRemark"
                  @keyup.enter="commitRemark" />
                <span
                  v-else
                  class="contacts-profile__row-value contacts-profile__row-value--clickable"
                  :class="{ 'contacts-profile__placeholder': remarkIsPlaceholder }"
                  @click="startRemarkEdit">
                  {{ remarkIsPlaceholder ? t('contacts.placeholders.setRemark') : remarkText }}
                </span>
              </div>
            </div>

            <div class="contacts-profile__row">
              <div class="contacts-profile__row-label">
                <svg class="size-14px text-[var(--text-muted-color)]">
                  <use href="#user"></use>
                </svg>
                <span>{{ t('contacts.fields.tag') }}</span>
              </div>
              <div class="contacts-profile__value-slot">
                <n-input
                  v-if="tagEditing"
                  ref="tagInputRef"
                  v-model:value="tagDraft"
                  size="small"
                  :placeholder="t('contacts.placeholders.setTag')"
                  :disabled="tagSaving"
                  class="contacts-profile__remark-input"
                  @blur="commitTag"
                  @keyup.enter="commitTag" />
                <span
                  v-else
                  class="contacts-profile__row-value contacts-profile__row-value--clickable"
                  :class="{ 'contacts-profile__placeholder': tagIsPlaceholder }"
                  @click="startTagEdit">
                  {{ tagIsPlaceholder ? t('contacts.placeholders.setTag') : tagText }}
                </span>
              </div>
            </div>

            <div v-if="signatureText" class="contacts-profile__row contacts-profile__row--signature">
              <div class="contacts-profile__row-label">
                <svg class="size-14px text-[var(--text-muted-color)]">
                  <use href="#signature"></use>
                </svg>
                <span>{{ t('contacts.fields.signature') }}</span>
              </div>
              <div class="contacts-profile__value-slot">
                <n-tooltip
                  trigger="hover"
                  placement="top"
                  :disabled="!isSignatureOverflow"
                  :content-style="signatureTooltipStyle">
                  <template #trigger>
                    <span :ref="bindSignatureOverflowRef" class="contacts-profile__row-value">{{ signatureText }}</span>
                  </template>
                  {{ signatureText }}
                </n-tooltip>
              </div>
            </div>

            <div v-if="momentThumbs.length > 0" class="contacts-profile__moments">
              <div class="contacts-profile__row-label">
                <svg class="size-14px text-[var(--text-muted-color)]">
                  <use href="#moment"></use>
                </svg>
                <span>{{ t('contacts.fields.friendMoments') }}</span>
              </div>
              <div class="contacts-profile__thumbs">
                <img
                  v-for="(url, index) in momentThumbs"
                  :key="`${url}-${index}`"
                  class="contacts-profile__thumb"
                  :src="url"
                  alt="" />
              </div>
            </div>
          </div>
        </div>

        <div class="contacts-profile__actions">
          <n-button class="w-110px" round>{{ t('contacts.actions.share') }}</n-button>
          <n-button class="w-110px" round>{{ t('contacts.actions.audioVideo') }}</n-button>
          <n-button class="w-110px" type="primary" round>{{ t('contacts.actions.sendMessage') }}</n-button>
        </div>
      </div>
    </n-scrollbar>
  </n-spin>
</template>

<script setup lang="ts">
  import { useOverflowTooltip } from '@/composables/useOverflowTooltip'
  import { usePeerInfoStore } from '@/stores/peerInfo'
  import type { UserInfoResult } from '@/types/api/user'
  import type { InputInst } from 'naive-ui'
  import type { CSSProperties } from 'vue'
  import { useI18n } from 'vue-i18n'

  const signatureTooltipStyle: CSSProperties = {
    maxWidth: '360px',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    lineHeight: '1.2'
  }

  const props = defineProps<{
    userId: string
  }>()

  const emit = defineEmits<{
    remarkUpdated: [payload: { peerId: string; remark: string }]
    tagUpdated: [payload: { peerId: string; tag: string }]
  }>()

  const { t } = useI18n()
  const peerInfoStore = usePeerInfoStore()

  const userInfo = computed(() => peerInfoStore.read(props.userId, 'user') as UserInfoResult | null)
  const loading = computed(() => !!props.userId && !userInfo.value)
  const remarkEditing = ref(false)
  const remarkDraft = ref('')
  const remarkSaving = ref(false)
  const remarkInputRef = ref<InputInst | null>(null)
  const tagEditing = ref(false)
  const tagDraft = ref('')
  const tagSaving = ref(false)
  const tagInputRef = ref<InputInst | null>(null)

  watch(
    () => props.userId,
    (userId) => {
      remarkEditing.value = false
      tagEditing.value = false
      if (!userId) return
      peerInfoStore.get(userId, 'user')
    },
    { immediate: true }
  )

  const accountText = computed(() => userInfo.value?.account ?? '')

  const remarkText = computed(() => userInfo.value?.remark?.trim() ?? '')
  const remarkIsPlaceholder = computed(() => !remarkText.value)

  const startRemarkEdit = () => {
    if (remarkEditing.value || remarkSaving.value) return
    tagEditing.value = false
    remarkDraft.value = remarkText.value
    remarkEditing.value = true
    nextTick(() => remarkInputRef.value?.focus())
  }

  const commitRemark = async () => {
    if (!remarkEditing.value || remarkSaving.value) return

    const next = remarkDraft.value.trim()
    remarkEditing.value = false

    if (!userInfo.value || next === remarkText.value) return

    remarkSaving.value = true
    try {
      peerInfoStore.patchUser(props.userId, { remark: next })
      emit('remarkUpdated', { peerId: props.userId, remark: next })
    } finally {
      remarkSaving.value = false
    }
  }

  const tagText = computed(() => userInfo.value?.tag?.trim() ?? '')
  const tagIsPlaceholder = computed(() => !tagText.value)

  const startTagEdit = () => {
    if (tagEditing.value || tagSaving.value) return
    remarkEditing.value = false
    tagDraft.value = tagText.value
    tagEditing.value = true
    nextTick(() => tagInputRef.value?.focus())
  }

  const commitTag = async () => {
    if (!tagEditing.value || tagSaving.value) return

    const next = tagDraft.value.trim()
    tagEditing.value = false

    if (!userInfo.value || next === tagText.value) return

    tagSaving.value = true
    try {
      peerInfoStore.patchUser(props.userId, { tag: next })
      emit('tagUpdated', { peerId: props.userId, tag: next })
    } finally {
      tagSaving.value = false
    }
  }

  const signatureText = computed(() => userInfo.value?.signature?.trim() ?? '')
  const { bindTargetRef: bindSignatureOverflowRef, isOverflow: isSignatureOverflow } = useOverflowTooltip([
    signatureText,
    loading
  ])

  const locationText = computed(() => {
    const info = userInfo.value
    if (!info) return ''
    return info.location?.trim() || info.moment?.location?.trim() || ''
  })

  const emotionName = computed(() => userInfo.value?.emotionName?.trim() ?? '')
  const emotionUrl = computed(() => userInfo.value?.emotionUrl ?? '')

  const momentThumbs = computed(() => {
    const media = userInfo.value?.moment?.mediaType
    if (!media?.length) return []
    return media
      .filter((item) => item.mediaType === 'img')
      .sort((a, b) => a.sort - b.sort)
      .map((item) => item.thumbUrl || item.url)
      .slice(0, 4)
  })

  const genderLabel = computed(() => {
    const g = userInfo.value?.gender?.trim()
    if (!g) return ''
    if (g === '女' || g.toLowerCase() === 'female' || g === 'F') return t('contacts.gender.female')
    if (g === '男' || g.toLowerCase() === 'male' || g === 'M') return t('contacts.gender.male')
    return g
  })

  const showGender = computed(() => !!genderLabel.value)

  const genderClass = computed(() => {
    const g = userInfo.value?.gender?.trim().toLowerCase()
    if (g === '女' || g === 'female' || g === 'f') return 'is-female'
    if (g === '男' || g === 'male' || g === 'm') return 'is-male'
    return ''
  })

  const genderIconHref = computed(() => {
    if (genderClass.value === 'is-male') return '#male'
    if (genderClass.value === 'is-female') return '#female'
    return ''
  })

  const showMetaRow = computed(() => !!emotionName.value || showGender.value || !!locationText.value)
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

  .contacts-profile__scroll {
    height: 100%;

    :deep(.n-scrollbar-container) {
      height: 100%;
    }

    :deep(.n-scrollbar-content) {
      box-sizing: border-box;
    }
  }

  .contacts-profile {
    width: 100%;
    min-width: 0;
    max-width: 560px;
    margin: 0 auto;
    box-sizing: border-box;

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

    &__id {
      margin-top: 6px;
      font-size: 13px;
      color: var(--text-muted-color);
    }

    &__meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      font-size: 12px;
      color: var(--text-muted-color);
    }

    &__meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      user-select: none;
    }

    &__meta-divider {
      height: 12px;
      margin: 0 2px;
      background-color: var(--divider-color);
    }

    &__gender-icon {
      flex-shrink: 0;

      &.is-female {
        color: var(--pink);
      }

      &.is-male {
        color: var(--primary-color);
      }
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
      overflow: hidden;
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
    }

    &__value-slot {
      flex: 1 1 0;
      min-width: 0;
      max-width: 60%;
      height: 28px;
      overflow: hidden;
    }

    &__row--signature {
      justify-content: flex-start;
      gap: 20px;

      .contacts-profile__value-slot {
        flex: 1 1 0;
        max-width: none;
      }
    }

    &__row-value {
      display: block;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      height: 28px;
      line-height: 28px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: right;
      color: var(--text-color);
      box-sizing: border-box;

      &--clickable {
        cursor: pointer;
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

      :deep(.n-input__input-el) {
        height: 28px;
        line-height: 28px;
        text-align: left;
        direction: ltr;
      }
    }

    &__placeholder {
      color: var(--text-secondary-color);
      opacity: 0.75;
    }

    &__moments {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    &__thumbs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding-left: 20px;
    }

    &__thumb {
      width: 72px;
      height: 72px;
      border-radius: 6px;
      object-fit: cover;
      background-color: var(--card-bg-color);
    }

    &__actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 40px;
      padding: 0 40px 24px;
      flex-wrap: wrap;
    }
  }
</style>
