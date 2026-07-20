<template>
  <div class="group-notice">
    <ToolBar class="group-notice__toolbar">
      <div class="group-notice__toolbar-side" data-tauri-drag-region />
      <h1 class="group-notice__title" data-tauri-drag-region>
        {{ composeTitle }}
      </h1>
      <div class="group-notice__toolbar-side group-notice__toolbar-side--actions" data-tauri-drag-region>
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="closeCurrentWindow" />
      </div>
    </ToolBar>

    <template v-if="!isCompose">
      <div class="group-notice__actions">
        <n-button type="primary" size="small" class="group-notice__publish-btn" @click="openCompose">
          {{ t('groupNotice.publish') }}
        </n-button>
      </div>

      <n-scrollbar class="group-notice__scroll">
        <div v-if="noticeList.length" class="group-notice__list">
          <article v-for="item in noticeList" :key="item.id" class="group-notice__card">
            <div class="group-notice__card-meta">
              <span class="group-notice__author">{{ getAuthorName(item.publisherUserId) }}</span>
              <time class="group-notice__time">{{ formatNoticeTime(item.createdAt) }}</time>
              <span v-if="item.isTop" class="group-notice__pin">{{ t('groupNotice.pinned') }}</span>
              <div class="group-notice__card-ops">
                <button
                  type="button"
                  class="group-notice__card-op"
                  :aria-label="t('groupNotice.edit')"
                  @click="onEdit(item)">
                  <svg class="group-notice__card-op-icon" aria-hidden="true">
                    <use href="#edit" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="group-notice__card-op group-notice__card-op--danger"
                  :aria-label="t('groupNotice.delete')"
                  @click="onDelete(item)">
                  <svg class="group-notice__card-op-icon" aria-hidden="true">
                    <use href="#trash" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="group-notice__content" :class="{ 'group-notice__content--expanded': expandedIds.has(item.id) }">
              <p v-for="(line, index) in parseContentLines(item.content)" :key="index" class="group-notice__paragraph">
                <template v-for="(segment, segIndex) in line" :key="segIndex">
                  <a v-if="segment.type === 'link'" class="group-notice__link" href="javascript:void(0)">
                    {{ segment.text }}
                  </a>
                  <span v-else>{{ segment.text }}</span>
                </template>
              </p>
            </div>

            <button
              v-if="isExpandable(item.content)"
              type="button"
              class="group-notice__expand"
              @click="toggleExpand(item.id)">
              <span>{{ expandedIds.has(item.id) ? t('groupNotice.collapse') : t('groupNotice.expand') }}</span>
              <svg
                class="group-notice__expand-icon"
                :class="{ 'group-notice__expand-icon--expanded': expandedIds.has(item.id) }"
                aria-hidden="true">
                <use href="#right-arrow" />
              </svg>
            </button>
          </article>
        </div>
        <div v-else class="group-notice__empty">{{ t('groupNotice.empty') }}</div>
      </n-scrollbar>
    </template>

    <template v-else>
      <div class="group-notice__compose">
        <div class="group-notice__editor">
          <n-input
            v-model:value="composeContent"
            class="group-notice__textarea"
            type="textarea"
            :placeholder="t('groupNotice.composePlaceholder')"
            :maxlength="600"
            :autosize="{ minRows: 12, maxRows: 12 }" />
        </div>

        <div class="group-notice__compose-footer">
          <n-checkbox v-model:checked="composePinned" class="group-notice__pin-checkbox">
            {{ t('groupNotice.pinNotice') }}
          </n-checkbox>
          <div class="group-notice__compose-actions">
            <n-button
              type="primary"
              class="group-notice__compose-btn"
              :loading="publishing"
              :disabled="publishing"
              @click="onPublish">
              {{ isEditing ? t('groupNotice.save') : t('groupNotice.submit') }}
            </n-button>
            <n-button class="group-notice__compose-btn" :disabled="publishing" @click="closeCompose">
              {{ t('groupNotice.cancel') }}
            </n-button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { groupApi } from '@/api'
  import { useGroupNoticeStore } from '@/stores/chat/groupNotice'
  import { useNameStore } from '@/stores/user/name'
  import { usePeerInfoStore } from '@/stores/user/peerInfo'
  import type { GroupNotice } from '@/types/api/group'
  import { parseBackendTime } from '@/utils/common/time'
  import { closeCurrentWindow, minimizeCurrentWindow, ShowCurrentWindow } from '@/utils/desktop/window'

  interface NoticeSegment {
    type: 'text' | 'link'
    text: string
  }

  const URL_RE = /(https?:\/\/[^\s]+)/g

  const { t } = useI18n()
  const dialog = useDialog()
  const groupNoticeStore = useGroupNoticeStore()
  const nameStore = useNameStore()
  const peerInfoStore = usePeerInfoStore()

  const isCompose = ref(false)
  const editingNoticeId = ref('')
  const composeContent = ref('')
  const composePinned = ref(false)
  const publishing = ref(false)
  const expandedIds = ref<Set<string>>(new Set())
  const noticeList = ref<GroupNotice[]>([])
  const authorNames = ref<Record<string, string>>({})

  const isEditing = computed(() => !!editingNoticeId.value)
  const pageTitle = computed(() => groupNoticeStore.groupName || t('groupNotice.windowTitle'))
  const composeTitle = computed(() => {
    if (!isCompose.value) return pageTitle.value
    return isEditing.value ? t('groupNotice.editTitle') : t('groupNotice.publishTitle')
  })

  const pad = (n: number) => String(n).padStart(2, '0')

  const formatNoticeTime = (timeStr: string) => {
    const date = parseBackendTime(timeStr)
    if (Number.isNaN(date.getTime())) return ''
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const parseContentLines = (content: string): NoticeSegment[][] => {
    return content.split('\n').map((line) => {
      const parts = line.split(URL_RE)
      return parts
        .filter((part) => part.length > 0)
        .map((part) => ({
          type: /^https?:\/\//.test(part) ? ('link' as const) : ('text' as const),
          text: part
        }))
    })
  }

  const isExpandable = (content: string) => {
    const lines = content.split('\n')
    return lines.length > 3 || content.length > 90
  }

  const getAuthorName = (userId: string) => {
    return authorNames.value[userId] || userId
  }

  const resolveAuthorNames = (list: GroupNotice[]) => {
    const ids = [...new Set(list.map((item) => item.publisherUserId).filter(Boolean))]
    ids.forEach((userId) => {
      const cached = nameStore.getCachedName('user', userId)
      if (cached) {
        authorNames.value = { ...authorNames.value, [userId]: cached }
        return
      }
      nameStore.resolveName('user', userId).then((name) => {
        if (!name) return
        authorNames.value = { ...authorNames.value, [userId]: name }
      })
    })
  }

  const sortNotices = (list: GroupNotice[]) => {
    return [...list].sort((a, b) => {
      if (a.isTop !== b.isTop) return a.isTop ? -1 : 1
      return parseBackendTime(b.createdAt).getTime() - parseBackendTime(a.createdAt).getTime()
    })
  }

  const fetchNotices = () => {
    const groupId = groupNoticeStore.groupId
    if (!groupId) {
      noticeList.value = []
      return
    }

    groupApi.listNotices({ groupId }).then((res) => {
      if (res.code === 0 && res.data) {
        noticeList.value = sortNotices(res.data)
        resolveAuthorNames(noticeList.value)
      } else {
        noticeList.value = []
        window.$message.error(res.msg)
      }
    })
  }

  const refreshGroupInfo = () => {
    const groupId = groupNoticeStore.groupId
    if (!groupId) return
    peerInfoStore.refreshGroup(groupId)
  }

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    expandedIds.value = next
  }

  const openCompose = () => {
    editingNoticeId.value = ''
    composeContent.value = ''
    composePinned.value = false
    isCompose.value = true
  }

  const closeCompose = () => {
    isCompose.value = false
    editingNoticeId.value = ''
    composeContent.value = ''
    composePinned.value = false
  }

  const onEdit = (item: GroupNotice) => {
    editingNoticeId.value = item.id
    composeContent.value = item.content
    composePinned.value = item.isTop
    isCompose.value = true
  }

  const onDelete = (item: GroupNotice) => {
    dialog.warning({
      title: t('groupNotice.deleteConfirmTitle'),
      content: t('groupNotice.deleteConfirmContent'),
      positiveText: t('groupNotice.delete'),
      negativeText: t('groupNotice.cancel'),
      showIcon: false,
      positiveButtonProps: { type: 'error' },
      negativeButtonProps: { ghost: false, size: 'small' },
      onPositiveClick: () => {
        groupApi.deleteNotice({ noticeId: item.id }).then((res) => {
          if (res.code === 0) {
            if (expandedIds.value.has(item.id)) {
              const next = new Set(expandedIds.value)
              next.delete(item.id)
              expandedIds.value = next
            }
            fetchNotices()
            refreshGroupInfo()
          } else {
            window.$message.error(res.msg)
          }
        })
      }
    })
  }

  const onPublish = () => {
    const content = composeContent.value.trim()
    if (!content) {
      window.$message.error(t('groupNotice.contentRequired'))
      return
    }
    if (publishing.value) return

    const groupId = groupNoticeStore.groupId
    if (!isEditing.value && !groupId) return

    publishing.value = true

    const request = isEditing.value
      ? groupApi.updateNotice({
          noticeId: editingNoticeId.value,
          content,
          isTop: composePinned.value
        })
      : groupApi.addNotice({
          groupId,
          content,
          isTop: composePinned.value
        })

    request
      .then((res) => {
        if (res.code === 0) {
          closeCompose()
          fetchNotices()
          refreshGroupInfo()
        } else {
          window.$message.error(res.msg)
        }
      })
      .finally(() => {
        publishing.value = false
      })
  }

  watch(
    () => groupNoticeStore.groupId,
    () => {
      closeCompose()
      expandedIds.value = new Set()
      fetchNotices()
    },
    { immediate: true }
  )

  onMounted(() => {
    nextTick(() => {
      ShowCurrentWindow()
    })
  })
</script>

<style scoped lang="scss">
  .group-notice {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    background: var(--bg-secondary-color);
    color: var(--text-color);
    box-sizing: border-box;

    &__toolbar {
      display: flex;
      align-items: center;
      height: 42px;
      padding: 0 8px;
      flex-shrink: 0;
      box-sizing: border-box;
      border-bottom: 1px solid var(--divider-color);
    }

    &__toolbar-side {
      flex: 1;
      min-width: 0;

      &--actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
      }
    }

    &__title {
      margin: 0;
      max-width: 50%;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
      line-height: 1.4;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
      padding: 12px 12px 0;
      box-sizing: border-box;
    }

    &__publish-btn {
      height: 28px;
      padding: 0 12px;
      border-radius: 4px;
      font-size: 12px;
    }

    &__scroll {
      flex: 1;
      min-height: 0;
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      box-sizing: border-box;
    }

    &__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 240px;
      padding: 24px;
      font-size: 13px;
      color: var(--text-secondary-color);
      box-sizing: border-box;
    }

    &__card {
      position: relative;
      padding: 14px 16px 12px;
      border-radius: 8px;
      background: var(--bg-primary-color);
      border: 1px solid color-mix(in srgb, var(--border-color) 45%, transparent);
      box-sizing: border-box;

      html[data-theme='dark'] & {
        background: color-mix(in srgb, var(--card-bg-color) 28%, var(--bg-secondary-color));
        border-color: color-mix(in srgb, var(--border-color) 35%, transparent);
      }

      &:hover .group-notice__card-ops {
        opacity: 1;
        pointer-events: auto;
      }
    }

    &__card-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      min-width: 0;
    }

    &__card-ops {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-left: auto;
      flex-shrink: 0;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
    }

    &__card-op {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      padding: 0;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text-secondary-color);
      cursor: pointer;
      transition:
        color 0.15s ease,
        background 0.15s ease;

      &:hover {
        color: var(--primary-color);
        background: color-mix(in srgb, var(--card-bg-color) 70%, transparent);
      }

      &--danger:hover {
        color: var(--red);
        background: color-mix(in srgb, var(--red) 12%, transparent);
      }
    }

    &__card-op-icon {
      width: 15px;
      height: 15px;
    }

    &__author {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-color);
      line-height: 1.4;
    }

    &__time {
      flex-shrink: 0;
      font-size: 12px;
      color: var(--text-secondary-color);
      line-height: 1.4;
    }

    &__pin {
      flex-shrink: 0;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 11px;
      line-height: 1.4;
      color: var(--primary-color);
      background: rgba(var(--primary-rgb), 0.12);
    }

    &__content {
      font-size: 13px;
      line-height: 1.7;
      color: var(--text-color);
      word-break: break-word;

      &:not(&--expanded) {
        display: -webkit-box;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        line-clamp: 3;
      }
    }

    &__paragraph {
      margin: 0;
    }

    &__link {
      color: var(--primary-color);
      text-decoration: none;

      &:hover {
        opacity: 0.85;
      }
    }

    &__expand {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 2px;
      width: 100%;
      margin-top: 8px;
      padding: 0;
      border: none;
      background: transparent;
      font-size: 12px;
      color: var(--primary-color);
      cursor: pointer;

      &:hover {
        opacity: 0.85;
      }
    }

    &__expand-icon {
      width: 12px;
      height: 12px;
      transform: rotate(90deg);
      transition: transform 0.2s ease;

      &--expanded {
        transform: rotate(-90deg);
      }
    }

    &__compose {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      background: var(--bg-primary-color);

      html[data-theme='dark'] & {
        background: color-mix(in srgb, var(--card-bg-color) 22%, var(--bg-secondary-color));
      }
    }

    &__editor {
      position: relative;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      padding: 16px;
      box-sizing: border-box;
    }

    &__textarea {
      flex: 1;
      height: 100%;

      :deep(.n-input) {
        height: 100%;
      }

      :deep(.n-input-wrapper) {
        padding: 0;
        background: transparent;
      }

      :deep(.n-input__border),
      :deep(.n-input__state-border) {
        border: none !important;
        box-shadow: none !important;
      }

      :deep(.n-input__placeholder),
      :deep(.n-input__textarea-el) {
        padding: 12px 14px;
        box-sizing: border-box;
        font-size: 14px;
        line-height: 1.7;
      }

      :deep(.n-input__textarea-el) {
        height: 100% !important;
        min-height: 100% !important;
        color: var(--text-color);
        resize: none;

        &::placeholder {
          color: var(--text-secondary-color);
        }
      }

      :deep(.n-input__placeholder) {
        color: var(--text-secondary-color);
      }
    }

    &__compose-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-shrink: 0;
      padding: 12px 16px 16px;
      border-top: 1px solid var(--divider-color);
      box-sizing: border-box;
    }

    &__pin-checkbox {
      color: var(--text-color);

      :deep(.n-checkbox__label) {
        color: var(--text-color);
      }
    }

    &__compose-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    &__compose-btn {
      min-width: 72px;
      height: 32px;
      border-radius: 4px;
    }
  }
</style>
