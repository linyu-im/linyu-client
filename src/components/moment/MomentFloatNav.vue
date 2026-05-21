<template>
  <nav class="moment-float-nav">
    <n-tooltip v-for="item in filterItems" :key="item.key" placement="right" :show-arrow="false">
      <template #trigger>
        <button
          type="button"
          class="moment-float-nav__pill"
          :class="{ active: activeFilter === item.key }"
          @click="emit('update:activeFilter', item.key)">
          <svg v-if="item.key === 'all'" class="moment-float-nav__icon" aria-hidden="true">
            <use href="#home"></use>
          </svg>
          <svg v-else-if="item.key === 'special'" class="moment-float-nav__icon" aria-hidden="true">
            <use href="#heart"></use>
          </svg>
          <svg v-else class="moment-float-nav__icon" aria-hidden="true">
            <use href="#user"></use>
          </svg>
        </button>
      </template>
      {{ item.label }}
    </n-tooltip>

    <div class="moment-float-nav__divider" />

    <n-tooltip placement="right" :show-arrow="false">
      <template #trigger>
        <button type="button" class="moment-float-nav__pill" @click="emit('refresh')">
          <svg class="moment-float-nav__icon" aria-hidden="true">
            <use href="#refresh"></use>
          </svg>
        </button>
      </template>
      {{ t('moment.nav.refresh') }}
    </n-tooltip>

    <n-tooltip placement="right" :show-arrow="false">
      <template #trigger>
        <button type="button" class="moment-float-nav__compose" @click="emit('compose')">
          <svg class="moment-float-nav__icon" aria-hidden="true">
            <use href="#plus"></use>
          </svg>
        </button>
      </template>
      {{ t('moment.nav.compose') }}
    </n-tooltip>
  </nav>
</template>

<script setup lang="ts">
  import type { MomentFilter } from '@/types/api/moment'
  import { useI18n } from 'vue-i18n'

  defineProps<{
    activeFilter: MomentFilter
  }>()

  const emit = defineEmits<{
    'update:activeFilter': [value: MomentFilter]
    refresh: []
    compose: []
  }>()

  const { t } = useI18n()

  const filterItems = computed(() => [
    { key: 'all' as MomentFilter, label: t('moment.nav.all') },
    { key: 'special' as MomentFilter, label: t('moment.nav.special') },
    { key: 'mine' as MomentFilter, label: t('moment.nav.mine') }
  ])
</script>

<style scoped lang="scss">
  .moment-float-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;

    &__icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      fill: none;
    }

    &__pill {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--card-bg-color) 50%, transparent);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text-muted-color);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(12px);

      &:hover {
        border-color: color-mix(in srgb, var(--primary-color) 40%, transparent);
        color: var(--text-color);
        background: color-mix(in srgb, var(--card-bg-color) 80%, transparent);
        transform: scale(1.08);
        box-shadow: 0 0 16px rgba(var(--primary-rgb), 0.15);
      }

      &.active {
        background: linear-gradient(135deg, var(--primary-color), var(--primary-soft-color));
        color: #fff;
        border-color: transparent;
        font-weight: 600;
        box-shadow: 0 2px 12px rgba(var(--primary-rgb), 0.25);
      }
    }

    &__divider {
      width: 16px;
      height: 1px;
      background: var(--border-color);
      margin: 2px 0;
    }

    &__compose {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color), var(--primary-soft-color));
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #fff;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 12px rgba(var(--primary-rgb), 0.25);

      &:hover {
        transform: scale(1.1) rotate(90deg);
        box-shadow: 0 4px 20px rgba(var(--primary-rgb), 0.3);
      }

      &:active {
        transform: scale(0.95) rotate(90deg);
      }
    }
  }
</style>
