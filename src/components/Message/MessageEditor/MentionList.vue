<template>
  <div class="mention-list" :class="{ 'mention-list--empty': !items.length }">
    <template v-if="items.length">
      <div
        v-for="(item, index) in items"
        :key="item.id"
        class="mention-list__item"
        :class="{ 'is-active': index === activeIndex }"
        @mousedown.prevent="selectItem(index)"
        @mouseenter="activeIndex = index">
        <div class="mention-list__avatar">
          <Avatar v-if="item.type" :id="item.id" :type="item.type" :size="24" round />
          <span v-else>{{ item.name.slice(0, 1).toUpperCase() }}</span>
        </div>
        <div class="mention-list__meta">
          <div class="mention-list__name-row">
            <span class="mention-list__name">{{ item.name }}</span>
            <span v-if="item.tag" class="mention-list__tag">{{ item.tag }}</span>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="mention-list__empty">{{ t('message.editor.mentionEmpty') }}</div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import type { FromType } from '@/types/common'

  const { t } = useI18n()

  export interface MentionItem {
    id: string
    name: string
    type?: FromType
    tag?: string
  }

  interface Props {
    items: MentionItem[]
    command: (item: { id: string; label: string; mentionType: FromType }) => void
  }

  const props = defineProps<Props>()

  const activeIndex = ref(0)

  watch(
    () => props.items,
    () => {
      activeIndex.value = 0
    }
  )

  const selectItem = (index: number) => {
    const target = props.items[index]
    if (!target) return
    props.command({ id: target.id, label: target.name, mentionType: target.type ?? 'user' })
  }

  const onKeyDown = ({ event }: { event: KeyboardEvent }) => {
    if (!props.items.length) return false
    if (event.key === 'ArrowUp') {
      activeIndex.value = (activeIndex.value + props.items.length - 1) % props.items.length
      return true
    }
    if (event.key === 'ArrowDown') {
      activeIndex.value = (activeIndex.value + 1) % props.items.length
      return true
    }
    if (event.key === 'Enter') {
      selectItem(activeIndex.value)
      return true
    }
    return false
  }

  defineExpose({ onKeyDown })
</script>

<style scoped lang="scss">
  .mention-list {
    min-width: 180px;
    max-width: 240px;
    background: var(--bg-muted-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
    padding: 4px;
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    color: var(--text-color);
    max-height: 240px;
    overflow-y: auto;

    &--empty {
      min-width: 120px;
    }

    .mention-list__item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s ease;

      &:hover,
      &.is-active {
        background-color: color-mix(in srgb, var(--primary-color) 12%, transparent);
      }

      &.is-active {
        color: var(--primary-color);
      }
    }

    .mention-list__avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      background: var(--button-soft-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: var(--text-muted-color);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .mention-list__meta {
      min-width: 0;
      flex: 1;

      .mention-list__name-row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      .mention-list__name {
        font-size: 13px;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mention-list__tag {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
        padding: 1px 6px;
        border-radius: 999px;
        font-size: 10px;
        line-height: 1.35;
        user-select: none;
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 14%, transparent);
        border: 1px solid color-mix(in srgb, var(--primary-color) 36%, transparent);
      }
    }

    .mention-list__empty {
      padding: 8px 10px;
      font-size: 12px;
      color: var(--text-secondary-color);
      text-align: center;
    }
  }
</style>
