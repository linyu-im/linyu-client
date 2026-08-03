<template>
  <n-drawer :show="show" :width="430" placement="right" @update:show="emit('update:show', $event)">
    <n-drawer-content v-if="item" closable>
      <template #header>
        <span>{{ t('application.detail.title') }}</span>
      </template>

      <div class="plugin-detail">
        <div class="plugin-detail__hero">
          <div class="plugin-detail__icon" :class="{ 'plugin-detail__icon-image': Boolean(item.iconUrl.trim()) }">
            <img v-if="item.iconUrl.trim()" :src="item.iconUrl" alt="" />
            <span v-else>{{ item.name.slice(0, 2) }}</span>
          </div>
          <div class="plugin-detail__identity">
            <h2>{{ item.name }}</h2>
            <p>{{ t('application.detail.publisher', { name: item.author }) }}</p>
          </div>
        </div>

        <p class="plugin-detail__description">{{ item.description }}</p>

        <div class="plugin-detail__facts">
          <div>
            <span>{{ t('application.detail.version') }}</span>
            <strong>{{ item.version }}</strong>
          </div>
          <div>
            <span>{{ t('application.detail.source') }}</span>
            <strong>{{ t(`application.source.${item.source}`) }}</strong>
          </div>
          <div>
            <span>{{ t('application.detail.status') }}</span>
            <strong>{{ t(`application.status.${item.status}`) }}</strong>
          </div>
        </div>

        <section class="plugin-detail__section">
          <h3>{{ t('application.detail.permissions') }}</h3>
          <div v-if="item.permissions.length > 0" class="plugin-detail__permissions">
            <div v-for="permission in item.permissions" :key="permission.name" class="plugin-detail__permission">
              <svg><use href="#check" /></svg>
              <div>
                <strong>{{ permissionTitle(permission.name) }}</strong>
                <p>{{ permissionDescription(permission.name) }}</p>
                <span v-if="permission.scope">{{ formatScope(permission.scope) }}</span>
              </div>
            </div>
          </div>
          <p v-else class="plugin-detail__muted">{{ t('application.detail.noPermissions') }}</p>
        </section>

        <section v-if="item.windows?.length" class="plugin-detail__section">
          <h3>{{ t('application.detail.windows') }}</h3>
          <div class="plugin-detail__windows">
            <div v-for="window in item.windows" :key="window.id" class="plugin-detail__window">
              <div>
                <strong>{{ window.title || window.id }}</strong>
                <span>{{ window.size.width }} × {{ window.size.height }}</span>
              </div>
              <p>
                {{ t(`application.windowMode.${window.decorations.mode}`) }} ·
                {{ window.behavior.resizable ? t('application.window.resizable') : t('application.window.fixed') }}
              </p>
            </div>
          </div>
        </section>

        <section v-if="item.developmentPath" class="plugin-detail__section">
          <h3>{{ t('application.detail.developmentPath') }}</h3>
          <code>{{ item.developmentPath }}</code>
        </section>
      </div>

      <template #footer>
        <div v-if="item" class="plugin-detail__footer">
          <n-button v-if="item.status === 'available'" size="small" :loading="item.busy" @click="emit('install', item)">
            {{ t('application.actions.install') }}
          </n-button>
          <template v-else>
            <n-button
              v-if="item.status === 'development'"
              size="small"
              :loading="item.exporting"
              :disabled="item.busy && !item.exporting"
              @click="emit('export', item)">
              {{ t('application.actions.export') }}
            </n-button>
            <n-button v-if="item.enabled" size="small" :disabled="item.busy" @click="emit('open', item)">
              {{ t('application.actions.open') }}
            </n-button>
            <n-button v-else size="small" :loading="item.busy" @click="emit('toggle', item, true)">
              {{ t('application.actions.enable') }}
            </n-button>
            <n-button size="small" :disabled="item.busy" @click="emit('uninstall', item)">
              {{ item.status === 'development' ? t('application.actions.unload') : t('application.actions.uninstall') }}
            </n-button>
          </template>
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
  import type { PluginCardModel } from '@/types/plugin'
  import { useI18n } from 'vue-i18n'

  defineProps<{
    show: boolean
    item: PluginCardModel | null
  }>()

  const emit = defineEmits<{
    'update:show': [show: boolean]
    install: [item: PluginCardModel]
    export: [item: PluginCardModel]
    open: [item: PluginCardModel]
    uninstall: [item: PluginCardModel]
    toggle: [item: PluginCardModel, enabled: boolean]
  }>()

  const { t } = useI18n()

  const permissionTitle = (name: string) => {
    const key = `application.permissions.${name.replace(/\./g, '_')}.title`
    const value = t(key)
    return value === key ? name : value
  }

  const permissionDescription = (name: string) => {
    const key = `application.permissions.${name.replace(/\./g, '_')}.description`
    const value = t(key)
    return value === key ? t('application.permissions.defaultDescription') : value
  }

  const formatScope = (scope: unknown) => {
    if (typeof scope === 'string') return scope
    try {
      return JSON.stringify(scope)
    } catch {
      return ''
    }
  }
</script>

<style scoped lang="scss">
  .plugin-detail {
    color: var(--text-color);

    &__hero {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    &__icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 14px;
      overflow: hidden;
      color: var(--text-on-primary-color);
      background: linear-gradient(145deg, var(--primary-soft-color), var(--primary-color));
      font-size: 14px;
      font-weight: 700;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        padding: 8px;
        box-sizing: border-box;
      }
    }

    &__icon-image {
      border: 1px solid var(--border-color);
      background: var(--bg-secondary-color);
    }

    &__identity {
      min-width: 0;

      h2 {
        margin: 0;
        font-size: 18px;
      }

      p {
        margin: 5px 0 0;
        color: var(--text-secondary-color);
        font-size: 12px;
      }
    }

    &__description {
      margin: 20px 0;
      color: var(--text-secondary-color);
      font-size: 13px;
      line-height: 1.7;
    }

    &__facts {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;

      div {
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 10px;
        border-radius: 8px;
        background-color: var(--bg-secondary-color);
      }

      span {
        color: var(--text-secondary-color);
        font-size: 10px;
      }

      strong {
        overflow: hidden;
        font-size: 12px;
        font-weight: 500;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    &__section {
      margin-top: 24px;

      h3 {
        margin: 0 0 12px;
        font-size: 13px;
        font-weight: 600;
      }

      code {
        display: block;
        padding: 10px 12px;
        border-radius: 8px;
        overflow-wrap: anywhere;
        color: var(--text-secondary-color);
        background-color: var(--bg-secondary-color);
        font-size: 11px;
      }
    }

    &__permissions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &__permission {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      padding: 11px;
      border: 1px solid var(--border-color);
      border-radius: 8px;

      svg {
        flex-shrink: 0;
        width: 15px;
        height: 15px;
        margin-top: 2px;
        color: var(--primary-color);
      }

      strong {
        font-size: 12px;
      }

      p {
        margin: 3px 0 0;
        color: var(--text-secondary-color);
        font-size: 11px;
        line-height: 1.5;
      }

      span {
        display: block;
        margin-top: 4px;
        color: var(--primary-color);
        font-size: 10px;
      }
    }

    &__muted {
      color: var(--text-secondary-color);
      font-size: 12px;
    }

    &__windows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &__window {
      padding: 11px;
      border: 1px solid var(--border-color);
      border-radius: 8px;

      div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }

      strong {
        font-size: 12px;
      }

      span,
      p {
        color: var(--text-secondary-color);
        font-size: 11px;
      }

      p {
        margin: 5px 0 0;
      }
    }

    &__footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      width: 100%;
    }
  }
</style>
