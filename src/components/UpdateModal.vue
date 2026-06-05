<template>
  <n-modal v-model:show="visible" :mask-closable="false" transform-origin="center">
    <div class="update-modal">
      <div class="update-modal__decor">
        <div class="update-modal__decor-circle update-modal__decor-circle--1" />
        <div class="update-modal__decor-circle update-modal__decor-circle--2" />
      </div>
      <div class="update-modal__header">
        <div class="update-modal__title">{{ t('update.title') }}</div>
        <div class="update-modal__subtitle">
          {{ t('update.versionDownloaded', { version }) }}
        </div>
      </div>
      <div v-if="description" class="update-modal__desc">{{ description }}</div>
      <div v-if="changelog.length > 0" class="update-modal__changelog">
        <div v-for="(group, gIdx) in changelog" :key="gIdx" class="update-modal__changelog-group">
          <div class="update-modal__changelog-category">{{ group.category }}</div>
          <ul class="update-modal__changelog-list">
            <li v-for="(item, iIdx) in group.items" :key="iIdx" class="update-modal__changelog-item">
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
      <div class="update-modal__footer">
        <n-button size="medium" :bordered="false" @click="onLater">
          {{ t('update.later') }}
        </n-button>
        <n-button type="primary" size="medium" @click="onUpdate">
          {{ t('update.now') }}
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'

  export interface ChangelogGroup {
    category: string
    items: string[]
  }

  const visible = defineModel<boolean>('show', { default: false })

  withDefaults(
    defineProps<{
      version?: string
      description?: string
      changelog?: ChangelogGroup[]
    }>(),
    {
      version: '1.0.1',
      description:
        '为了提供更流畅、更安全的即时通讯体验，我们对消息收发、群组管理和文件传输等核心功能进行了全面优化，建议尽快升级到最新版本。',
      changelog: () => []
    }
  )

  const emit = defineEmits<{
    update: []
    later: []
  }>()

  const { t } = useI18n()

  const onUpdate = () => {
    visible.value = false
    emit('update')
  }

  const onLater = () => {
    visible.value = false
    emit('later')
  }
</script>

<style scoped lang="scss">
  .update-modal {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 440px;
    max-width: 90vw;
    background: var(--bg-primary-color);
    border-radius: 12px;
    overflow: hidden;

    &__decor {
      position: absolute;
      top: -20px;
      right: -20px;
      width: 120px;
      height: 120px;
      pointer-events: none;
      z-index: 0;
    }

    &__decor-circle {
      position: absolute;
      border-radius: 50%;

      &--1 {
        width: 80px;
        height: 80px;
        top: 0;
        right: 20px;
        background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.15), rgba(var(--primary-rgb), 0.05));
      }

      &--2 {
        width: 60px;
        height: 60px;
        top: 30px;
        right: 0;
        background: linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(168, 85, 247, 0.06));
      }
    }

    &__header {
      position: relative;
      z-index: 1;
      flex-shrink: 0;
      padding: 28px 28px 0;
    }

    &__title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-color);
      line-height: 1.4;
    }

    &__subtitle {
      margin-top: 6px;
      font-size: 13px;
      color: var(--text-secondary-color);
      line-height: 1.5;
    }

    &__desc {
      position: relative;
      z-index: 1;
      padding: 16px 28px;
      font-size: 13px;
      color: var(--text-muted-color);
      line-height: 1.7;
    }

    &__changelog {
      position: relative;
      z-index: 1;
      margin: 0 28px;
      padding: 16px 20px;
      background: var(--bg-muted-color);
      border-radius: 10px;
    }

    &__changelog-group {
      & + & {
        margin-top: 12px;
      }
    }

    &__changelog-category {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
      line-height: 1.5;
    }

    &__changelog-list {
      margin: 8px 0 0;
      padding-left: 18px;
      list-style: disc;
    }

    &__changelog-item {
      font-size: 13px;
      color: var(--text-muted-color);
      line-height: 1.7;

      & + & {
        margin-top: 2px;
      }
    }

    &__footer {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 20px 28px 24px;
    }
  }
</style>
