<template>
  <div class="file-preview">
    <ToolBar class="file-preview__toolbar" @maximized="(is) => (isMaximized = is)">
      <div class="file-preview__title-wrap" data-tauri-drag-region>
        <img v-if="fileIconSrc" class="file-preview__title-icon" :src="fileIconSrc" alt="" draggable="false" />
        <h1 class="file-preview__title" :title="fileName">{{ fileName || t('filePreview.title') }}</h1>
        <span v-if="config" class="file-preview__type">{{ config.extension.toUpperCase() }}</span>
      </div>
      <div class="file-preview__window-actions">
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton
          :href="isMaximized ? '#restore' : '#maximize'"
          @click="() => restoreOrMaximizeCurrentWindow().then((wasMaximized) => (isMaximized = !wasMaximized))" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="closeCurrentWindow" />
      </div>
    </ToolBar>

    <main class="file-preview__body">
      <div v-if="state === 'loading'" class="file-preview__status">
        <n-progress
          class="file-preview__progress"
          type="line"
          :percentage="loadProgress"
          :show-indicator="false"
          :height="4"
          :border-radius="2" />
        <span class="file-preview__status-title">{{ t('filePreview.loading') }}</span>
        <span class="file-preview__status-desc">{{ t('filePreview.loadingHint') }}</span>
      </div>

      <div v-else-if="state === 'unsupported'" class="file-preview__status">
        <svg class="file-preview__status-icon" aria-hidden="true"><use href="#document"></use></svg>
        <span class="file-preview__status-title">{{ t('filePreview.unsupported') }}</span>
        <span class="file-preview__status-desc">{{ unsupportedHint }}</span>
      </div>

      <div v-else-if="state === 'too-large'" class="file-preview__status">
        <svg class="file-preview__status-icon" aria-hidden="true"><use href="#info"></use></svg>
        <span class="file-preview__status-title">{{ t('filePreview.tooLarge') }}</span>
        <span v-if="config" class="file-preview__status-desc">
          {{ t('filePreview.tooLargeHint', { limit: formatPreviewLimit(config.maxBytes) }) }}
        </span>
      </div>

      <div v-else-if="state === 'failed'" class="file-preview__status">
        <svg class="file-preview__status-icon" aria-hidden="true"><use href="#info"></use></svg>
        <span class="file-preview__status-title">{{ t('filePreview.failed') }}</span>
        <span class="file-preview__status-desc">{{ t('filePreview.failedHint') }}</span>
        <n-button type="primary" size="small" @click="loadPreview">{{ t('filePreview.retry') }}</n-button>
      </div>

      <template v-else-if="config">
        <n-scrollbar v-if="config.kind === 'markdown'" class="file-preview__scroll">
          <article class="file-preview__markdown" v-html="renderedMarkdown"></article>
        </n-scrollbar>

        <n-scrollbar v-else-if="config.kind === 'text'" class="file-preview__scroll">
          <pre class="file-preview__code"><code v-html="renderedText"></code></pre>
        </n-scrollbar>

        <div v-else-if="config.kind === 'image'" class="file-preview__media">
          <img class="file-preview__image" :src="objectUrl" :alt="fileName" />
        </div>

        <div v-else-if="config.kind === 'video'" class="file-preview__media file-preview__media-dark">
          <video class="file-preview__video" :src="objectUrl" controls autoplay />
        </div>

        <div v-else-if="config.kind === 'audio'" class="file-preview__media">
          <div class="file-preview__audio-card">
            <img class="file-preview__audio-icon" :src="fileIconSrc" alt="" draggable="false" />
            <span class="file-preview__audio-name">{{ fileName }}</span>
            <audio class="file-preview__audio" :src="objectUrl" controls autoplay />
          </div>
        </div>

        <div v-else-if="config.kind === 'pdf'" class="file-preview__pdf">
          <VueOfficePdf :src="sourceBuffer" @error="onOfficeError" />
        </div>

        <div v-else-if="config.kind === 'word'" class="file-preview__word">
          <VueOfficeDocx :src="sourceBuffer" @error="onOfficeError" />
        </div>

        <div v-else-if="config.kind === 'sheet'" class="file-preview__sheet">
          <VueOfficeExcel :src="sourceBuffer" @error="onOfficeError" />
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
  import '@vue-office/docx/lib/index.css'
  import '@vue-office/excel/lib/index.css'
  import hljs from 'highlight.js/lib/common'
  import MarkdownIt from 'markdown-it'
  import { useI18n } from 'vue-i18n'
  import { useRoute } from 'vue-router'
  import {
    closeCurrentWindow,
    minimizeCurrentWindow,
    restoreOrMaximizeCurrentWindow,
    ShowCurrentWindow
  } from '@/utils/desktop/window'
  import { getDriveListFileIconUrl } from '@/utils/file/fileIcon'
  import {
    formatPreviewLimit,
    isFilePreviewTooLarge,
    normalizeFileExtension,
    resolveFilePreviewConfig
  } from '@/utils/file/filePreview'
  import { BinarySizeLimitError, fetchBinaryWithLimit } from '@/utils/network/http'

  type PreviewState = 'loading' | 'ready' | 'unsupported' | 'too-large' | 'failed'

  const VueOfficeDocx = defineAsyncComponent(() => import('@vue-office/docx'))
  const VueOfficeExcel = defineAsyncComponent(() => import('@vue-office/excel'))
  const VueOfficePdf = defineAsyncComponent(() => import('@vue-office/pdf'))

  const { t } = useI18n()
  const route = useRoute()
  const isMaximized = ref(false)
  const state = ref<PreviewState>('loading')
  const loadProgress = ref(0)
  const sourceBuffer = shallowRef<ArrayBuffer | null>(null)
  const objectUrl = ref('')
  const textContent = ref('')

  const readQuery = (value: unknown) => {
    if (Array.isArray(value)) return String(value[0] ?? '')
    return typeof value === 'string' ? value : ''
  }

  const sourceUrl = computed(() => readQuery(route.query.url))
  const fileType = computed(() => readQuery(route.query.type))
  const fileName = computed(() => readQuery(route.query.name) || `${t('filePreview.title')}.${fileType.value}`)
  const fileSize = computed(() => Number(readQuery(route.query.size)) || 0)
  const config = computed(() => resolveFilePreviewConfig(fileName.value, fileType.value))
  const extension = computed(() => normalizeFileExtension(fileName.value, fileType.value))
  const unsupportedHint = computed(() =>
    extension.value === 'doc' ? t('filePreview.legacyWordHint') : t('filePreview.unsupportedHint')
  )
  const fileIconSrc = computed(() => getDriveListFileIconUrl(fileName.value))

  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }
      return entities[character]
    })

  const highlightText = (value: string, language: string) => {
    const normalizedLanguage = language === 'yml' ? 'yaml' : language
    if (!normalizedLanguage || !hljs.getLanguage(normalizedLanguage)) return escapeHtml(value)
    return hljs.highlight(value, { language: normalizedLanguage, ignoreIllegals: true }).value
  }

  const markdown = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
    highlight: (code, language) => highlightText(code, language)
  })

  const originalLinkOpen =
    markdown.renderer.rules.link_open ??
    ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options))
  markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
    tokens[index].attrSet('target', '_blank')
    tokens[index].attrSet('rel', 'noreferrer noopener')
    return originalLinkOpen(tokens, index, options, env, self)
  }

  const renderedMarkdown = computed(() => markdown.render(textContent.value))
  const renderedText = computed(() => highlightText(textContent.value, config.value?.extension ?? ''))

  const releaseObjectUrl = () => {
    if (!objectUrl.value) return
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = ''
  }

  const decodeText = (buffer: ArrayBuffer, extension: string) => {
    const decoded = new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '')
    if (extension !== 'json') return decoded
    try {
      return JSON.stringify(JSON.parse(decoded), null, 2)
    } catch {
      return decoded
    }
  }

  const usePreviewBuffer = (buffer: ArrayBuffer) => {
    const currentConfig = config.value
    if (!currentConfig) return
    if (currentConfig.kind === 'text' || currentConfig.kind === 'markdown') {
      textContent.value = decodeText(buffer, currentConfig.extension)
    } else if (currentConfig.kind === 'word' || currentConfig.kind === 'sheet' || currentConfig.kind === 'pdf') {
      sourceBuffer.value = buffer
    } else {
      objectUrl.value = URL.createObjectURL(new Blob([buffer], { type: currentConfig.mimeType }))
    }
  }

  const loadPreview = () => {
    releaseObjectUrl()
    sourceBuffer.value = null
    textContent.value = ''
    loadProgress.value = 0

    const currentConfig = config.value
    if (!sourceUrl.value || !currentConfig) {
      state.value = 'unsupported'
      return
    }
    if (isFilePreviewTooLarge(fileSize.value, currentConfig)) {
      state.value = 'too-large'
      return
    }

    state.value = 'loading'
    fetchBinaryWithLimit(sourceUrl.value, currentConfig.maxBytes, (progress) => {
      loadProgress.value = progress
    })
      .then((buffer) => {
        usePreviewBuffer(buffer)
        state.value = 'ready'
      })
      .catch((error: unknown) => {
        state.value = error instanceof BinarySizeLimitError ? 'too-large' : 'failed'
      })
  }

  const onOfficeError = () => {
    state.value = 'failed'
  }

  onMounted(() => {
    ShowCurrentWindow()
    loadPreview()
  })

  onBeforeUnmount(() => {
    releaseObjectUrl()
  })
</script>

<style scoped lang="scss">
  .file-preview {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    color: var(--text-color);
    background: var(--bg-primary-color);

    &__toolbar {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      height: 38px;
      padding: 0 3px;
      box-sizing: border-box;
      border-bottom: 1px solid var(--border-color);
    }

    &__title-wrap {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      height: 100%;
      padding-left: 9px;
      gap: 8px;
    }

    &__title-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      object-fit: contain;
      pointer-events: none;
    }

    &__title {
      min-width: 0;
      margin: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 13px;
      font-weight: 500;
    }

    &__type {
      flex-shrink: 0;
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-secondary-color);
      background: var(--button-soft-bg);
      font-size: 10px;
      line-height: 14px;
    }

    &__window-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    &__body {
      position: relative;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      background: var(--bg-secondary-color);
    }

    &__status {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      width: 100%;
      height: 100%;
      gap: 10px;
      padding: 24px;
      box-sizing: border-box;
      text-align: center;
    }

    &__progress {
      width: 240px;
      margin-bottom: 8px;
    }

    &__status-icon {
      width: 52px;
      height: 52px;
      margin-bottom: 6px;
      color: var(--text-secondary-color);
    }

    &__status-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color);
    }

    &__status-desc {
      max-width: 460px;
      font-size: 13px;
      line-height: 20px;
      color: var(--text-secondary-color);
    }

    &__scroll {
      width: 100%;
      height: 100%;
    }

    &__markdown,
    &__code {
      width: min(960px, calc(100% - 32px));
      min-height: calc(100% - 32px);
      margin: 16px auto;
      padding: 36px 44px;
      border: 1px solid color-mix(in srgb, var(--border-color) 88%, transparent);
      border-radius: 6px;
      box-sizing: border-box;
      color: var(--text-color);
      background: var(--bg-primary-color);
      user-select: text;
    }

    &__code {
      overflow: visible;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: Consolas, 'Cascadia Mono', Monaco, monospace;
      font-size: 13px;
      line-height: 1.8;
      tab-size: 2;
    }

    &__media {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 24px;
      box-sizing: border-box;
    }

    &__media-dark {
      background: var(--bg-secondary-color);
    }

    &__image,
    &__video {
      display: block;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    &__video {
      width: 100%;
      height: 100%;
    }

    &__audio-card {
      display: flex;
      align-items: center;
      flex-direction: column;
      width: min(520px, 90%);
      padding: 40px;
      gap: 16px;
      border: 1px solid var(--border-color);
      border-radius: 14px;
      box-sizing: border-box;
      background: var(--bg-primary-color);
    }

    &__audio-icon {
      width: 72px;
      height: 72px;
      object-fit: contain;
    }

    &__audio-name {
      max-width: 100%;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 14px;
    }

    &__audio {
      width: 100%;
    }

    &__pdf,
    &__word {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--bg-secondary-color);
    }

    &__pdf {
      :deep(.vue-office-pdf) {
        width: 100%;
        height: 100%;
        background: var(--bg-secondary-color);
      }

      :deep(.vue-office-pdf-wrapper) {
        padding: 16px 0 !important;
        background: var(--bg-secondary-color) !important;
      }
    }

    &__word {
      :deep(.vue-office-docx) {
        width: 100%;
        height: 100%;
        background: var(--bg-secondary-color);
      }

      :deep(.docx-wrapper) {
        min-height: 100%;
        padding: 16px !important;
        padding-bottom: 0 !important;
        box-sizing: border-box;
        background: var(--bg-secondary-color) !important;
      }

      :deep(.docx-wrapper > section.docx) {
        margin: 0 auto 16px;
        box-shadow: none !important;
      }
    }

    &__sheet {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--bg-primary-color);

      :deep(.vue-office-excel) {
        height: 100%;
      }
    }

    :deep(.file-preview__markdown) {
      font-size: 15px;
      line-height: 1.8;

      h1,
      h2,
      h3,
      h4 {
        margin-top: 1.55em;
        margin-bottom: 0.75em;
        color: var(--text-color);
        line-height: 1.4;
        font-weight: 600;
      }

      h1 {
        margin-top: 0;
        font-size: 26px;
      }

      h2 {
        font-size: 21px;
      }

      h3 {
        font-size: 17px;
      }

      h4 {
        font-size: 15px;
      }

      h1,
      h2 {
        padding-bottom: 0.45em;
        border-bottom: 1px solid var(--border-color);
      }

      p,
      ul,
      ol,
      blockquote {
        margin: 0 0 1.1em;
      }

      ul,
      ol {
        padding-left: 1.65em;
      }

      li + li {
        margin-top: 0.25em;
      }

      a {
        color: var(--primary-color);
        text-decoration-thickness: 1px;
        text-underline-offset: 3px;
      }

      blockquote {
        padding: 2px 0 2px 16px;
        border-left: 3px solid color-mix(in srgb, var(--primary-color) 72%, var(--border-color));
        color: var(--text-secondary-color);
      }

      code {
        padding: 2px 6px;
        border-radius: 4px;
        font-family: Consolas, 'Cascadia Mono', Monaco, monospace;
        font-size: 0.9em;
        background: color-mix(in srgb, var(--button-soft-bg) 72%, transparent);
      }

      pre {
        overflow: auto;
        padding: 16px 18px;
        border: 1px solid color-mix(in srgb, var(--border-color) 88%, transparent);
        border-radius: 6px;
        background: var(--bg-secondary-color);
        line-height: 1.7;

        code {
          padding: 0;
          background: transparent;
        }
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 8px 12px;
        border: 1px solid var(--border-color);
      }

      th {
        font-weight: 600;
        background: color-mix(in srgb, var(--button-soft-bg) 58%, transparent);
      }

      hr {
        height: 1px;
        margin: 24px 0;
        border: 0;
        background: var(--border-color);
      }

      img {
        max-width: 100%;
      }
    }

    :deep(.hljs-keyword),
    :deep(.hljs-selector-tag),
    :deep(.hljs-literal) {
      color: color-mix(in srgb, var(--primary-color) 72%, var(--text-color));
      font-weight: 500;
    }

    :deep(.hljs-string),
    :deep(.hljs-attr),
    :deep(.hljs-template-variable) {
      color: color-mix(in srgb, var(--primary-color) 48%, var(--text-color));
    }

    :deep(.hljs-comment),
    :deep(.hljs-quote) {
      color: var(--text-secondary-color);
      font-style: italic;
    }

    :deep(.hljs-number),
    :deep(.hljs-symbol),
    :deep(.hljs-bullet) {
      color: color-mix(in srgb, var(--primary-color) 38%, var(--text-color));
    }
  }
</style>
