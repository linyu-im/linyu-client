<template>
  <article class="plugin-card" tabindex="0" @click="emit('select', item)" @keydown.enter="emit('select', item)">
    <div class="plugin-card__header">
      <div class="plugin-card__icon" :class="{ 'plugin-card__icon-image': Boolean(item.iconUrl.trim()) }">
        <img v-if="item.iconUrl.trim()" :src="item.iconUrl" alt="" />
        <span v-else>{{ item.name.slice(0, 2) }}</span>
      </div>

      <div class="plugin-card__identity">
        <div class="plugin-card__name-row">
          <span class="plugin-card__name" :title="item.name">{{ item.name }}</span>
          <span class="plugin-card__version">v{{ item.version }}</span>
        </div>
        <div class="plugin-card__meta">
          <span>{{ t(`application.source.${item.source}`) }}</span>
          <span class="plugin-card__separator">·</span>
          <span :title="item.author">{{ item.author }}</span>
        </div>
      </div>

      <span class="plugin-card__status" :data-status="item.status">
        {{ t(`application.status.${item.status}`) }}
      </span>
    </div>

    <p class="plugin-card__description" :title="item.description">{{ item.description }}</p>

    <div v-if="item.developmentPath" class="plugin-card__directory" :title="item.developmentPath">
      <span class="plugin-card__directory-label">{{ t('application.detail.developmentPath') }}</span>
      <span class="plugin-card__directory-path">{{ item.developmentPath }}</span>
    </div>

    <div v-else-if="item.tags.length > 0" class="plugin-card__tags">
      <span v-for="tag in item.tags.slice(0, 3)" :key="tag" class="plugin-card__tag">{{ tag }}</span>
    </div>

    <div class="plugin-card__footer">
      <div class="plugin-card__metrics">
        <template v-if="item.score !== undefined">
          <span>
            <svg><use href="#five-star" /></svg>
            {{ item.score }}
          </span>
        </template>
        <template v-if="item.getCount !== undefined">
          <span>
            <svg><use href="#download" /></svg>
            {{ item.getCount }}
          </span>
        </template>
      </div>

      <div class="plugin-card__actions" @click.stop>
        <n-button
          v-if="item.status === 'available'"
          size="small"
          type="primary"
          :loading="item.busy"
          @click="emit('install', item)">
          {{ t('application.actions.install') }}
        </n-button>
        <template v-else>
          <n-button
            v-if="item.status === 'update-available'"
            size="small"
            :loading="item.busy"
            @click="emit('update', item)">
            {{ t('application.actions.update') }}
          </n-button>
          <n-button
            v-if="item.status === 'development'"
            size="small"
            :loading="item.reloading"
            :disabled="item.busy && !item.reloading"
            @click="emit('reload', item)">
            {{ t('application.actions.reload') }}
          </n-button>
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
    </div>
  </article>
</template>

<script setup lang="ts">
  import type { PluginCardModel } from '@/types/plugin'
  import { useI18n } from 'vue-i18n'

  defineProps<{
    item: PluginCardModel
  }>()

  const emit = defineEmits<{
    select: [item: PluginCardModel]
    install: [item: PluginCardModel]
    reload: [item: PluginCardModel]
    export: [item: PluginCardModel]
    open: [item: PluginCardModel]
    uninstall: [item: PluginCardModel]
    update: [item: PluginCardModel]
    toggle: [item: PluginCardModel, enabled: boolean]
  }>()

  const { t } = useI18n()
</script>

<style scoped lang="scss">
  .plugin-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding: 16px;
    border: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);
    border-radius: 12px;
    background-color: var(--content-card-bg);
    cursor: pointer;
    outline: none;
    transition: border-color 0.16s ease;

    &:hover,
    &:focus-visible {
      border-color: color-mix(in srgb, var(--primary-color) 45%, var(--border-color));
    }

    &__header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      min-width: 0;
    }

    &__icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 46px;
      height: 46px;
      border-radius: 11px;
      overflow: hidden;
      color: var(--text-on-primary-color);
      background: linear-gradient(145deg, var(--primary-soft-color), var(--primary-color));
      font-size: 12px;
      font-weight: 700;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        padding: 6px;
        box-sizing: border-box;
      }
    }

    &__icon-image {
      border: 1px solid var(--border-color);
      background: var(--bg-secondary-color);
    }

    &__identity {
      flex: 1;
      min-width: 0;
    }

    &__name-row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    &__name {
      overflow: hidden;
      color: var(--text-color);
      font-size: 14px;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__version {
      flex-shrink: 0;
      color: var(--text-muted-color);
      font-size: 10px;
    }

    &__meta {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 5px;
      overflow: hidden;
      color: var(--text-muted-color);
      font-size: 11px;
      white-space: nowrap;

      span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    &__separator {
      opacity: 0.6;
    }

    &__status {
      flex-shrink: 0;
      padding: 3px 7px;
      border-radius: 999px;
      color: var(--text-muted-color);
      background-color: var(--button-soft-bg);
      font-size: 10px;

      &[data-status='installed'],
      &[data-status='development'] {
        color: var(--primary-color);
        background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);
      }

      &[data-status='update-available'] {
        color: var(--primary-strong-color);
        background-color: color-mix(in srgb, var(--primary-soft-color) 18%, transparent);
      }
    }

    &__description {
      min-height: 36px;
      margin: 0;
      overflow: hidden;
      color: var(--text-muted-color);
      display: -webkit-box;
      font-size: 12px;
      line-height: 1.5;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    &__tags {
      display: flex;
      gap: 6px;
      min-height: 20px;
      overflow: hidden;
    }

    &__tag {
      padding: 2px 7px;
      border-radius: 5px;
      color: var(--primary-color);
      background-color: color-mix(in srgb, var(--primary-color) 8%, transparent);
      font-size: 10px;
      white-space: nowrap;
    }

    &__directory {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      min-height: 20px;
      color: var(--text-muted-color);
      font-size: 10px;
      line-height: 20px;
    }

    &__directory-label {
      flex-shrink: 0;
    }

    &__directory-path {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-height: 28px;
      margin-top: auto;
    }

    &__metrics {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      color: var(--text-muted-color);
      font-size: 11px;

      span {
        display: flex;
        align-items: center;
        gap: 3px;
      }

      svg {
        width: 12px;
        height: 12px;
      }
    }

    &__actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
</style>
