<template>
  <div class="emoji-picker">
    <div ref="contentScrollRef" class="emoji-picker__scroll">
      <div class="emoji-picker__body">
        <n-spin :show="contentLoading">
          <section v-if="activeTab === 'default'" class="emoji-picker__section">
            <div v-if="recentDefaultStickers.length" class="emoji-picker__recent">
              <div class="emoji-picker__section-title">{{ t('message.emojiPicker.recent') }}</div>
              <div class="emoji-picker__grid">
                <StickerItem
                  v-for="item in recentDefaultStickers"
                  :key="`recent-${item.id}`"
                  :sticker="item"
                  @select="onSelect" />
              </div>
            </div>
            <div class="emoji-picker__section-title">{{ t('message.emojiPicker.default') }}</div>
            <div v-if="!cachedDefaultStickers.length && !defaultLoading" class="emoji-picker__empty">
              {{ t('message.emojiPicker.emptyDefault') }}
            </div>
            <div v-else-if="cachedDefaultStickers.length" class="emoji-picker__grid">
              <StickerItem v-for="item in cachedDefaultStickers" :key="item.id" :sticker="item" @select="onSelect" />
            </div>
          </section>
          <section v-if="activeTab === 'favorite'" class="emoji-picker__section">
            <div v-if="!favoriteStickers.length && !favoriteLoading" class="emoji-picker__empty">
              {{ t('message.emojiPicker.emptyFavorite') }}
            </div>
            <div v-else-if="favoriteStickers.length" class="emoji-picker__grid emoji-picker__grid--sticker">
              <StickerItem v-for="item in favoriteStickers" :key="item.id" :sticker="item" @select="onSelect" />
            </div>
          </section>
          <section v-if="isPackTab" class="emoji-picker__section">
            <div v-if="!activePackStickers.length && !packLoading" class="emoji-picker__empty">
              {{ t('message.emojiPicker.emptyPack') }}
            </div>
            <div v-else-if="activePackStickers.length" class="emoji-picker__grid emoji-picker__grid--sticker">
              <StickerItem v-for="item in activePackStickers" :key="item.id" :sticker="item" @select="onSelect" />
            </div>
          </section>
        </n-spin>
      </div>
    </div>
    <div class="emoji-picker__footer">
      <div ref="tabScrollRef" class="emoji-picker__tabs">
        <button
          type="button"
          class="emoji-picker__tab"
          :class="{ 'emoji-picker__tab--active': activeTab === 'default' }"
          :title="t('message.emojiPicker.tabDefault')"
          @click="switchTab('default')">
          <svg class="emoji-picker__tab-icon">
            <use href="#emotion" />
          </svg>
        </button>
        <button
          type="button"
          class="emoji-picker__tab"
          :class="{ 'emoji-picker__tab--active': activeTab === 'favorite' }"
          :title="t('message.emojiPicker.tabFavorite')"
          @click="switchTab('favorite')">
          <svg class="emoji-picker__tab-icon">
            <use href="#heart" />
          </svg>
        </button>
        <button
          v-for="pack in cachedUserPacks"
          :key="pack.id"
          type="button"
          class="emoji-picker__tab"
          :class="{ 'emoji-picker__tab--active': activeTab === pack.id }"
          :title="pack.name"
          @click="switchTab(pack.id)">
          <img v-if="pack.packIconUrl" class="emoji-picker__tab-img" :src="pack.packIconUrl" :alt="pack.name" />
          <svg v-else class="emoji-picker__tab-icon">
            <use href="#star" />
          </svg>
        </button>
      </div>
      <button
        v-if="showTabScrollHint"
        type="button"
        class="emoji-picker__tab-more"
        :title="t('message.emojiPicker.morePacks')"
        @click="scrollTabsRight">
        <svg class="emoji-picker__tab-more-icon">
          <use href="#right-arrow" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { stickerApi } from '@/api'
  import { useDefaultStickerCache } from '@/composables/useDefaultStickerCache'
  import { useUserStickerPackCache } from '@/composables/useUserStickerPackCache'
  import { useRecentDefaultStickerStore } from '@/stores/recentDefaultSticker'
  import type { Sticker } from '@/types/api/sticker'
  import StickerItem from './StickerItem.vue'

  interface Props {
    visible?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false
  })

  const emit = defineEmits<(e: 'select', sticker: Sticker) => void>()

  const { t } = useI18n()
  const { cachedDefaultStickers, defaultLoading, loadDefaultStickers } = useDefaultStickerCache()
  const { cachedUserPacks, packLoading, loadUserPacks } = useUserStickerPackCache()
  const recentDefaultStickerStore = useRecentDefaultStickerStore()

  const recentDefaultStickers = computed(() => recentDefaultStickerStore.stickers)

  const DEFAULT_TAB = 'default'
  const FAVORITE_TAB = 'favorite'

  const activeTab = ref(DEFAULT_TAB)
  const favoriteStickers = ref<Sticker[]>([])
  const favoriteLoading = ref(false)

  const isPackTab = computed(() => activeTab.value !== DEFAULT_TAB && activeTab.value !== FAVORITE_TAB)

  const activePackStickers = computed(() => {
    const pack = cachedUserPacks.value.find((item) => item.id === activeTab.value)
    return pack?.stickers ?? []
  })

  const contentLoading = computed(() => {
    if (activeTab.value === DEFAULT_TAB) return defaultLoading.value
    if (activeTab.value === FAVORITE_TAB) return favoriteLoading.value
    if (isPackTab.value) return packLoading.value
    return false
  })
  const contentScrollRef = ref<HTMLElement | null>(null)
  const tabScrollRef = ref<HTMLElement | null>(null)
  const showTabScrollHint = ref(false)

  const resetContentScroll = () => {
    contentScrollRef.value?.scrollTo({ top: 0 })
  }

  const updateTabScrollHint = () => {
    const el = tabScrollRef.value
    if (!el) {
      showTabScrollHint.value = false
      return
    }
    showTabScrollHint.value = el.scrollWidth > el.clientWidth + 4
  }

  const scrollTabsRight = () => {
    tabScrollRef.value?.scrollBy({ left: 120, behavior: 'smooth' })
  }

  const onOpen = () => {
    activeTab.value = DEFAULT_TAB
    resetContentScroll()
    Promise.all([loadDefaultStickers(), loadUserPacks()]).then(() => {
      nextTick(() => {
        resetContentScroll()
        updateTabScrollHint()
      })
    })
  }

  const loadFavorites = () => {
    favoriteLoading.value = true
    stickerApi.favoriteList().then((res) => {
      if (res.code === 0 && res.data) {
        favoriteStickers.value = res.data
      } else if (res.code !== 0) {
        window.$message.error(res.msg)
      }
      favoriteLoading.value = false
      nextTick(() => {
        resetContentScroll()
        updateTabScrollHint()
      })
    })
  }

  const switchTab = (tab: string) => {
    activeTab.value = tab
    resetContentScroll()
    if (tab === FAVORITE_TAB) {
      loadFavorites()
    }
  }

  const onSelect = (item: Sticker) => {
    if (activeTab.value === DEFAULT_TAB) {
      recentDefaultStickerStore.addSticker(item)
    }
    emit('select', item)
  }

  watch(
    () => props.visible,
    (show) => {
      if (show) {
        onOpen()
      }
    }
  )

  onMounted(() => {
    loadDefaultStickers()
    loadUserPacks()
    if (props.visible) {
      onOpen()
    }
    nextTick(updateTabScrollHint)
    window.addEventListener('resize', updateTabScrollHint)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateTabScrollHint)
  })
</script>

<style scoped lang="scss">
  .emoji-picker {
    width: 420px;
    height: 320px;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 2px 8px color-mix(in srgb, var(--text-color) 5%, transparent);
    overflow: hidden;
    user-select: none;

    &__scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
    }

    &__body {
      padding: 8px 4px 4px;
    }

    &__section {
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    &__recent {
      margin-bottom: 12px;
    }

    &__section-title {
      padding: 0 8px 6px;
      font-size: 12px;
      color: var(--text-secondary-color);
      line-height: 1.4;
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(11, 1fr);
      gap: 2px;
      padding: 0 4px;

      &--sticker {
        grid-template-columns: repeat(8, 1fr);
        gap: 4px;
      }
    }

    &__empty {
      padding: 40px 16px;
      text-align: center;
      font-size: 13px;
      color: var(--text-secondary-color);
    }

    &__footer {
      display: flex;
      align-items: center;
      height: 44px;
      border-top: 1px solid var(--border-color);
      padding: 0 4px;
      flex-shrink: 0;
    }

    &__tabs {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 2px;
      overflow-x: auto;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    &__tab {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      color: var(--text-muted-color);
      transition: background-color 0.15s ease;

      &:hover {
        background: var(--icon-hover-color);
      }

      &--active {
        background: var(--button-soft-bg);
        color: var(--text-color);
      }
    }

    &__tab-icon {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }

    &__tab-img {
      width: 24px;
      height: 24px;
      object-fit: contain;
      border-radius: 4px;
    }

    &__tab-more {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 36px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      color: var(--text-muted-color);

      &:hover {
        background: var(--icon-hover-color);
        color: var(--text-color);
      }
    }

    &__tab-more-icon {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
  }
</style>
