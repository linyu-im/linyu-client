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
        <h2 class="application-center__section-title">{{ t('application.sectionAll') }}</h2>
        <span class="application-center__section-count">
          {{ t('application.count', { count: filteredAppList.length }) }}
        </span>
      </div>

      <n-scrollbar class="application-center__scroll">
        <div v-if="filteredAppList.length > 0" class="application-center__grid">
          <button
            v-for="app in filteredAppList"
            :key="app.id"
            type="button"
            class="application-center__card"
            @click="onOpenApp(app)">
            <div
              class="application-center__icon"
              :class="{ 'application-center__icon--image': hasIconUrl(app) }"
              :style="hasIconUrl(app) ? undefined : { backgroundColor: app.iconBg }">
              <img v-if="hasIconUrl(app)" class="application-center__icon-img" :src="app.iconUrl" alt="" />
              <span v-else class="application-center__icon-text">{{ app.iconText }}</span>
            </div>
            <div class="application-center__info">
              <div class="application-center__title-row">
                <span class="application-center__name" :title="app.name">{{ app.name }}</span>
                <span v-if="app.tag" class="application-center__tag">{{ app.tag }}</span>
              </div>
              <div class="application-center__desc" :title="app.description">{{ app.description }}</div>
            </div>
          </button>
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
  import { useI18n } from 'vue-i18n'

  export interface AppItem {
    id: string
    name: string
    description: string
    tag: string
    iconUrl?: string
    iconBg?: string
    iconText?: string
  }

  const { t } = useI18n()
  const searchKeyword = ref('')

  const hasIconUrl = (app: AppItem) => Boolean(app.iconUrl?.trim())

  // TODO: 后续通过接口获取应用列表
  const appList = ref<AppItem[]>([
    {
      id: 'schedule',
      name: '团队日程',
      description: '在聊天中快速创建会议与提醒，同步团队日程安排',
      tag: '效率',
      iconUrl: '/file/doc.png',
      iconBg: '#4C9BFF',
      iconText: '日程'
    },
    {
      id: 'task',
      name: '任务协作',
      description: '将聊天消息一键转为待办，跟踪任务进度与完成情况',
      tag: '协作',
      iconUrl: '',
      iconBg: '#31b36b',
      iconText: '任务'
    },
    {
      id: 'docs',
      name: '云文档',
      description: '多人实时协作编辑文档，支持在会话中直接分享与预览',
      tag: '文档',
      iconUrl: '',
      iconBg: '#ff7d00',
      iconText: '文档'
    },
    {
      id: 'approval',
      name: '审批中心',
      description: '请假、报销等审批流程在线发起，进度实时推送到聊天',
      tag: '办公',
      iconUrl: '',
      iconBg: '#5b45c3',
      iconText: '审批'
    },
    {
      id: 'meeting',
      name: '视频会议',
      description: '一键发起音视频会议，支持屏幕共享与群组快速入会',
      tag: '会议',
      iconUrl: '',
      iconBg: '#003E8C',
      iconText: '会议'
    },
    {
      id: 'poll',
      name: '投票问卷',
      description: '在群聊中发起投票与问卷，快速收集成员意见与反馈',
      tag: '互动',
      iconUrl: '',
      iconBg: '#14b8a6',
      iconText: '投票'
    }
  ])

  const filteredAppList = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    if (!keyword) return appList.value
    return appList.value.filter(
      (app) =>
        app.name.toLowerCase().includes(keyword) ||
        app.description.toLowerCase().includes(keyword) ||
        app.tag.toLowerCase().includes(keyword)
    )
  })

  const onOpenApp = (_app: AppItem) => {
    window.$message?.info(t('application.todo'))
  }
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
      padding: 16px 24px 0;
    }

    &__section-head {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    &__section-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
    }

    &__section-count {
      font-size: 12px;
      color: var(--text-secondary-color);
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
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      padding: 0 4px 24px 0;
      box-sizing: border-box;
    }

    &__card {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
      padding: 14px 16px;
      border: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);
      border-radius: 10px;
      background: color-mix(in srgb, var(--bg-primary-color) 88%, var(--bg-secondary-color));
      text-align: left;
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        background-color 0.15s ease,
        box-shadow 0.15s ease;

      &:hover {
        border-color: color-mix(in srgb, var(--primary-color) 45%, var(--border-color));
        background: color-mix(in srgb, var(--primary-color) 4%, var(--bg-primary-color));
        box-shadow: 0 4px 14px color-mix(in srgb, var(--primary-color) 8%, transparent);
      }
    }

    &__icon {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    &__icon--image {
      background-color: var(--bg-primary-color);
      border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);

      .application-center__icon-img {
        object-fit: contain;
        padding: 6px;
        box-sizing: border-box;
      }
    }

    &__icon-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &__icon-text {
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      line-height: 1;
      user-select: none;
    }

    &__info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    &__name {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__tag {
      flex-shrink: 0;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 11px;
      line-height: 1.5;
      color: var(--primary-color);
      background-color: color-mix(in srgb, var(--primary-color) 12%, transparent);
    }

    &__desc {
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-secondary-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

      &__grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
    }
  }
</style>
