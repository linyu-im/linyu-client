<template>
  <div class="application-center">
    <header class="application-center__header">
      <div class="application-center__header-main">
        <h1 class="application-center__title">{{ t('application.title') }}</h1>
        <p class="application-center__subtitle">{{ t('application.subtitle') }}</p>
      </div>
      <n-input
        v-model:value="searchKeyword"
        size="small"
        class="application-center__search"
        :placeholder="t('application.searchPlaceholder')"
        clearable>
        <template #prefix>
          <svg class="size-16px text-[var(--text-secondary-color)]">
            <use href="#search"></use>
          </svg>
        </template>
      </n-input>
    </header>

    <section class="application-center__section">
      <div class="application-center__section-head">
        <div class="application-center__tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            class="application-center__tab"
            :class="{ 'application-center__tab--active': activeTab === tab.value }"
            @click="activeTab = tab.value">
            {{ tab.label }}
          </button>
        </div>
        <span class="application-center__section-count">
          {{ t('application.count', { count: filteredAppList.length }) }}
        </span>
      </div>

      <n-scrollbar class="application-center__scroll">
        <div v-if="filteredAppList.length > 0" class="application-center__grid">
          <div
            v-for="app in filteredAppList"
            :key="app.id"
            class="application-center__card"
            role="button"
            tabindex="0"
            @click="onOpenApp(app)"
            @keydown.enter="onOpenApp(app)">
            <div class="application-center__top">
              <div
                class="application-center__icon"
                :class="{
                  'application-center__icon--image': hasIconUrl(app),
                  'application-center__icon--fallback': !hasIconUrl(app)
                }">
                <img v-if="hasIconUrl(app)" class="application-center__icon-img" :src="app.iconUrl" alt="" />
                <span v-else class="application-center__icon-text">{{ app.appName.slice(0, 2) }}</span>
              </div>

              <div class="application-center__info">
                <div class="application-center__info-top">
                  <div class="application-center__name-group" :title="`${app.appName} ${app.version}`">
                    <span class="application-center__name">{{ app.appName }}</span>
                    <span class="application-center__version">{{ app.version }}</span>
                  </div>
                  <div class="application-center__metrics">
                    <span
                      class="application-center__metric application-center__metric--score"
                      :title="t('application.score', { score: app.score })">
                      <svg class="size-11px" aria-hidden="true">
                        <use href="#five-star"></use>
                      </svg>
                      <span>{{ app.score }}</span>
                    </span>
                    <span
                      class="application-center__metric"
                      :title="t('application.getCount', { count: app.getCount })">
                      <svg class="size-11px" aria-hidden="true">
                        <use href="#download"></use>
                      </svg>
                      <span>{{ app.getCount }}</span>
                    </span>
                  </div>
                </div>
                <span class="application-center__author" :title="t('application.author', { name: app.author })">
                  {{ t('application.authorBy', { name: app.author }) }}
                </span>
              </div>
            </div>

            <div class="application-center__bottom">
              <div class="application-center__bottom-main">
                <div v-if="app.tags.length > 0" class="application-center__tags">
                  <span v-for="tag in app.tags" :key="tag" class="application-center__tag">
                    {{ tag }}
                  </span>
                </div>
                <p class="application-center__desc" :title="app.description">{{ app.description }}</p>
              </div>

              <div class="application-center__actions">
                <template v-if="acquiredIds.has(app.id)">
                  <button
                    type="button"
                    class="application-center__action application-center__action--open"
                    @click.stop="onOpenAppAction(app)">
                    {{ t('application.actionOpen') }}
                  </button>
                  <button
                    type="button"
                    class="application-center__action application-center__action--uninstall"
                    @click.stop="onUninstallApp(app)">
                    {{ t('application.actionUninstall') }}
                  </button>
                </template>
                <button
                  v-else
                  type="button"
                  class="application-center__action application-center__action--get"
                  @click.stop="onGetApp(app)">
                  {{ t('application.actionGet') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="application-center__empty">
          <svg class="application-center__empty-icon size-48px">
            <use href="#application"></use>
          </svg>
          <p class="application-center__empty-text">{{ t('application.empty') }}</p>
        </div>
      </n-scrollbar>
    </section>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'application' })
  import { applicationApi } from '@/api'
  import type { Application } from '@/types/api/application'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const searchKeyword = ref('')
  const appList = ref<Application[]>([])
  const acquiredIds = ref(new Set<string>())
  const activeTab = ref<'all' | 'acquired' | 'unacquired'>('all')

  const tabs = computed(() => [
    { value: 'all' as const, label: t('application.tabAll') },
    { value: 'acquired' as const, label: t('application.tabAcquired') },
    { value: 'unacquired' as const, label: t('application.tabUnacquired') }
  ])

  const filteredAppList = computed(() => {
    if (activeTab.value === 'acquired') {
      return appList.value.filter((app) => acquiredIds.value.has(app.id))
    }
    if (activeTab.value === 'unacquired') {
      return appList.value.filter((app) => !acquiredIds.value.has(app.id))
    }
    return appList.value
  })

  const hasIconUrl = (app: Application) => Boolean(app.iconUrl?.trim())

  const fetchAppList = () => {
    applicationApi.list({ keyword: searchKeyword.value.trim() }).then((res) => {
      if (res.code === 0 && res.data) {
        appList.value = res.data
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  const onOpenApp = (_app: Application) => {
    window.$message?.info(t('application.todo'))
  }

  const onGetApp = (app: Application) => {
    acquiredIds.value = new Set([...acquiredIds.value, app.id])
  }

  const onOpenAppAction = (_app: Application) => {
    window.$message?.info(t('application.todo'))
  }

  const onUninstallApp = (app: Application) => {
    const next = new Set(acquiredIds.value)
    next.delete(app.id)
    acquiredIds.value = next
  }

  watch(searchKeyword, () => {
    fetchAppList()
  })

  onMounted(() => {
    fetchAppList()
  })

  onActivated(() => {
    fetchAppList()
  })
</script>

<style scoped lang="scss">
  .application-center {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    color: var(--text-color);
    background-color: var(--bg-secondary-color);

    &__header {
      flex-shrink: 0;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
    }

    &__header-main {
      min-width: 0;
    }

    &__title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.4;
      color: var(--text-color);
    }

    &__subtitle {
      margin: 6px 0 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-secondary-color);
    }

    &__search {
      flex-shrink: 0;
      width: 220px;
      margin-top: 4px;
    }

    &__section {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: 16px 24px;
    }

    &__section-head {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    &__section-count {
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    &__tabs {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 2px;
      border-radius: 8px;
      background-color: color-mix(in srgb, var(--bg-secondary-color) 60%, var(--border-color) 40%);
      width: fit-content;
    }

    &__tab {
      padding: 4px 14px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.4;
      color: var(--text-secondary-color);
      background: transparent;
      cursor: pointer;
      white-space: nowrap;
      outline: none;
      transition:
        color 0.15s ease,
        background-color 0.15s ease;

      &:hover {
        color: var(--text-color);
      }

      &--active {
        color: var(--text-color);
        background-color: var(--bg-primary-color);
        box-shadow: 0 1px 3px color-mix(in srgb, #000 8%, transparent);
      }
    }

    &__scroll {
      flex: 1;
      min-height: 0;

      :deep(.n-scrollbar-container) {
        height: 100%;
        max-height: 100%;
      }
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 4px 4px 20px 0;
      box-sizing: border-box;
    }

    &__card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
      padding: 14px 16px;
      border: 1px solid color-mix(in srgb, var(--border-color) 50%, transparent);
      border-radius: 12px;
      background: var(--bg-primary-color);
      text-align: left;
      cursor: pointer;
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;

      &:hover {
        border-color: color-mix(in srgb, var(--primary-color) 30%, var(--border-color));
        box-shadow: 0 2px 12px color-mix(in srgb, var(--primary-color) 8%, transparent);
      }
    }

    // ---- 上半部：图标 + 信息 ----
    &__top {
      display: flex;
      align-items: stretch;
      gap: 12px;
      min-width: 0;
    }

    &__icon {
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    &__icon--image {
      background-color: color-mix(in srgb, var(--bg-secondary-color) 50%, var(--bg-primary-color));
      border: 1px solid color-mix(in srgb, var(--border-color) 40%, transparent);

      .application-center__icon-img {
        object-fit: contain;
        padding: 6px;
        box-sizing: border-box;
      }
    }

    &__icon--fallback {
      background: linear-gradient(
        145deg,
        color-mix(in srgb, var(--primary-color) 85%, var(--bg-primary-color)),
        var(--primary-color)
      );
    }

    &__icon-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &__icon-text {
      font-size: 12px;
      font-weight: 700;
      color: var(--bg-primary-color);
      line-height: 1;
      user-select: none;
    }

    &__info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 2px;
    }

    &__info-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
    }

    &__name-group {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }

    &__name {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
      color: var(--text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__version {
      flex-shrink: 0;
      padding: 0 5px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      line-height: 1.6;
      color: var(--text-secondary-color);
      background-color: color-mix(in srgb, var(--border-color) 25%, transparent);
      white-space: nowrap;
    }

    &__metrics {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    &__metric {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      line-height: 1.4;
      color: var(--text-secondary-color);
      background-color: color-mix(in srgb, var(--bg-secondary-color) 70%, var(--border-color) 30%);
      white-space: nowrap;

      svg {
        opacity: 0.8;
      }

      &--score {
        color: var(--gold);
        background-color: color-mix(in srgb, var(--gold) 10%, transparent);

        svg {
          color: var(--gold);
        }
      }
    }

    &__author {
      font-size: 11px;
      line-height: 1.4;
      color: color-mix(in srgb, var(--text-secondary-color) 65%, transparent);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    // ---- 下半部：标签 + 描述 + 操作 ----
    &__bottom {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      min-width: 0;
    }

    &__bottom-main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    &__action {
      padding: 4px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.4;
      cursor: pointer;
      white-space: nowrap;
      outline: none;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;

      &:focus-visible {
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 30%, transparent);
      }

      &--get {
        color: #fff;
        background-color: var(--primary-color);

        &:hover {
          background-color: color-mix(in srgb, var(--primary-color) 85%, #000);
        }
      }

      &--open {
        color: var(--primary-color);
        background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);

        &:hover {
          background-color: color-mix(in srgb, var(--primary-color) 18%, transparent);
        }
      }

      &--uninstall {
        color: var(--text-secondary-color);
        background-color: color-mix(in srgb, var(--border-color) 25%, transparent);

        &:hover {
          color: #e5484d;
          background-color: color-mix(in srgb, #e5484d 10%, transparent);
        }
      }
    }

    &__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-width: 0;
    }

    &__tag {
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      line-height: 1.5;
      color: var(--primary-color);
      background-color: color-mix(in srgb, var(--primary-color) 8%, transparent);
    }

    &__desc {
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-secondary-color);
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
    }

    &__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      min-height: 240px;
      padding-bottom: 24px;
      color: var(--text-secondary-color);
    }

    &__empty-icon {
      opacity: 0.35;
    }

    &__empty-text {
      margin: 0;
      font-size: 13px;
    }
  }

  @media (min-width: 1200px) {
    .application-center {
      &__grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
  }

  @media (max-width: 960px) {
    .application-center {
      &__header {
        flex-direction: column;
        align-items: stretch;
      }

      &__search {
        width: 100%;
        margin-top: 0;
      }
    }
  }

  @media (max-width: 640px) {
    .application-center {
      &__header,
      &__section {
        padding-left: 16px;
        padding-right: 16px;
      }

      &__grid {
        grid-template-columns: minmax(0, 1fr);
      }

      &__info-top {
        flex-direction: column;
        gap: 4px;
      }
    }
  }
</style>
