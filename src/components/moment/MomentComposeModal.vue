<template>
  <n-modal v-model:show="visible" :mask-closable="!submitting" transform-origin="center" @after-leave="resetForm">
    <div class="moment-compose">
      <template v-if="!showSuccess">
        <div class="moment-compose__header">
          <span class="moment-compose__title">{{ t('moment.compose.title') }}</span>
          <button type="button" class="moment-compose__close" @click="visible = false">
            <svg class="size-18px"><use href="#close"></use></svg>
          </button>
        </div>

        <div class="moment-compose__body">
          <div class="moment-compose__user">
            <Avatar :id="userId" class="size-40px rounded-12px bg-#FFF" />
            <div>
              <div class="moment-compose__name">{{ username }}</div>
              <n-dropdown
                :options="visibilityOptions"
                trigger="click"
                placement="bottom-start"
                @select="onVisibilitySelect">
                <button type="button" class="moment-compose__visibility">
                  <svg class="size-12px">
                    <use :href="`#${visibilityIconName}`" />
                  </svg>
                  <span>{{ selectedVisibilityLabel }}</span>
                </button>
              </n-dropdown>
            </div>
          </div>

          <textarea
            v-model="content"
            class="moment-compose__textarea"
            :placeholder="t('moment.compose.placeholder')"
            :maxlength="maxLength" />

          <div class="moment-compose__media-grid">
            <div v-for="(img, i) in mediaList" :key="i" class="moment-compose__media-item">
              <img :src="img" alt="" />
              <button type="button" class="moment-compose__media-remove" @click="removeMedia(i)">
                <svg class="moment-compose__media-remove-icon">
                  <use href="#close" />
                </svg>
              </button>
            </div>
            <button v-if="mediaList.length < 9" type="button" class="moment-compose__add-media" @click="addDemoMedia">
              <svg class="size-24px">
                <use href="#image"></use>
              </svg>
              <span>{{ t('moment.compose.addImage') }}</span>
            </button>
          </div>
        </div>

        <div class="moment-compose__footer">
          <div class="moment-compose__tools">
            <n-tooltip v-for="tool in composeTools" :key="tool.key" :show-arrow="false">
              <template #trigger>
                <button type="button" class="moment-compose__tool" @click="onToolClick(tool.key)">
                  <svg class="size-20px">
                    <use :href="`#${tool.icon}`" />
                  </svg>
                </button>
              </template>
              {{ tool.label }}
            </n-tooltip>
          </div>
          <div class="flex items-center">
            <span class="moment-compose__count">{{ content.length }}/{{ maxLength }}</span>
            <n-button type="primary" round :disabled="!canSubmit" :loading="submitting" @click="submit">
              {{ t('moment.compose.submit') }}
            </n-button>
          </div>
        </div>
      </template>

      <div v-else class="moment-compose__success">
        <div class="moment-compose__success-icon">
          <svg class="size-32px">
            <use href="#check" />
          </svg>
        </div>
        <div class="moment-compose__success-text">{{ t('moment.compose.successTitle') }}</div>
        <div class="moment-compose__success-sub">{{ t('moment.compose.successSub') }}</div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import type { MomentVisibleType } from '@/types/api/moment'
  import { useI18n } from 'vue-i18n'

  const visible = defineModel<boolean>('show', { default: false })

  defineProps<{
    userId: string
    username: string
  }>()

  const emit = defineEmits<{
    submit: [payload: { content: string; visibility: MomentVisibleType; images: string[] }]
  }>()

  const { t } = useI18n()
  const maxLength = 500
  const content = ref('')
  const visibility = ref<MomentVisibleType>('all')
  const mediaList = ref<string[]>([])
  const submitting = ref(false)
  const showSuccess = ref(false)

  const canSubmit = computed(() => content.value.trim().length > 0 && !submitting.value)

  const visibilityOptions = computed(() => [
    { label: () => t('moment.visibility.all'), key: 'all' },
    { label: () => t('moment.visibility.private'), key: 'private' },
    { label: () => t('moment.visibility.include'), key: 'include' },
    { label: () => t('moment.visibility.exclude'), key: 'exclude' }
  ])

  const selectedVisibilityLabel = computed(() => {
    const map: Record<MomentVisibleType, string> = {
      all: t('moment.visibility.all'),
      private: t('moment.visibility.private'),
      include: t('moment.visibility.include'),
      exclude: t('moment.visibility.exclude')
    }
    return map[visibility.value]
  })

  const visibilityIconMap: Record<MomentVisibleType, string> = {
    all: 'visibility-all',
    private: 'visibility-private',
    include: 'visibility-include',
    exclude: 'visibility-exclude'
  }

  const visibilityIconName = computed(() => visibilityIconMap[visibility.value])

  const composeTools = computed(() => [
    { key: 'image', label: t('moment.compose.tools.image'), icon: 'image' },
    { key: 'location', label: t('moment.compose.tools.location'), icon: 'location' },
    { key: 'emoji', label: t('moment.compose.tools.emoji'), icon: 'emotion' }
  ])

  const onVisibilitySelect = (key: string) => {
    visibility.value = key as MomentVisibleType
  }

  const demoImages = [
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop'
  ]

  const addDemoMedia = () => {
    const next = demoImages[mediaList.value.length % demoImages.length]
    mediaList.value.push(next)
  }

  const removeMedia = (index: number) => {
    mediaList.value.splice(index, 1)
  }

  const onToolClick = (key: string) => {
    if (key === 'image') addDemoMedia()
    else if (key === 'topic' && !content.value.includes('#')) content.value += ' #'
    else window.$message.info(t('moment.compose.tools.todo'))
  }

  const submit = () => {
    if (!canSubmit.value) return
    submitting.value = true
    emit('submit', {
      content: content.value.trim(),
      visibility: visibility.value,
      images: [...mediaList.value]
    })
    setTimeout(() => {
      submitting.value = false
      showSuccess.value = true
      setTimeout(() => {
        visible.value = false
      }, 1200)
    }, 400)
  }

  const resetForm = () => {
    content.value = ''
    visibility.value = 'all'
    mediaList.value = []
    showSuccess.value = false
    submitting.value = false
  }
</script>

<style scoped lang="scss">
  .moment-compose {
    width: 560px;
    max-width: 90vw;
    background: var(--bg-primary-color);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    overflow: hidden;

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
    }

    &__title {
      font-size: 17px;
      font-weight: 600;
      color: var(--text-color);
    }

    &__close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      cursor: pointer;
      color: var(--text-muted-color);
      border: none;
      background: transparent;
      transition: all 0.15s;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 80%, transparent);
        color: var(--text-color);
      }
    }

    &__body {
      padding: 20px 24px;
    }

    &__user {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    &__name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-color);
    }

    &__visibility {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
      font-size: 12px;
      color: var(--text-muted-color);
      cursor: pointer;
      padding: 3px 8px;
      border-radius: 6px;
      border: none;
      background: transparent;
      transition: background 0.15s;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 80%, transparent);
      }
    }

    &__textarea {
      width: 100%;
      min-height: 140px;
      background: transparent;
      border: none;
      outline: none;
      font-size: 15px;
      line-height: 1.7;
      color: var(--text-color);
      font-family: inherit;
      resize: vertical;

      &::placeholder {
        color: var(--text-muted-color);
      }
    }

    &__media-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 12px;
    }

    &__media-item {
      aspect-ratio: 1;
      border-radius: 12px;
      overflow: hidden;
      position: relative;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    &__media-remove {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 24px;
      height: 24px;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      &-icon {
        width: 14px;
        height: 14px;
        color: #fff;
      }
    }

    &__add-media {
      aspect-ratio: 1;
      border-radius: 12px;
      border: 2px dashed var(--border-color);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
      color: var(--text-muted-color);
      background: transparent;
      transition: all 0.15s;

      &:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      span {
        font-size: 11px;
      }
    }

    &__footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    &__tools {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    &__tool {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      cursor: pointer;
      color: var(--text-muted-color);
      border: none;
      background: transparent;
      transition: all 0.15s;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 80%, transparent);
        color: var(--primary-color);
      }
    }

    &__count {
      font-size: 12px;
      color: var(--text-muted-color);
      margin-right: 12px;
    }

    &__success {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      text-align: center;
    }

    &__success-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color), var(--primary-soft-color));
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      color: #fff;
      animation: momentSuccessPop 0.4s ease;
    }

    &__success-text {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 4px;
    }

    &__success-sub {
      font-size: 13px;
      color: var(--text-muted-color);
    }
  }

  @keyframes momentSuccessPop {
    0% {
      transform: scale(0);
    }
    60% {
      transform: scale(1.15);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
