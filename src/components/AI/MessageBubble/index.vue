<template>
  <article
    class="ai-message"
    :class="[`ai-message--${role}`, { 'ai-message--streaming': streaming, 'ai-message--rich': rich }]">
    <div class="ai-message__row">
      <div class="ai-message__avatar" :class="`ai-message__avatar--${role}`">
        <Avatar v-if="role === 'user' && userId" :id="userId" class="ai-message__avatar-img" :size="36" round />
        <div v-else-if="role === 'user'" class="ai-message__avatar-user" aria-hidden="true">
          <svg class="size-18px">
            <use href="#user"></use>
          </svg>
        </div>
        <div v-else class="ai-message__avatar-ai" aria-hidden="true">
          <svg class="size-20px">
            <use href="#ai"></use>
          </svg>
        </div>
      </div>

      <div class="ai-message__main">
        <div
          class="ai-message__content"
          :class="{
            'ai-message__content--user': role === 'user',
            'ai-message__content--assistant': role === 'assistant',
            'ai-message__content--streaming': streaming
          }">
          <MessageBody v-if="rich" :content="content" :streaming="streaming" />
          <div v-else class="ai-message__plain">{{ content }}</div>
        </div>

        <footer class="ai-message__actions">
          <n-tooltip placement="top" :show-arrow="false">
            <template #trigger>
              <button type="button" class="ai-message__action-btn" @click="onCopy">
                <svg class="size-15px" aria-hidden="true">
                  <use href="#document"></use>
                </svg>
              </button>
            </template>
            {{ copyLabel }}
          </n-tooltip>

          <n-tooltip v-if="role === 'assistant'" placement="top" :show-arrow="false">
            <template #trigger>
              <button type="button" class="ai-message__action-btn" @click="emit('regenerate')">
                <svg class="size-15px" aria-hidden="true">
                  <use href="#refresh"></use>
                </svg>
              </button>
            </template>
            {{ t('ai.messageBubble.regenerate') }}
          </n-tooltip>
        </footer>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useUserStore } from '@/stores/user'
  import Avatar from '@/components/Avatar.vue'
  import MessageBody from './MessageBody.vue'

  export type AiMessageRole = 'user' | 'assistant'

  const props = withDefaults(
    defineProps<{
      role: AiMessageRole
      content?: string
      rich?: boolean
      streaming?: boolean
    }>(),
    {
      content: '',
      rich: undefined,
      streaming: false
    }
  )

  const emit = defineEmits<{
    regenerate: []
  }>()

  const { t } = useI18n()
  const userStore = useUserStore()

  const userId = computed(() => userStore.authInfo.userId)
  const copied = ref(false)

  const rich = computed(() => {
    if (props.rich !== undefined) return props.rich
    return props.role === 'assistant'
  })

  const copyLabel = computed(() => (copied.value ? t('ai.messageBubble.copied') : t('ai.messageBubble.copy')))

  const onCopy = async () => {
    const text = props.content?.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      window.$message?.success(t('ai.messageBubble.copied'))
      setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch {
      window.$message?.error(t('ai.messageBubble.copyFailed'))
    }
  }
</script>

<style scoped lang="scss">
  .ai-message {
    width: 100%;
    padding: 10px 0;
    box-sizing: border-box;

    &__row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      padding: 0 20px;
      box-sizing: border-box;
    }

    &--user &__row {
      flex-direction: row-reverse;
    }

    &__avatar {
      flex-shrink: 0;
      padding-top: 2px;
    }

    &__avatar-img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      overflow: hidden;
    }

    &__avatar-ai {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(
        145deg,
        color-mix(in srgb, var(--primary-color) 22%, var(--bg-muted-color)),
        color-mix(in srgb, var(--primary-color) 8%, var(--bg-secondary-color))
      );
      border: 1px solid color-mix(in srgb, var(--primary-color) 35%, var(--border-color));
      color: var(--primary-color);
    }

    &__avatar-user {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: color-mix(in srgb, var(--card-bg-color) 90%, var(--bg-muted-color));
      border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
      color: var(--text-secondary-color);
    }

    &__main {
      display: flex;
      flex: 0 1 auto;
      flex-direction: column;
      gap: 6px;
      width: fit-content;
      max-width: 90%;
      min-width: 0;
      box-sizing: border-box;
    }

    &--user &__main {
      align-items: flex-end;
      margin-left: auto;
    }

    &--assistant &__main {
      align-items: flex-start;
    }

    &__content {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      padding: 11px 15px;
      border-radius: 18px;
      border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
      box-shadow: 0 1px 2px color-mix(in srgb, var(--border-color) 25%, transparent);
      box-sizing: border-box;

      &--user {
        background-color: color-mix(in srgb, var(--primary-color) 14%, var(--input-soft-bg));
        border-color: color-mix(in srgb, var(--primary-color) 28%, var(--border-color));
      }

      &--assistant {
        background-color: var(--bg-primary-color);
      }

      &--streaming {
        border-color: color-mix(in srgb, var(--primary-color) 45%, var(--border-color));
      }
    }

    &__plain {
      font-size: 14px;
      line-height: 1.65;
      color: var(--text-color);
      white-space: pre-wrap;
      word-break: break-word;
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: 4px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
      min-height: 28px;
    }

    &:hover &__actions,
    &--streaming &__actions {
      opacity: 1;
      pointer-events: auto;
    }

    &--user &__actions {
      justify-content: flex-end;
    }

    &__action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--text-secondary-color);
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;

      &:hover {
        background-color: var(--icon-hover-color);
        color: var(--text-color);
      }
    }
  }
</style>
