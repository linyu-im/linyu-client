<template>
  <div class="moment">
    <div class="moment__body">
      <aside class="moment__sider">
        <MomentFloatNav v-model:active-filter="activeFilter" @refresh="onRefresh" @compose="showCompose = true" />
      </aside>

      <n-spin :show="loading" class="moment__spin">
        <n-scrollbar class="moment__scroll">
          <div class="moment__feed">
            <MomentCover :user-id="userStore.userInfo.id" @change-cover="onChangeCover" @settings="onSettings" />

            <div class="moment__spacer" />

            <MomentPostCard
              v-for="record in filteredRecords"
              :key="record.moment.id"
              :record="record"
              :current-user-id="userStore.userInfo.id"
              @toggle-like="onToggleLike"
              @view-all-comments="onViewAllComments"
              @add-comment="onAddComment"
              @delete-comment="onDeleteComment"
              @delete="onDeletePost" />

            <div v-if="!loading && filteredRecords.length === 0" class="moment__empty">
              <n-divider class="moment__empty-text">{{ t('moment.empty') }}</n-divider>
            </div>
          </div>
        </n-scrollbar>
      </n-spin>
    </div>

    <MomentComposeModal
      v-model:show="showCompose"
      :user-id="userStore.userInfo.id"
      :username="userStore.userInfo.username"
      @success="onComposeSuccess" />
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'moment' })
  import { momentApi } from '@/api'
  import MomentCover from '@/components/Moment/MomentCover.vue'
  import MomentFloatNav from '@/components/Moment/MomentFloatNav.vue'
  import MomentPostCard from '@/components/Moment/MomentPostCard.vue'
  import MomentComposeModal from '@/components/Moment/MomentComposeModal.vue'
  import { useUserStore } from '@/stores/user'
  import type { MomentFilter, MomentLike, MomentPageParam, MomentRecord } from '@/types/api/moment'
  import { useI18n } from 'vue-i18n'

  const PAGE_SIZE = 20

  const { t } = useI18n()
  const userStore = useUserStore()

  const activeFilter = ref<MomentFilter>('all')
  const showCompose = ref(false)
  const loading = ref(false)
  const records = ref<MomentRecord[]>([])

  const filteredRecords = computed(() => {
    if (activeFilter.value === 'special') return []
    return records.value
  })

  const buildPageParam = (): MomentPageParam => {
    const param: MomentPageParam = { page: 1, PageSize: PAGE_SIZE }
    if (activeFilter.value === 'mine') {
      param.viewUserId = userStore.userInfo.id
    }
    return param
  }

  const fetchMoments = async () => {
    if (activeFilter.value === 'special') {
      records.value = []
      return
    }

    loading.value = true
    try {
      const res = await momentApi.page(buildPageParam())
      if (res.code === 0 && res.data) {
        records.value = res.data.records
      } else {
        window.$message.error(res.msg)
      }
    } finally {
      loading.value = false
    }
  }

  const findRecord = (momentId: string) => records.value.find((r) => r.moment.id === momentId)

  const onToggleLike = async (momentId: string) => {
    const record = findRecord(momentId)
    if (!record) return

    const likes = record.likes ?? []
    const idx = likes.findIndex((l) => l.userId === userStore.userInfo.id)
    const isLiked = idx >= 0

    const res = isLiked ? await momentApi.likeCancel({ momentId }) : await momentApi.likeAdd({ momentId })

    if (res.code !== 0) {
      window.$message.error(res.msg)
      return
    }

    if (isLiked) {
      record.likes = likes.filter((l) => l.userId !== userStore.userInfo.id)
    } else {
      const like = res.data as MomentLike
      record.likes = [like, ...likes]
    }
  }

  const onViewAllComments = (momentId: string) => {
    window.$message.info(t('moment.post.viewAllCommentsTodo', { id: momentId }))
  }

  const onAddComment = async (momentId: string, content: string, parentId?: string) => {
    const record = findRecord(momentId)
    if (!record) return

    const res = await momentApi.commentAdd({
      momentId,
      content,
      ...(parentId ? { parentId } : {})
    })

    if (res.code !== 0) {
      window.$message.error(res.msg)
      return
    }

    if (!res.data) return

    const comments = record.comments ?? []
    record.comments = [...comments, res.data]
  }

  const onDeleteComment = async (momentId: string, commentId: string) => {
    const record = findRecord(momentId)
    if (!record) return

    const res = await momentApi.commentDel({ commentId })

    if (res.code !== 0) {
      window.$message.error(res.msg)
      return
    }

    const comments = record.comments ?? []
    record.comments = comments.filter((c) => c.id !== commentId)
  }

  const onDeletePost = async (momentId: string) => {
    const res = await momentApi.remove({ momentId })
    if (res.code !== 0) {
      window.$message.error(res.msg)
      return
    }
    records.value = records.value.filter((r) => r.moment.id !== momentId)
    window.$message.success(t('moment.post.deleted'))
  }

  const onComposeSuccess = () => {
    fetchMoments()
  }

  const onRefresh = () => {
    fetchMoments().then(() => {
      window.$message.success(t('moment.refreshed'))
    })
  }

  const onChangeCover = () => {
    window.$message.info(t('moment.cover.todo'))
  }

  const onSettings = () => {
    window.$message.info(t('moment.cover.todo'))
  }

  onActivated(() => {
    void fetchMoments()
  })

  watch(
    activeFilter,
    () => {
      fetchMoments()
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  .moment {
    position: relative;
    height: 100%;
    overflow: hidden;
    background-color: var(--bg-secondary-color);
    display: flex;
    justify-content: center;

    &::before {
      content: '';
      position: absolute;
      top: -120px;
      right: -120px;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(var(--primary-rgb), 0.08) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    &__body {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: stretch;
      width: 100%;
      max-width: min(780px, 100%);
      height: 100%;
      padding: 0 clamp(8px, 2vw, 16px);
      box-sizing: border-box;
    }

    &__sider {
      flex: 0 0 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-right: 20px;
    }

    &__spin {
      flex: 1;
      min-width: 0;
      height: 100%;

      :deep(.n-spin-container) {
        height: 100%;
      }

      :deep(.n-spin-content) {
        height: 100%;
      }
    }

    &__scroll {
      height: 100%;
    }

    &__feed {
      position: relative;
      width: 100%;
      padding: 16px 16px 24px 0;
      box-sizing: border-box;
    }

    &__spacer {
      height: 24px;
    }

    &__empty {
      margin-top: 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    &__empty-text {
      font-size: 12px;
      color: var(--text-secondary-color);
      width: 80%;
      user-select: none;
    }
  }

  @media (max-width: 640px) {
    .moment__body {
      max-width: 100%;
      padding: 0 8px;
    }

    .moment__sider {
      flex: 0 0 40px;
      padding-right: 4px;
    }

    .moment__feed {
      padding: 12px 8px 16px 0;
    }
  }
</style>
