<template>
  <section class="cloud-drive-categories">
    <div class="cloud-drive-categories__list">
      <button
        v-for="category in categories"
        :key="category.key"
        type="button"
        class="cloud-drive-categories__item"
        :class="`cloud-drive-categories__item--${category.key}`">
        <span class="cloud-drive-categories__icon" aria-hidden="true">
          <svg class="size-17px">
            <use :href="category.icon"></use>
          </svg>
        </span>
        <span class="cloud-drive-categories__info">
          <span class="cloud-drive-categories__name">{{ t(category.labelKey) }}</span>
          <span class="cloud-drive-categories__meta">{{ category.count }} · {{ category.size }}</span>
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'

  interface DriveCategory {
    key: string
    icon: string
    labelKey: string
    count: string
    size: string
  }

  const { t } = useI18n()

  const categories: DriveCategory[] = [
    { key: 'images', icon: '#image', labelKey: 'drive.categories.images', count: '1.2k', size: '15.4 GB' },
    { key: 'videos', icon: '#video', labelKey: 'drive.categories.videos', count: '154', size: '28.2 GB' },
    { key: 'documents', icon: '#document', labelKey: 'drive.categories.documents', count: '842', size: '4.2 GB' },
    { key: 'audio', icon: '#voice', labelKey: 'drive.categories.audio', count: '56', size: '1.8 GB' }
  ]
</script>

<style scoped lang="scss">
  .cloud-drive-categories {
    flex-shrink: 0;
    margin-bottom: 22px;

    &__list {
      display: flex;
      flex-wrap: nowrap;
      align-items: stretch;
      gap: 8px;
      width: 100%;
    }

    &__item {
      --category-accent: var(--primary-color);
      flex: 1 1 0;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
      border-radius: 8px;
      background: linear-gradient(
        135deg,
        var(--bg-secondary-color) 0%,
        color-mix(in srgb, var(--category-accent) 5%, var(--bg-secondary-color)) 100%
      );
      cursor: pointer;
      text-align: left;
      user-select: none;
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;

      &:hover {
        border-color: color-mix(in srgb, var(--category-accent) 28%, var(--border-color));
        box-shadow: 0 2px 8px color-mix(in srgb, var(--category-accent) 10%, transparent);
      }

      &--images {
        --category-accent: var(--primary-color);
      }

      &--videos {
        --category-accent: var(--green);
      }

      &--documents {
        --category-accent: var(--purple);
      }

      &--audio {
        --category-accent: var(--gold);
      }
    }

    &__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      border-radius: 8px;
      color: var(--category-accent);
      background: linear-gradient(
        145deg,
        color-mix(in srgb, var(--category-accent) 16%, var(--bg-secondary-color)),
        color-mix(in srgb, var(--category-accent) 6%, var(--bg-muted-color))
      );
      border: 1px solid color-mix(in srgb, var(--category-accent) 14%, transparent);
      box-shadow: inset 0 1px 0 color-mix(in srgb, var(--bg-secondary-color) 40%, transparent);
    }

    &__info {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
      flex: 1;
    }

    &__name {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.3;
      color: var(--text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__meta {
      font-size: 11px;
      line-height: 1.3;
      color: var(--text-secondary-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
</style>
