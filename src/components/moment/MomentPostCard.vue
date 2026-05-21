<template>
  <article class="moment-post">
    <div class="moment-post__header">
      <div class="moment-post__author">
        <div class="moment-post__avatar-wrap">
          <Avatar :id="post.author.id" class="moment-post__avatar size-48px rounded-14px bg-#FFF" />
        </div>
        <div class="moment-post__detail">
          <div class="moment-post__name-row">
            <span class="moment-post__name">{{ post.author.name }}</span>
          </div>
          <div class="moment-post__meta">
            <span>{{ post.time }}</span>
          </div>
        </div>
      </div>
      <n-dropdown :options="moreOptions" trigger="click" placement="bottom-end" @select="onMoreSelect">
        <button type="button" class="moment-post__more">
          <svg class="size-18px">
            <use href="#more"></use>
          </svg>
        </button>
      </n-dropdown>
    </div>

    <div class="moment-post__body">
      <p class="moment-post__text">
        <template v-for="(part, idx) in contentParts" :key="idx">
          <span v-if="part.type === 'text'" class="whitespace-pre-wrap">{{ part.value }}</span>
          <span v-else class="moment-post__tag">{{ part.value }}</span>
        </template>
      </p>

      <div v-if="post.images?.length" class="moment-post__images" :class="imageGridClass(post.images.length)">
        <div v-for="(img, i) in post.images" :key="i" class="moment-post__img-wrap">
          <img :src="img.thumbUrl || img.url" alt="" />
          <div v-if="img.isVideo" class="moment-post__video-overlay">
            <div class="moment-post__play-btn" />
          </div>
        </div>
      </div>

      <div v-if="post.location" class="moment-post__location">
        <svg class="size-14px">
          <use href="#location"></use>
        </svg>
        <span>{{ post.location }}</span>
      </div>
    </div>

    <div class="moment-post__actions">
      <button
        type="button"
        class="moment-post__action"
        :class="{ liked: post.liked }"
        @click="emit('toggleLike', post.id)">
        <svg class="size-18px" :fill="post.liked ? 'currentColor' : 'none'">
          <use href="#heart"></use>
        </svg>
        <span>{{ post.likeCount }}</span>
      </button>
      <button type="button" class="moment-post__action" @click="showCommentInput = !showCommentInput">
        <svg class="size-18px">
          <use href="#comment"></use>
        </svg>
        <span>{{ post.commentCount }}</span>
      </button>
    </div>

    <div v-if="post.likeCount > 0 || post.comments.length" class="moment-post__interactions">
      <div v-if="post.likeCount > 0" class="moment-post__likes">
        <div class="moment-post__like-avatars">
          <Avatar
            v-for="user in displayLikeAuthors"
            :key="user.id"
            :id="user.id"
            class="moment-post__like-avatar size-28px rounded-full bg-#FFF" />
          <div v-if="likeMoreCount > 0" class="moment-post__like-more">+{{ likeMoreCount }}</div>
        </div>
        <span class="moment-post__likes-text">
          <strong>{{ post.likeAuthors[0]?.name }}</strong>
          {{ t('moment.post.likesSuffix', { count: post.likeCount }) }}
        </span>
      </div>

      <div v-if="post.comments.length" class="moment-post__comments">
        <div v-for="comment in previewComments" :key="comment.id" class="moment-post__comment">
          <Avatar :id="comment.author.id" class="size-28px rounded-full bg-#FFF flex-shrink-0" />
          <div class="moment-post__comment-body">
            <div class="moment-post__comment-content">
              <span class="moment-post__comment-name">{{ comment.author.name }}</span>
              <div class="moment-post__comment-text">
                <span v-if="comment.replyTo" class="moment-post__reply-to">@{{ comment.replyTo }}</span>
                {{ comment.text }}
              </div>
            </div>
            <div class="moment-post__comment-meta">
              <span>{{ comment.time }}</span>
              <span class="moment-post__comment-action">{{ t('moment.post.reply') }}</span>
            </div>
          </div>
        </div>
        <button
          v-if="post.commentCount > previewComments.length"
          type="button"
          class="moment-post__more-comments"
          @click="emit('viewAllComments', post.id)">
          {{ t('moment.post.viewAllComments') }}
        </button>
      </div>

      <div v-show="showCommentInput" class="moment-post__comment-input">
        <Avatar :id="currentUserId" class="size-32px rounded-full bg-#FFF flex-shrink-0" />
        <n-input
          v-model:value="commentDraft"
          round
          :placeholder="t('moment.post.commentPlaceholder')"
          @keyup.enter="submitComment" />
        <n-button
          type="primary"
          circle
          class="moment-post__send"
          :disabled="!commentDraft.trim()"
          @click="submitComment">
          <svg class="size-18px">
            <use href="#send"></use>
          </svg>
        </n-button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
  import type { MomentPost } from '@/types/api/moment'
  import { imageGridClass, parseMomentContent } from '@/utils/moment'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    post: MomentPost
    currentUserId: string
  }>()

  const emit = defineEmits<{
    toggleLike: [postId: string]
    toggleCommentLike: [postId: string, commentId: string]
    viewAllComments: [postId: string]
    addComment: [postId: string, text: string]
    delete: [postId: string]
  }>()

  const { t } = useI18n()
  const showCommentInput = ref(false)
  const commentDraft = ref('')

  const contentParts = computed(() => parseMomentContent(props.post.content))

  const displayLikeAuthors = computed(() => props.post.likeAuthors.slice(0, 5))
  const likeMoreCount = computed(() => Math.max(0, props.post.likeCount - displayLikeAuthors.value.length))
  const previewComments = computed(() => props.post.comments.slice(0, 1))

  const moreOptions = computed(() => [
    { label: () => t('moment.post.more.report'), key: 'report' },
    { label: () => t('moment.post.more.hide'), key: 'hide' },
    { type: 'divider' as const, key: 'd1' },
    { label: () => t('moment.post.more.delete'), key: 'delete' }
  ])

  const onMoreSelect = (key: string) => {
    if (key === 'delete') emit('delete', props.post.id)
    else window.$message.info(t('moment.post.more.todo'))
  }

  const submitComment = () => {
    const text = commentDraft.value.trim()
    if (!text) return
    emit('addComment', props.post.id, text)
    commentDraft.value = ''
    showCommentInput.value = false
  }
</script>

<style scoped lang="scss">
  .moment-post {
    background: color-mix(in srgb, var(--card-bg-color) 35%, transparent);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 16px;
    backdrop-filter: blur(12px);
    transition: border-color 0.2s;

    &:hover {
      border-color: color-mix(in srgb, var(--border-color) 80%, var(--primary-color));
    }

    &__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    &__author {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    &__avatar-wrap {
      position: relative;
      flex-shrink: 0;
    }

    &__detail {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    &__name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &__name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-color);
    }

    &__badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.5px;

      &--gold {
        background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.2), rgba(var(--primary-rgb), 0.08));
        color: var(--primary-color);
        border: 1px solid rgba(var(--primary-rgb), 0.25);
      }

      &--blue {
        background: rgba(var(--primary-rgb), 0.12);
        color: var(--primary-soft-color);
        border: 1px solid rgba(var(--primary-rgb), 0.2);
      }

      &--purple {
        background: rgba(168, 85, 247, 0.12);
        color: #a855f7;
        border: 1px solid rgba(168, 85, 247, 0.2);
      }
    }

    &__meta {
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted-color);
      user-select: none;
    }

    &__dot {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: var(--text-muted-color);
    }

    &__visibility {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    &__more {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      cursor: pointer;
      color: var(--text-muted-color);
      border: none;
      background: transparent;
      transition: all 0.15s;

      &:hover {
        background: var(--card-bg-secondary-color);
      }
    }

    &__body {
      padding-left: 62px;
    }

    &__text {
      font-size: 15px;
      line-height: 1.75;
      color: var(--text-color);
      margin-bottom: 12px;
    }

    &__tag {
      color: var(--primary-color);
      cursor: pointer;
      font-weight: 500;

      &:hover {
        text-decoration: underline;
      }
    }

    &__images {
      display: grid;
      gap: 6px;
      margin-bottom: 12px;
      border-radius: 12px;
      overflow: hidden;

      &.cols-1 {
        grid-template-columns: 1fr;
      }

      &.cols-2 {
        grid-template-columns: repeat(2, 1fr);
      }

      &.cols-3 {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    &__img-wrap {
      position: relative;
      overflow: hidden;
      cursor: pointer;

      img {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        display: block;
        transition: transform 0.3s;
      }

      &:hover img {
        transform: scale(1.03);
      }
    }

    &__images.cols-1 &__img-wrap img {
      aspect-ratio: 16 / 9;
    }

    &__video-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.2);
    }

    &__play-btn {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 50%;

      &::after {
        content: '';
        display: block;
        width: 0;
        height: 0;
        border-left: 14px solid #000;
        border-top: 9px solid transparent;
        border-bottom: 9px solid transparent;
        margin: 14px 0 0 18px;
      }
    }

    &__location {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: var(--text-muted-color);
      padding: 4px 10px;
      background: var(--card-bg-secondary-color);
      border-radius: 8px;
      user-select: none;
    }

    &__actions {
      display: flex;
      align-items: center;
      padding-left: 62px;
      margin-top: 8px;
      gap: 4px;
    }

    &__action {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px 14px;
      border-radius: 10px;
      cursor: pointer;
      color: var(--text-muted-color);
      font-size: 12px;
      font-weight: 500;
      border: none;
      background: transparent;
      transition: all 0.15s;

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: var(--card-bg-secondary-color);
      }

      &.liked {
        color: var(--red);
      }
    }

    &__interactions {
      padding-left: 62px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    &__likes {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }

    &__like-avatars {
      display: flex;
      align-items: center;
    }

    &__like-avatar {
      margin-left: -8px;
      border: 2px solid var(--bg-secondary-color);

      &:first-child {
        margin-left: 0;
      }
    }

    &__like-more {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--card-bg-secondary-color);
      border: 2px solid var(--bg-secondary-color);
      margin-left: -8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted-color);
    }

    &__likes-text {
      font-size: 12px;
      color: var(--text-secondary-color);

      strong {
        color: var(--text-color);
        font-weight: 500;
      }
    }

    &__comments {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }

    &__comment {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      width: 100%;
    }

    &__comment-body {
      flex: 1;
      min-width: 0;
      width: 100%;
    }

    &__comment-content {
      width: 100%;
      box-sizing: border-box;
      background: var(--card-bg-secondary-color);
      border-radius: 10px;
      padding: 8px 12px;
    }

    &__comment-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted-color);
    }

    &__comment-text {
      font-size: 12px;
      color: var(--text-color);
      line-height: 1.5;
      margin-top: 2px;
    }

    &__reply-to {
      color: var(--primary-color);
      font-weight: 500;
      margin-right: 4px;
    }

    &__comment-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 4px;
      width: 100%;
      font-size: 11px;
      color: var(--text-secondary-color);
      user-select: none;
    }

    &__comment-action {
      cursor: pointer;
      font-weight: 500;

      &:hover {
        color: var(--primary-color);
      }
    }

    &__comment-like {
      display: flex;
      align-items: center;
      gap: 3px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--text-muted-color);
      font-size: 11px;
      padding: 0;

      svg {
        width: 12px;
        height: 12px;
      }

      &:hover,
      &.liked {
        color: var(--red);
      }
    }

    &__more-comments {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--primary-color);
      cursor: pointer;
      font-weight: 500;
      padding: 4px 0;
      border: none;
      background: transparent;

      &:hover {
        opacity: 0.8;
      }
    }

    &__comment-input {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
    }

    &__send {
      flex-shrink: 0;
    }
  }
</style>
