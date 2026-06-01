<template>
  <n-modal v-model:show="visible" :mask-closable="false" transform-origin="center" @after-leave="resetForm">
    <div class="moment-compose">
      <div class="moment-compose__header">
        <span class="moment-compose__title">{{ t('moment.compose.title') }}</span>
        <button type="button" class="moment-compose__close" @click="visible = false">
          <svg class="size-18px"><use href="#close"></use></svg>
        </button>
      </div>

      <div class="moment-compose__body">
        <n-scrollbar class="moment-compose__body-scroll">
          <div class="moment-compose__body-inner">
            <div class="moment-compose__user">
              <Avatar :id="userId" class="size-40px rounded-12px bg-#FFF shrink-0" />
              <div class="moment-compose__user-main">
                <div class="moment-compose__name">{{ username }}</div>
                <div class="moment-compose__visibility-row">
                  <n-dropdown
                    :options="visibilityOptions"
                    trigger="click"
                    placement="bottom-start"
                    @select="onVisibilitySelect">
                    <button type="button" class="moment-compose__visibility">
                      <svg class="size-12px">
                        <use :href="`#${visibilityIconName}`" />
                      </svg>
                      <span>{{ selectedVisibilityLabel }}</span>
                    </button>
                  </n-dropdown>
                  <n-popover
                    v-if="needsUserPicker"
                    v-model:show="showContactPicker"
                    trigger="click"
                    placement="bottom-start"
                    :width="300"
                    :show-arrow="false"
                    to="body">
                    <template #trigger>
                      <button type="button" class="moment-compose__pick-users">
                        {{ t('moment.compose.selectUsers') }}
                      </button>
                    </template>
                    <div class="moment-compose__popover-panel">
                      <p class="moment-compose__popover-hint">{{ visibilityPickerHint }}</p>
                      <n-input
                        v-model:value="contactSearch"
                        size="small"
                        clearable
                        :placeholder="t('moment.compose.searchContact')" />
                      <div class="moment-compose__popover-list-wrap">
                        <n-spin :show="contactsLoading" size="small" class="moment-compose__popover-spin">
                          <n-scrollbar class="moment-compose__popover-list">
                            <div
                              v-if="!contactsLoading && filteredContacts.length === 0"
                              class="moment-compose__popover-empty">
                              {{ contactSearch ? t('moment.compose.noSearchResult') : t('moment.compose.noContacts') }}
                            </div>
                            <div v-else class="moment-compose__popover-options">
                              <div
                                v-for="contact in filteredContacts"
                                :key="contact.peerId"
                                role="button"
                                tabindex="0"
                                class="moment-compose__contact"
                                :class="{
                                  'moment-compose__contact--active': selectedPeerIds.includes(contact.peerId)
                                }"
                                @click="togglePeer(contact.peerId)"
                                @keydown.enter.prevent="togglePeer(contact.peerId)"
                                @keydown.space.prevent="togglePeer(contact.peerId)">
                                <n-checkbox
                                  class="moment-compose__contact-check"
                                  :checked="selectedPeerIds.includes(contact.peerId)" />
                                <Avatar :id="contact.peerId" class="size-32px rounded-8px shrink-0" />
                                <div class="moment-compose__contact-info">
                                  <span class="moment-compose__contact-name">
                                    {{ getContactDisplayName(contact) }}
                                  </span>
                                  <span v-if="contact.emotionName" class="moment-compose__contact-meta">
                                    {{ contact.emotionName }}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </n-scrollbar>
                        </n-spin>
                      </div>
                    </div>
                  </n-popover>
                </div>
                <div v-if="needsUserPicker && selectedPeerIds.length" class="moment-compose__selected-tags">
                  <span v-for="peerId in selectedPeerIds" :key="peerId" class="moment-compose__selected-tag">
                    {{ getPeerLabel(peerId) }}
                    <button type="button" class="moment-compose__selected-tag-remove" @click="removePeer(peerId)">
                      <svg class="size-10px"><use href="#close" /></svg>
                    </button>
                  </span>
                </div>
              </div>
            </div>

            <n-input
              v-model:value="content"
              type="textarea"
              :autosize="{ minRows: 4, maxRows: 4 }"
              class="moment-compose__textarea"
              :placeholder="t('moment.compose.placeholder')"
              :maxlength="maxLength" />

            <div class="moment-compose__media">
              <div class="moment-compose__media-grid">
                <div v-for="(img, i) in mediaList" :key="i" class="moment-compose__media-item">
                  <img :src="img" alt="" />
                  <button type="button" class="moment-compose__media-remove" @click="removeMedia(i)">
                    <svg class="moment-compose__media-remove-icon">
                      <use href="#close" />
                    </svg>
                  </button>
                </div>
                <button
                  v-if="mediaList.length < 9"
                  type="button"
                  class="moment-compose__add-media"
                  :disabled="uploadingMedia"
                  @click="pickAndUploadMedia">
                  <svg class="size-24px">
                    <use href="#image"></use>
                  </svg>
                  <span>{{ uploadingMedia ? t('moment.compose.uploading') : t('moment.compose.addImage') }}</span>
                </button>
              </div>
            </div>
          </div>
        </n-scrollbar>
      </div>

      <div class="moment-compose__footer">
        <div class="moment-compose__tools">
          <n-tooltip v-for="tool in composeTools" :key="tool.key" :show-arrow="false">
            <template #trigger>
              <button type="button" class="moment-compose__tool" @click="onToolClick(tool.key)">
                <svg class="size-20px">
                  <use :href="`#${tool.icon}`" />
                </svg>
              </button>
            </template>
            {{ tool.label }}
          </n-tooltip>
        </div>
        <div class="flex items-center">
          <span class="moment-compose__count">{{ content.length }}/{{ maxLength }}</span>
          <n-button type="primary" round :disabled="!canSubmit" :loading="submitting" @click="submit">
            {{ t('moment.compose.submit') }}
          </n-button>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { open } from '@tauri-apps/plugin-dialog'
  import { contactsApi, momentApi, storageApi } from '@/api'
  import type { Contact } from '@/types/api/contacts'
  import type { MomentCreateParam, MomentVisibleType } from '@/types/api/moment'
  import { useI18n } from 'vue-i18n'

  const visible = defineModel<boolean>('show', { default: false })

  defineProps<{
    userId: string
    username: string
  }>()

  const emit = defineEmits<{
    success: []
  }>()

  const { t } = useI18n()
  const maxLength = 500
  const content = ref('')
  const visibility = ref<MomentVisibleType>('all')
  const selectedPeerIds = ref<string[]>([])
  const contacts = ref<Contact[]>([])
  const contactSearch = ref('')
  const contactsLoading = ref(false)
  const showContactPicker = ref(false)
  const mediaList = ref<string[]>([])
  const uploadingMedia = ref(false)
  const submitting = ref(false)
  const needsUserPicker = computed(() => visibility.value === 'include' || visibility.value === 'exclude')

  const canSubmit = computed(() => {
    if (!content.value.trim() || submitting.value) return false
    if (needsUserPicker.value && selectedPeerIds.value.length === 0) return false
    return true
  })

  const visibilityOptions = computed(() => [
    { label: () => t('moment.visibility.all'), key: 'all' },
    { label: () => t('moment.visibility.private'), key: 'private' },
    { label: () => t('moment.visibility.include'), key: 'include' },
    { label: () => t('moment.visibility.exclude'), key: 'exclude' }
  ])

  const selectedVisibilityLabel = computed(() => {
    const map: Record<MomentVisibleType, string> = {
      all: t('moment.visibility.all'),
      private: t('moment.visibility.private'),
      include: t('moment.visibility.include'),
      exclude: t('moment.visibility.exclude')
    }
    let label = map[visibility.value]
    if (needsUserPicker.value && selectedPeerIds.value.length > 0) {
      label += t('moment.compose.selectedCountSuffix', { count: selectedPeerIds.value.length })
    }
    return label
  })

  const visibilityPickerHint = computed(() =>
    visibility.value === 'include'
      ? t('moment.compose.selectUsersHintInclude')
      : t('moment.compose.selectUsersHintExclude')
  )

  const filteredContacts = computed(() => {
    const keyword = contactSearch.value.trim().toLowerCase()
    if (!keyword) return contacts.value
    return contacts.value.filter((contact) => {
      const name = getContactDisplayName(contact).toLowerCase()
      return name.includes(keyword) || contact.peerId.includes(keyword)
    })
  })

  const visibilityIconMap: Record<MomentVisibleType, string> = {
    all: 'visibility-all',
    private: 'visibility-private',
    include: 'visibility-include',
    exclude: 'visibility-exclude'
  }

  const visibilityIconName = computed(() => visibilityIconMap[visibility.value])

  const composeTools = computed(() => [
    { key: 'image', label: t('moment.compose.tools.image'), icon: 'image' },
    { key: 'location', label: t('moment.compose.tools.location'), icon: 'location' },
    { key: 'emoji', label: t('moment.compose.tools.emoji'), icon: 'emotion' }
  ])

  const getContactDisplayName = (contact: Contact) => contact.remark || contact.username

  const getPeerLabel = (peerId: string) => {
    const contact = contacts.value.find((item) => item.peerId === peerId)
    return contact ? getContactDisplayName(contact) : peerId
  }

  const fetchContacts = async () => {
    if (contactsLoading.value) return
    contactsLoading.value = true
    try {
      const res = await contactsApi.friendList()
      if (res.code === 0 && res.data) {
        contacts.value = res.data
      } else {
        window.$message.error(res.msg || t('moment.compose.loadContactsFailed'))
      }
    } catch {
      window.$message.error(t('moment.compose.loadContactsFailed'))
    } finally {
      contactsLoading.value = false
    }
  }

  const onVisibilitySelect = async (key: string) => {
    const next = key as MomentVisibleType
    visibility.value = next
    if (next !== 'include' && next !== 'exclude') {
      selectedPeerIds.value = []
      showContactPicker.value = false
      return
    }
    if (contacts.value.length === 0) {
      await fetchContacts()
    }
    await nextTick()
    showContactPicker.value = true
  }

  const togglePeer = (peerId: string) => {
    if (selectedPeerIds.value.includes(peerId)) {
      removePeer(peerId)
    } else {
      selectedPeerIds.value.push(peerId)
    }
  }

  const removePeer = (peerId: string) => {
    selectedPeerIds.value = selectedPeerIds.value.filter((id) => id !== peerId)
  }

  watch(visible, (show) => {
    if (show && needsUserPicker.value && contacts.value.length === 0) {
      void fetchContacts()
    }
  })

  const pickAndUploadMedia = async () => {
    const remaining = 9 - mediaList.value.length
    if (remaining <= 0 || uploadingMedia.value) return

    const selected = await open({
      multiple: true,
      title: t('moment.compose.addImage'),
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
    })
    if (!selected) return

    const paths = (Array.isArray(selected) ? selected : [selected]).slice(0, remaining)
    uploadingMedia.value = true
    try {
      for (const path of paths) {
        const res = await storageApi.upload<string>(path)
        if (res.code !== 0 || !res.data) {
          window.$message.error(res.msg || t('moment.compose.uploadFailed'))
          continue
        }
        mediaList.value.push(res.data)
      }
    } catch {
      window.$message.error(t('moment.compose.uploadFailed'))
    } finally {
      uploadingMedia.value = false
    }
  }

  const removeMedia = (index: number) => {
    mediaList.value.splice(index, 1)
  }

  const onToolClick = (key: string) => {
    if (key === 'image') pickAndUploadMedia()
    else if (key === 'topic' && !content.value.includes('#')) content.value += ' #'
    else window.$message.info(t('moment.compose.tools.todo'))
  }

  const buildCreateParam = (): MomentCreateParam => {
    const param: MomentCreateParam = {
      textContent: content.value.trim(),
      visibleType: visibility.value
    }
    if (mediaList.value.length > 0) {
      param.MediaContent = mediaList.value.map((url, index) => ({
        url,
        thumbUrl: url,
        mediaType: 'img',
        Sort: index + 1
      }))
    }
    if (needsUserPicker.value) {
      param.visibleUserIds = [...selectedPeerIds.value]
    }
    return param
  }

  const submit = async () => {
    if (!canSubmit.value) return
    submitting.value = true
    try {
      const res = await momentApi.create(buildCreateParam())
      if (res.code !== 0) {
        window.$message.error(res.msg || t('moment.compose.submitFailed'))
        return
      }
      window.$message.success(t('moment.compose.successTitle'))
      visible.value = false
      emit('success')
    } catch {
      window.$message.error(t('moment.compose.submitFailed'))
    } finally {
      submitting.value = false
    }
  }

  const resetForm = () => {
    content.value = ''
    visibility.value = 'all'
    selectedPeerIds.value = []
    contactSearch.value = ''
    showContactPicker.value = false
    mediaList.value = []
    uploadingMedia.value = false
    submitting.value = false
  }
</script>

<style scoped lang="scss">
  .moment-compose {
    display: flex;
    flex-direction: column;
    width: 560px;
    max-width: 90vw;
    max-height: 85vh;
    background: var(--bg-secondary-color);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    overflow: hidden;

    &__header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
    }

    &__title {
      font-size: 17px;
      font-weight: 600;
      color: var(--text-color);
    }

    &__close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      cursor: pointer;
      color: var(--text-muted-color);
      border: none;
      background: transparent;
      transition: all 0.15s;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 80%, transparent);
        color: var(--text-color);
      }
    }

    &__body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    &__body-scroll {
      height: 100%;

      :deep(.n-scrollbar-rail) {
        right: 2px;
      }
    }

    &__body-inner {
      padding: 20px 24px;
      box-sizing: border-box;
    }

    &__user {
      flex-shrink: 0;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }

    &__user-main {
      min-width: 0;
      flex: 1;
    }

    &__name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-color);
    }

    &__visibility-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 2px;
    }

    &__visibility {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--text-muted-color);
      cursor: pointer;
      padding: 3px 8px;
      border-radius: 6px;
      border: none;
      background: transparent;
      transition: background 0.15s;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 80%, transparent);
      }
    }

    &__pick-users {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--primary-color);
      cursor: pointer;
      padding: 3px 8px;
      border-radius: 6px;
      border: none;
      background: color-mix(in srgb, var(--primary-color) 10%, transparent);
      transition: background 0.15s;

      &:hover {
        background: color-mix(in srgb, var(--primary-color) 18%, transparent);
      }
    }

    &__pick-users-badge {
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      font-size: 10px;
      line-height: 16px;
      text-align: center;
      color: #fff;
      background: var(--primary-color);
      border-radius: 999px;
    }

    &__selected-tags {
      display: flex;
      flex-wrap: nowrap;
      gap: 6px;
      margin-top: 6px;
      max-width: 100%;
      overflow-x: auto;
      padding-bottom: 2px;
    }

    &__selected-tag {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      max-width: 120px;
      padding: 2px 8px;
      font-size: 11px;
      color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color) 12%, transparent);
      border-radius: 999px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__selected-tag-remove {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      padding: 0;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      color: inherit;
      background: transparent;
      opacity: 0.7;

      &:hover {
        opacity: 1;
      }
    }

    &__popover-panel {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &__popover-hint {
      margin: 0;
      font-size: 12px;
      color: var(--text-muted-color);
      line-height: 1.4;
    }

    &__popover-list-wrap {
      height: 280px;
      overflow: hidden;
    }

    &__popover-spin {
      height: 100%;

      :deep(.n-spin-container) {
        height: 100%;
      }

      :deep(.n-spin-content) {
        height: 100%;
      }
    }

    &__popover-list {
      height: 280px;

      :deep(.n-scrollbar) {
        height: 280px;
        max-height: 280px;
      }

      :deep(.n-scrollbar-container) {
        height: 280px;
        max-height: 280px;
      }

      :deep(.n-scrollbar-content) {
        min-height: min-content;
      }
    }

    &__popover-empty {
      padding: 24px 8px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted-color);
    }

    &__popover-options {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-right: 4px;
    }

    &__contact {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border-radius: 8px;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 80%, transparent);
      }

      &--active {
        background: color-mix(in srgb, var(--primary-color) 8%, transparent);
      }
    }

    &__contact-check {
      flex-shrink: 0;
      pointer-events: none;
    }

    &__contact-info {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    &__contact-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__contact-meta {
      font-size: 11px;
      color: var(--text-muted-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__textarea {
      flex-shrink: 0;
      width: 100%;
      background-color: transparent;

      :deep(.n-input__border),
      :deep(.n-input__state-border) {
        display: none;
      }

      :deep(.n-input__textarea-el) {
        font-size: 14px;
        color: var(--text-color);
        resize: none;

        &::placeholder {
          color: var(--text-muted-color);
        }
      }
    }

    &__media {
      margin-top: 12px;
      padding-bottom: 4px;
    }

    &__media-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    &__media-item {
      aspect-ratio: 1;
      border-radius: 12px;
      overflow: hidden;
      position: relative;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    &__media-remove {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 24px;
      height: 24px;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      &-icon {
        width: 14px;
        height: 14px;
        color: #fff;
      }
    }

    &__add-media {
      aspect-ratio: 1;
      border-radius: 12px;
      border: 2px dashed var(--border-color);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
      color: var(--text-muted-color);
      background: transparent;
      transition: all 0.15s;

      &:hover:not(:disabled) {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      span {
        font-size: 11px;
      }
    }

    &__footer {
      flex-shrink: 0;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    &__tools {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    &__tool {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      cursor: pointer;
      color: var(--text-muted-color);
      border: none;
      background: transparent;
      transition: all 0.15s;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 80%, transparent);
        color: var(--primary-color);
      }
    }

    &__count {
      font-size: 12px;
      color: var(--text-muted-color);
      margin-right: 12px;
    }
  }
</style>
