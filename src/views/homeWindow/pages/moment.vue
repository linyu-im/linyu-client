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
              v-for="post in filteredPosts"
              :key="post.id"
              :post="post"
              :current-user-id="userStore.userInfo.id"
              @toggle-like="onToggleLike"
              @toggle-comment-like="onToggleCommentLike"
              @view-all-comments="onViewAllComments"
              @add-comment="onAddComment"
              @delete="onDeletePost" />

            <div v-if="!loading && filteredPosts.length === 0" class="moment__empty">
              <LinyuEmpty :size="80" />
              <p class="moment__empty-text">{{ t('moment.empty') }}</p>
            </div>
          </div>
        </n-scrollbar>
      </n-spin>
    </div>

    <MomentComposeModal
      v-model:show="showCompose"
      :user-id="userStore.userInfo.id"
      :username="userStore.userInfo.username"
      @submit="onComposeSubmit" />
  </div>
</template>

<script setup lang="ts">
  import { momentApi } from '@/api'
  import MomentCover from '@/components/moment/MomentCover.vue'
  import MomentFloatNav from '@/components/moment/MomentFloatNav.vue'
  import MomentPostCard from '@/components/moment/MomentPostCard.vue'
  import MomentComposeModal from '@/components/moment/MomentComposeModal.vue'
  import { useUserStore } from '@/stores/user'
  import type { MomentFilter, MomentPost, MomentVisibleType } from '@/types/api/moment'
  import { mapMomentRecordToPost } from '@/utils/moment'
  import { useI18n } from 'vue-i18n'

  const PAGE_SIZE = 20

  const { t } = useI18n()
  const userStore = useUserStore()

  const activeFilter = ref<MomentFilter>('all')
  const showCompose = ref(false)
  const loading = ref(false)
  const posts = ref<MomentPost[]>([])

  const filteredPosts = computed(() => {
    switch (activeFilter.value) {
      case 'mine':
        return posts.value.filter((p) => p.isMine)
      case 'special':
        return []
      default:
        return posts.value
    }
  })

  const nameFallback = computed(() => t('moment.post.userFallback'))

  const fetchMoments = async () => {
    loading.value = true
    try {
      const res = await momentApi.page({ page: 1, PageSize: PAGE_SIZE })
      if (res.code === 0 && res.data) {
        posts.value = res.data.records.map((record) =>
          mapMomentRecordToPost(record, userStore.userInfo.id, nameFallback.value)
        )
      } else {
        window.$message.error(res.msg)
      }
    } finally {
      loading.value = false
    }
  }

  const findPost = (id: string) => posts.value.find((p) => p.id === id)

  const onToggleLike = (postId: string) => {
    const post = findPost(postId)
    if (!post) return
    post.liked = !post.liked
    post.likeCount += post.liked ? 1 : -1
    window.$message.info(t('moment.post.likeTodo'))
  }

  const onToggleCommentLike = (postId: string, commentId: string) => {
    const post = findPost(postId)
    const comment = post?.comments.find((c) => c.id === commentId)
    if (!comment) return
    comment.liked = !comment.liked
    comment.likeCount += comment.liked ? 1 : -1
  }

  const onViewAllComments = (postId: string) => {
    window.$message.info(t('moment.post.viewAllCommentsTodo', { id: postId }))
  }

  const onAddComment = (postId: string, text: string) => {
    const post = findPost(postId)
    if (!post) return
    post.comments.unshift({
      id: `c-${Date.now()}`,
      author: {
        id: userStore.userInfo.id,
        name: userStore.userInfo.username
      },
      text,
      time: t('moment.post.justNow'),
      likeCount: 0
    })
    post.commentCount += 1
    window.$message.info(t('moment.post.commentTodo'))
  }

  const onDeletePost = (postId: string) => {
    posts.value = posts.value.filter((p) => p.id !== postId)
    window.$message.success(t('moment.post.deleted'))
  }

  const onComposeSubmit = (payload: { content: string; visibility: MomentVisibleType; images: string[] }) => {
    window.$message.info(t('moment.compose.publishTodo'))
    void payload
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

  onMounted(() => {
    fetchMoments()
  })
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
      font-size: 13px;
      color: var(--text-secondary-color);
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
