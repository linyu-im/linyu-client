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
          <img v-if="item.avatar" :src="item.avatar" :alt="item.label" />
          <span v-else>{{ item.label.slice(0, 1).toUpperCase() }}</span>
        </div>
        <div class="mention-list__meta">
          <div class="mention-list__name">{{ item.label }}</div>
          <div v-if="item.desc" class="mention-list__desc">{{ item.desc }}</div>
        </div>
      </div>
    </template>
    <div v-else class="mention-list__empty">{{ t('message.editor.mentionEmpty') }}</div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  export interface MentionItem {
    id: string
    label: string
    avatar?: string
    desc?: string
  }

  interface Props {
    items: MentionItem[]
    command: (item: { id: string; label: string }) => void
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
    props.command({ id: target.id, label: target.label })
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

      .mention-list__name {
        font-size: 13px;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mention-list__desc {
        font-size: 11px;
        color: var(--text-secondary-color);
        line-height: 1.2;
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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
