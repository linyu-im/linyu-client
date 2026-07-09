<template>
  <n-modal v-model:show="visible" :mask-closable="true" transform-origin="center" @after-leave="resetForm">
    <div class="add-group-modal">
      <div class="add-group-modal__header">
        <h2 class="add-group-modal__title">{{ t('addContacts.group.applyModal.title') }}</h2>
        <button
          type="button"
          class="add-group-modal__close"
          :aria-label="t('addContacts.group.applyModal.cancel')"
          @click="onCancel">
          <svg class="size-14px" aria-hidden="true">
            <use href="#close" />
          </svg>
        </button>
      </div>

      <div v-if="group" class="add-group-modal__body">
        <div class="add-group-modal__profile">
          <Avatar class="add-group-modal__avatar shrink-0" :id="group.id" type="group" round />
          <div class="add-group-modal__profile-main min-w-0">
            <div class="add-group-modal__profile-name">
              {{ group.name }}
            </div>
            <div class="add-group-modal__profile-number">{{ group.groupNumber }}</div>
          </div>
        </div>

        <div class="add-group-modal__field">
          <n-input
            v-model:value="describe"
            type="textarea"
            class="add-group-modal__textarea"
            :placeholder="t('addContacts.group.applyModal.placeholder')"
            :autosize="{ minRows: 4, maxRows: 6 }" />
        </div>
      </div>

      <div class="add-group-modal__footer">
        <n-button class="add-group-modal__btn" @click="onCancel">
          {{ t('addContacts.group.applyModal.cancel') }}
        </n-button>
        <n-button class="add-group-modal__btn" type="primary" :loading="submitting" @click="onSubmit">
          {{ t('addContacts.group.applyModal.send') }}
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { applyApi } from '@/api'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import { ApplySourceEnum } from '@/constants/apply'
  import type { Group } from '@/types/api/group'

  const visible = defineModel<boolean>('show', { default: false })

  const props = defineProps<{
    group: Group | null
  }>()

  const { t } = useI18n()

  const describe = ref('')
  const submitting = ref(false)

  useEscapeOverlay(() => {
    visible.value = false
  }, visible)

  const resetForm = () => {
    describe.value = ''
    submitting.value = false
  }

  const onCancel = () => {
    visible.value = false
  }

  const onSubmit = () => {
    if (submitting.value || !props.group) return

    submitting.value = true
    applyApi
      .addGroup({
        groupId: props.group.id,
        describe: describe.value.trim(),
        applySource: ApplySourceEnum.Search
      })
      .then((res) => {
        if (res.code === 0) {
          window.$message.success(t('addContacts.group.applyModal.success'))
          visible.value = false
          return
        }
        window.$message.error(res.msg)
      })
      .finally(() => {
        submitting.value = false
      })
  }
</script>

<style scoped lang="scss">
  .add-group-modal {
    width: 360px;
    max-width: calc(100vw - 32px);
    border-radius: 10px;
    background: var(--bg-primary-color);
    border: 1px solid var(--border-color);
    overflow: hidden;

    &__header {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 44px;
      padding: 0 40px;
      border-bottom: 1px solid var(--divider-color);
    }

    &__title {
      margin: 0;
      font-size: 15px;
      font-weight: 500;
      line-height: 1.4;
      color: var(--text-color);
    }

    &__close {
      position: absolute;
      top: 50%;
      right: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      margin-top: -14px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text-secondary-color);
      cursor: pointer;

      &:hover {
        background: var(--bg-secondary-color);
        color: var(--text-color);
      }
    }

    &__body {
      padding: 20px 20px 0;
    }

    &__profile {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    &__avatar {
      width: 48px;
      height: 48px;
    }

    &__profile-main {
      flex: 1;
      min-width: 0;
    }

    &__profile-name {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.4;
      color: var(--text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__profile-number {
      margin-top: 4px;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-secondary-color);
    }

    &__field {
      margin-top: 20px;
    }

    &__textarea {
      --n-color: var(--input-soft-bg);
      --n-color-focus: var(--input-soft-bg);
      --n-border: 1px solid transparent;
      --n-border-hover: 1px solid transparent;
      --n-border-focus: 1px solid transparent;
      --n-box-shadow-focus: none;
      --n-text-color: var(--text-color);
      --n-placeholder-color: var(--text-secondary-color);
      --n-border-radius: 8px;

      :deep(.n-input-wrapper) {
        padding: 10px 12px;
        background-color: var(--input-soft-bg);
        border-radius: 8px;
      }

      :deep(.n-input__textarea-el) {
        font-size: 14px;
        line-height: 1.5;
      }
    }

    &__footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      padding: 20px;
    }

    &__btn {
      min-width: 72px;
      height: 34px;
      padding: 0 18px;
      border-radius: 8px;
      font-size: 14px;
    }
  }
</style>
