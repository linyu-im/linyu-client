<template>
  <div class="moment-feed">
    <n-scrollbar class="moment-feed__scroll">
      <div class="moment-feed__content">
        <MomentCover :user-id="coverUserId" @settings="emit('settings')" />

        <div class="moment-feed__spacer" />

        <n-spin :show="loading" class="moment-feed__list">
          <MomentPostCard
            v-for="record in records"
            :key="record.moment.id"
            :record="record"
            :current-user-id="currentUserId"
            @toggle-like="onToggleLike"
            @view-all-comments="onViewAllComments"
            @add-comment="onAddComment"
            @delete-comment="onDeleteComment"
            @delete="onDeletePost" />

          <div v-if="!loading && records.length === 0" class="moment-feed__empty">
            <n-divider class="moment-feed__empty-text">{{ t('moment.empty') }}</n-divider>
          </div>
        </n-spin>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
  import { momentApi } from '@/api'
  import MomentCover from '@/components/Moment/MomentCover.vue'
  import MomentPostCard from '@/components/Moment/MomentPostCard.vue'
  import { useUserStore } from '@/stores/user/user'
  import type { MomentLike, MomentPageParam, MomentRecord } from '@/types/api/moment'
  import { useI18n } from 'vue-i18n'

  const PAGE_SIZE = 20

  const props = withDefaults(
    defineProps<{
      coverUserId: string
      /** 传入则只查该用户动态；不传则查全部 */
      viewUserId?: string
      enabled?: boolean
    }>(),
    {
      enabled: true
    }
  )

  const emit = defineEmits<{
    settings: []
  }>()

  const { t } = useI18n()
  const userStore = useUserStore()

  const loading = ref(false)
  const records = ref<MomentRecord[]>([])

  const currentUserId = computed(() => userStore.userInfo.id)

  const buildPageParam = (): MomentPageParam => {
    const param: MomentPageParam = { page: 1, PageSize: PAGE_SIZE }
    if (props.viewUserId) {
      param.viewUserId = props.viewUserId
    }
    return param
  }

  const fetchMoments = () => {
    if (!props.enabled) {
      records.value = []
      return Promise.resolve()
    }

    loading.value = true
    return momentApi
      .page(buildPageParam())
      .then((res) => {
        if (res.code === 0 && res.data) {
          records.value = res.data.records
          return
        }
        window.$message.error(res.msg)
      })
      .finally(() => {
        loading.value = false
      })
  }

  const findRecord = (momentId: string) => records.value.find((r) => r.moment.id === momentId)

  const onToggleLike = (momentId: string) => {
    const record = findRecord(momentId)
    if (!record) return

    const likes = record.likes ?? []
    const idx = likes.findIndex((l) => l.userId === currentUserId.value)
    const isLiked = idx >= 0

    const request = isLiked ? momentApi.likeCancel({ momentId }) : momentApi.likeAdd({ momentId })

    request.then((res) => {
      if (res.code !== 0) {
        window.$message.error(res.msg)
        return
      }

      if (isLiked) {
        record.likes = likes.filter((l) => l.userId !== currentUserId.value)
        return
      }

      const like = res.data as MomentLike
      record.likes = [like, ...likes]
    })
  }

  const onViewAllComments = (momentId: string) => {
    window.$message.info(t('moment.post.viewAllCommentsTodo', { id: momentId }))
  }

  const onAddComment = (momentId: string, content: string, parentId?: string) => {
    const record = findRecord(momentId)
    if (!record) return

    momentApi
      .commentAdd({
        momentId,
        content,
        ...(parentId ? { parentId } : {})
      })
      .then((res) => {
        if (res.code !== 0) {
          window.$message.error(res.msg)
          return
        }
        if (!res.data) return
        const comments = record.comments ?? []
        record.comments = [...comments, res.data]
      })
  }

  const onDeleteComment = (momentId: string, commentId: string) => {
    const record = findRecord(momentId)
    if (!record) return

    momentApi.commentDel({ commentId }).then((res) => {
      if (res.code !== 0) {
        window.$message.error(res.msg)
        return
      }
      const comments = record.comments ?? []
      record.comments = comments.filter((c) => c.id !== commentId)
    })
  }

  const onDeletePost = (momentId: string) => {
    momentApi.remove({ momentId }).then((res) => {
      if (res.code !== 0) {
        window.$message.error(res.msg)
        return
      }
      records.value = records.value.filter((r) => r.moment.id !== momentId)
      window.$message.success(t('moment.post.deleted'))
    })
  }

  const refresh = () => fetchMoments()

  defineExpose({ refresh })

  watch(
    () => [props.coverUserId, props.viewUserId, props.enabled] as const,
    () => {
      fetchMoments()
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  .moment-feed {
    flex: 1;
    min-width: 0;
    height: 100%;

    &__scroll {
      height: 100%;
    }

    &__list {
      min-height: 120px;

      :deep(.n-spin-container) {
        min-height: 120px;
      }
    }

    &__content {
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
    .moment-feed__content {
      padding: 12px 8px 16px 0;
    }
  }
</style>
