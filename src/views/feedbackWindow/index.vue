<template>
  <div class="feedback-window">
    <ToolBar class="feedback-window__toolbar" @maximized="(is) => (isMaximized = is)">
      <div class="flex-1" />
      <div class="flex">
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton
          :href="isMaximized ? '#restore' : '#maximize'"
          @click="() => restoreOrMaximizeCurrentWindow().then((v) => (isMaximized = !v))" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="closeCurrentWindow" />
      </div>
    </ToolBar>

    <div class="feedback-window__body">
      <div class="feedback-window__content">
        <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" class="feedback-window__form">
          <n-form-item :label="t('feedback.fieldTitle')" path="title" required>
            <n-input
              v-model:value="form.title"
              class="feedback-window__input"
              :placeholder="t('feedback.fieldTitlePlaceholder')"
              maxlength="100"
              show-count
              clearable />
          </n-form-item>

          <n-form-item :label="t('feedback.fieldDescription')" path="description" required>
            <n-input
              v-model:value="form.description"
              class="feedback-window__input feedback-window__input--textarea"
              type="textarea"
              :autosize="{ minRows: 4, maxRows: 4 }"
              :placeholder="t('feedback.fieldDescriptionPlaceholder')"
              :maxlength="maxLength"
              show-count />
          </n-form-item>

          <n-form-item path="images">
            <template #label>
              <span>
                {{ t('feedback.fieldImages') }}
                <span class="feedback-window__image-count">
                  {{ t('feedback.fieldImagesCount', { count: imageList.length }) }}
                </span>
              </span>
            </template>
            <div class="feedback-window__images">
              <div v-for="(img, index) in imageList" :key="index" class="feedback-window__image-item">
                <img :src="img" alt="" />
                <button type="button" class="feedback-window__image-remove" @click="removeImage(index)">
                  <svg class="size-14px">
                    <use href="#close" />
                  </svg>
                </button>
              </div>
              <button
                v-if="imageList.length < maxImages"
                type="button"
                class="feedback-window__image-add"
                :disabled="uploadingImage"
                @click="pickAndUploadImage">
                <svg class="size-20px">
                  <use href="#plus" />
                </svg>
                <span>{{ uploadingImage ? t('feedback.uploading') : t('feedback.uploadPhoto') }}</span>
              </button>
            </div>
          </n-form-item>
        </n-form>
      </div>

      <div class="feedback-window__footer">
        <n-button class="w-80px" type="primary" :loading="submitting" :disabled="!canSubmit" @click="onSubmit">
          {{ t('feedback.submit') }}
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { open } from '@tauri-apps/plugin-dialog'
  import type { FormInst, FormRules } from 'naive-ui'
  import { feedbackApi } from '@/api'
  import {
    closeCurrentWindow,
    minimizeCurrentWindow,
    restoreOrMaximizeCurrentWindow,
    ShowCurrentWindow
  } from '@/utils/window'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const isMaximized = ref(false)
  const formRef = ref<FormInst | null>(null)
  const maxLength = 500
  const maxImages = 5
  const submitting = ref(false)
  const uploadingImage = ref(false)

  const form = reactive({
    title: '',
    description: ''
  })

  const imageList = ref<string[]>([])

  const rules = computed<FormRules>(() => ({
    title: [
      {
        required: true,
        message: t('feedback.validation.titleRequired'),
        trigger: ['input', 'blur']
      }
    ],
    description: [
      {
        required: true,
        message: t('feedback.validation.descriptionRequired'),
        trigger: ['input', 'blur']
      }
    ]
  }))

  const canSubmit = computed(() => {
    return (
      form.title.trim().length > 0 && form.description.trim().length > 0 && !submitting.value && !uploadingImage.value
    )
  })

  const uploadImagesSequentially = (paths: string[], index = 0) => {
    if (index >= paths.length) {
      uploadingImage.value = false
      return
    }

    feedbackApi.uploadImage(paths[index]).then((res) => {
      if (res.code === 0 && res.data) {
        imageList.value.push(res.data)
        uploadImagesSequentially(paths, index + 1)
        return
      }

      uploadingImage.value = false
      window.$message.error(res.msg || t('feedback.uploadFailed'))
    })
  }

  const pickAndUploadImage = () => {
    const remaining = maxImages - imageList.value.length
    if (remaining <= 0 || uploadingImage.value) return

    open({
      multiple: true,
      title: t('feedback.uploadPhoto'),
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
    }).then((selected) => {
      if (!selected) return

      const paths = (Array.isArray(selected) ? selected : [selected]).slice(0, remaining)
      uploadingImage.value = true
      uploadImagesSequentially(paths)
    })
  }

  const removeImage = (index: number) => {
    imageList.value.splice(index, 1)
  }

  const resetForm = () => {
    form.title = ''
    form.description = ''
    imageList.value = []
  }

  const onSubmit = () => {
    formRef.value
      ?.validate()
      .then(() => {
        submitting.value = true
        feedbackApi
          .create({
            title: form.title.trim(),
            description: form.description.trim(),
            images: imageList.value
          })
          .then((res) => {
            submitting.value = false
            if (res.code === 0) {
              window.$message.success(t('feedback.submitSuccess'))
              resetForm()
              closeCurrentWindow()
              return
            }
            window.$message.error(res.msg || t('feedback.submitFailed'))
          })
      })
      .catch(() => {})
  }

  onMounted(() => {
    nextTick(() => {
      ShowCurrentWindow()
    })
  })
</script>

<style scoped lang="scss">
  .feedback-window {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    color: var(--text-color);
    background: var(--bg-primary-color);
    user-select: none;

    &__toolbar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      height: 38px;
      padding: 0 3px;
    }

    &__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: 16px 32px 20px;
    }

    &__content {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    &__form {
      :deep(.n-form-item) {
        margin-bottom: 16px;

        &:last-child {
          margin-bottom: 0;
        }
      }

      :deep(.n-form-item-label) {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-color);
        padding-bottom: 8px;
      }

      :deep(.n-form-item-label__asterisk) {
        color: var(--red);
      }
    }

    &__input {
      --n-color: var(--input-soft-bg);
      --n-color-focus: var(--input-soft-bg);
      --n-color-disabled: var(--input-soft-bg);
      --n-border: 1px solid var(--border-color);
      --n-border-hover: 1px solid var(--primary-color);
      --n-border-focus: 1px solid var(--primary-color);
      --n-box-shadow-focus: 0 0 0 1px rgba(var(--primary-rgb), 0.3);
      --n-caret-color: var(--primary-color);
      --n-text-color: var(--text-color);
      --n-placeholder-color: var(--text-secondary-color);
      --n-count-text-color: var(--text-secondary-color);

      :deep(.n-input-wrapper) {
        background-color: var(--input-soft-bg);
      }

      &:hover :deep(.n-input-wrapper),
      &.n-input--focus :deep(.n-input-wrapper) {
        background-color: var(--input-soft-bg);
      }

      :deep(.n-input__input-el),
      :deep(.n-input__textarea-el) {
        background-color: transparent;
        font-size: 14px;
        color: var(--text-color);

        &::placeholder {
          color: var(--text-secondary-color);
        }
      }

      &--textarea {
        :deep(.n-input__textarea-el) {
          line-height: 1.6;
        }
      }
    }

    &__image-count {
      margin-left: 4px;
      font-weight: 400;
      color: var(--text-secondary-color);
    }

    &__images {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    &__image-item {
      position: relative;
      width: 80px;
      height: 80px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    &__image-remove {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      border: none;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease;

      &:hover {
        background: rgba(0, 0, 0, 0.75);
      }
    }

    &__image-add {
      width: 80px;
      height: 80px;
      border: 1px dashed var(--border-color);
      border-radius: 8px;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      color: var(--text-secondary-color);
      transition:
        border-color 0.15s ease,
        color 0.15s ease;

      &:hover:not(:disabled) {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      span {
        font-size: 12px;
      }
    }

    &__footer {
      flex-shrink: 0;
      display: flex;
      justify-content: flex-end;
      padding-top: 16px;
    }
  }
</style>
