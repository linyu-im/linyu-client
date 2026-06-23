<template>
  <div
    ref="editorRootRef"
    class="message-editor"
    :class="{ 'is-disabled': disabled, 'is-dragover': isDragOver }"
    @click="focus"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop">
    <editor-content :editor="editor" class="message-editor__content" />
    <div v-if="isDragOver" class="message-editor__dragmask">{{ t('message.editor.dragDropHint') }}</div>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { convertFileSrc } from '@tauri-apps/api/core'
  import { getCurrentWebview } from '@tauri-apps/api/webview'
  import type { UnlistenFn } from '@tauri-apps/api/event'
  import { Editor, EditorContent, mergeAttributes, useEditor } from '@tiptap/vue-3'
  import StarterKit from '@tiptap/starter-kit'
  import Placeholder from '@tiptap/extension-placeholder'
  import Image from '@tiptap/extension-image'
  import Mention from '@tiptap/extension-mention'
  import { SingleLine } from './extensions/SingleLine'
  import { FileChip } from './extensions/FileChip'
  import { buildMentionSuggestion } from './extensions/suggestion'
  import type { MentionItem } from './MentionList.vue'
  import type { FileContent, ImageContent, VideoContent } from '@/types/api/message'
  import type { FromType } from '@/types/common'
  import { isVideoFile } from '@/utils/fileIcon'
  import { getFilePath, getFileSize, readPathAsFile } from '@/utils/filePick'
  import { registerBlobFilePath } from '@/utils/blobFilePath'

  export type EditorSegment =
    | { type: 'text'; text: string }
    | { type: 'mention'; id: string; label: string; mentionType: FromType }
    | { type: 'image'; content: ImageContent }
    | { type: 'video'; content: VideoContent }
    | { type: 'file'; content: FileContent }

  export interface EditorPayload {
    html: string
    text: string
    json: unknown
    segments: EditorSegment[]
    isEmpty: boolean
  }

  interface Props {
    modelValue?: string
    placeholder?: string
    disabled?: boolean
    /** 提供 @ 提及候选数据 */
    fetchMentions?: (query: string) => MentionItem[] | Promise<MentionItem[]>
    /** 图片最大字节数 */
    maxImageSize?: number
    /** 文件最大字节数 */
    maxFileSize?: number
    /** 是否在 Enter 时触发 submit（关闭则 Enter 不会发送） */
    submitOnEnter?: boolean
  }

  const { t, locale } = useI18n()

  const props = withDefaults(defineProps<Props>(), {
    modelValue: '',
    placeholder: undefined,
    disabled: false,
    fetchMentions: undefined,
    maxImageSize: 20 * 1024 * 1024,
    maxFileSize: 200 * 1024 * 1024,
    submitOnEnter: true
  })

  const resolvedPlaceholder = computed(() => props.placeholder ?? t('message.editor.placeholder'))

  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
    (e: 'change', payload: EditorPayload): void
    (e: 'submit', payload: EditorPayload): void
    (e: 'file-rejected', reason: { file: File; reason: 'image-too-large' | 'file-too-large' }): void
  }>()

  const isDragOver = ref(false)
  const dragCounter = ref(0)
  const blobUrls = shallowRef<Set<string>>(new Set())
  const editorRootRef = ref<HTMLElement | null>(null)

  const trackBlob = (url: string) => {
    if (url.startsWith('blob:')) {
      blobUrls.value.add(url)
    }
  }

  const revokeBlobs = () => {
    blobUrls.value.forEach((url) => URL.revokeObjectURL(url))
    blobUrls.value.clear()
  }

  const buildPayload = (instance: Editor): EditorPayload => {
    const json = instance.getJSON()
    const segments: EditorSegment[] = []
    const walk = (node: any) => {
      if (!node) return
      if (Array.isArray(node.content)) {
        node.content.forEach(walk)
        return
      }
      switch (node.type) {
        case 'text':
          segments.push({ type: 'text', text: node.text ?? '' })
          break
        case 'mention':
          segments.push({
            type: 'mention',
            id: node.attrs?.id ?? '',
            label: node.attrs?.label ?? '',
            mentionType: node.attrs?.mentionType ?? 'user'
          })
          break
        case 'image': {
          const imgUrl = node.attrs?.src ?? ''
          const imgSize = Number(node.attrs?.fileSize) || 0
          segments.push({
            type: 'image',
            content: {
              imgUrl,
              imgThumbUrl: imgUrl,
              imgName: node.attrs?.alt ?? '',
              imgSize
            }
          })
          break
        }
        case 'fileChip': {
          const fileSize = Number(node.attrs?.size) || 0
          const fileName = node.attrs?.name ?? ''
          const fileType = node.attrs?.mime ?? ''
          const fileUrl = node.attrs?.url ?? ''
          if (isVideoFile(fileName, fileType)) {
            segments.push({
              type: 'video',
              content: {
                videoUrl: fileUrl,
                videoThumbUrl: fileUrl,
                videoName: fileName,
                videoSize: fileSize
              }
            })
          } else {
            segments.push({
              type: 'file',
              content: {
                fileUrl,
                fileType,
                fileName,
                fileSize
              }
            })
          }
          break
        }
      }
    }
    walk(json)
    const isBlankText = (seg?: EditorSegment) => seg?.type === 'text' && !seg.text?.trim()
    while (segments.length && isBlankText(segments[segments.length - 1])) {
      segments.pop()
    }
    while (segments.length && isBlankText(segments[0])) {
      segments.shift()
    }
    return {
      html: instance.getHTML(),
      text: instance.getText().trim(),
      json,
      segments,
      isEmpty: instance.isEmpty || segments.length === 0
    }
  }

  const editor = useEditor({
    content: props.modelValue || '',
    editable: !props.disabled,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        hardBreak: false,
        dropcursor: false,
        gapcursor: false,
        trailingNode: false,
        link: false
      }),
      Placeholder.configure({
        placeholder: () => resolvedPlaceholder.value,
        emptyEditorClass: 'is-editor-empty'
      }),
      Image.extend({
        selectable: false,
        addAttributes() {
          return {
            ...this.parent?.(),
            fileSize: {
              default: 0,
              parseHTML: (element) => Number(element.getAttribute('data-file-size')) || 0,
              renderHTML: (attributes) => (attributes.fileSize ? { 'data-file-size': String(attributes.fileSize) } : {})
            }
          }
        },
        renderHTML({ HTMLAttributes }) {
          const attrs = { ...HTMLAttributes }
          const src = attrs.src
          if (typeof src === 'string' && src.startsWith('local-file://')) {
            const path = decodeURIComponent(src.slice('local-file://'.length))
            attrs.src = convertFileSrc(path)
          }
          return ['img', mergeAttributes(this.options.HTMLAttributes, attrs)]
        }
      }).configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: { class: 'message-editor__image' }
      }),
      FileChip,
      Mention.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            mentionType: {
              default: 'user',
              parseHTML: (element) => element.getAttribute('data-mention-type') ?? 'user',
              renderHTML: (attributes) =>
                attributes.mentionType ? { 'data-mention-type': attributes.mentionType } : {}
            }
          }
        }
      }).configure({
        HTMLAttributes: { class: 'message-editor__mention' },
        deleteTriggerWithBackspace: true,
        renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
        suggestion: buildMentionSuggestion({
          fetchItems: async (query) => {
            if (!props.fetchMentions) return []
            return props.fetchMentions(query)
          }
        })
      }),
      SingleLine.configure({
        onEnter: () => {
          if (!props.submitOnEnter) return false
          handleSubmit()
          return true
        }
      })
    ],
    editorProps: {
      attributes: {
        class: 'message-editor__prose'
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? [])
        if (files.length === 0) return false
        event.preventDefault()
        event.stopPropagation()
        files.forEach((file) => insertFileOrImage(file))
        return true
      },
      handleDrop: (_view, event) => {
        const dt = (event as DragEvent).dataTransfer
        const files = Array.from(dt?.files ?? [])
        if (files.length === 0) return false
        event.preventDefault()
        event.stopPropagation()
        isDragOver.value = false
        dragCounter.value = 0
        files.forEach((file) => insertFileOrImage(file))
        restoreFocusAfterDrop()
        return true
      }
    },
    onUpdate: ({ editor: instance }) => {
      const payload = buildPayload(instance as Editor)
      emit('update:modelValue', payload.html)
      emit('change', payload)
    }
  })

  const insertImage = (file: File) => {
    const fileSize = getFileSize(file)
    if (fileSize > props.maxImageSize) {
      emit('file-rejected', { file, reason: 'image-too-large' })
      return
    }
    const filePath = getFilePath(file)
    const url = filePath ? `local-file://${encodeURIComponent(filePath)}` : URL.createObjectURL(file)
    if (!filePath) {
      trackBlob(url)
    }
    if (filePath) registerBlobFilePath(url, filePath)
    editor.value
      ?.chain()
      .focus()
      .insertContent({
        type: 'image',
        attrs: { src: url, alt: file.name, fileSize }
      })
      .run()
  }

  const insertFileChip = (file: File) => {
    const fileSize = getFileSize(file)
    if (fileSize > props.maxFileSize) {
      emit('file-rejected', { file, reason: 'file-too-large' })
      return
    }
    const filePath = getFilePath(file)
    const url = filePath ? `local-file://${encodeURIComponent(filePath)}` : URL.createObjectURL(file)
    if (!filePath) {
      trackBlob(url)
    }
    if (filePath) registerBlobFilePath(url, filePath)
    editor.value
      ?.chain()
      .focus()
      .insertFileChip({
        name: file.name,
        size: fileSize,
        mime: file.type,
        url
      })
      .run()
  }

  const insertFileOrImage = (file: File) => {
    if (file.type.startsWith('image/')) {
      insertImage(file)
    } else {
      insertFileChip(file)
    }
  }

  const onDragEnter = (e: DragEvent) => {
    if (!hasFiles(e)) return
    dragCounter.value += 1
    isDragOver.value = true
  }
  const onDragOver = (e: DragEvent) => {
    if (!hasFiles(e)) return
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }
  const onDragLeave = (e: DragEvent) => {
    if (!hasFiles(e)) return
    dragCounter.value = Math.max(0, dragCounter.value - 1)
    if (dragCounter.value === 0) isDragOver.value = false
  }
  const onDrop = (e: DragEvent) => {
    dragCounter.value = 0
    isDragOver.value = false
    const files = Array.from(e.dataTransfer?.files ?? [])
    if (files.length === 0) return
    files.forEach((file) => insertFileOrImage(file))
    restoreFocusAfterDrop()
  }

  const restoreFocusAfterDrop = () => {
    const active = document.activeElement
    if (active instanceof HTMLElement && active !== document.body) {
      active.blur()
    }
    requestAnimationFrame(() => {
      setTimeout(() => {
        const inst = editor.value
        if (!inst) return
        inst.view.dom.focus({ preventScroll: true })
        inst.commands.focus(undefined, { scrollIntoView: false })
      }, 50)
    })
  }
  const hasFiles = (e: DragEvent) => {
    const types = e.dataTransfer?.types
    if (!types) return false
    return Array.from(types).includes('Files')
  }

  /**
   * Tauri 原生拖拽：position 是相对窗口的物理像素，需换算成 CSS 像素后与编辑器可视区域比对，
   * 判断拖拽是否落在输入框内。
   */
  const isPositionOverEditor = (position: { x: number; y: number }) => {
    const root = editorRootRef.value
    if (!root) return false
    const dpr = window.devicePixelRatio || 1
    const x = position.x / dpr
    const y = position.y / dpr
    const rect = root.getBoundingClientRect()
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }

  const handleTauriDropPaths = async (paths: string[]) => {
    for (const path of paths) {
      try {
        const file = await readPathAsFile(path)
        insertFileOrImage(file)
      } catch (err) {
        console.error('[editor] read dropped file failed:', path, err)
      }
    }
    restoreFocusAfterDrop()
  }

  let unlistenDragDrop: UnlistenFn | null = null

  onMounted(async () => {
    try {
      unlistenDragDrop = await getCurrentWebview().onDragDropEvent((event) => {
        const payload = event.payload
        if (payload.type === 'enter' || payload.type === 'over') {
          isDragOver.value = isPositionOverEditor(payload.position)
        } else if (payload.type === 'drop') {
          const over = isPositionOverEditor(payload.position)
          isDragOver.value = false
          if (over && payload.paths?.length) {
            void handleTauriDropPaths(payload.paths)
          }
        } else {
          isDragOver.value = false
        }
      })
    } catch (err) {
      console.error('[editor] register drag-drop listener failed:', err)
    }
  })

  const handleSubmit = () => {
    if (!editor.value) return
    const payload = buildPayload(editor.value)
    if (payload.isEmpty) return
    emit('submit', payload)
  }

  const focus = () => editor.value?.chain().focus().run()
  const clear = (options?: { keepBlobs?: boolean }) => {
    editor.value?.commands.clearContent(true)
    if (!options?.keepBlobs) {
      revokeBlobs()
    }
  }
  const insertText = (text: string) => editor.value?.chain().focus().insertContent(text).run()
  const insertMention = (item: MentionItem) =>
    editor.value
      ?.chain()
      .focus()
      .insertContent([
        { type: 'mention', attrs: { id: item.id, label: item.name, mentionType: item.type ?? 'user' } },
        { type: 'text', text: ' ' }
      ])
      .run()

  watch(
    () => props.modelValue,
    (val) => {
      if (!editor.value) return
      const current = editor.value.getHTML()
      if (val === current) return
      editor.value.commands.setContent(val || '', { emitUpdate: false })
    }
  )

  watch(
    () => props.disabled,
    (val) => editor.value?.setEditable(!val)
  )

  const syncPlaceholder = () => {
    const inst = editor.value
    if (!inst) return
    const text = resolvedPlaceholder.value
    const placeholderExt = inst.extensionManager.extensions.find((e) => e.name === 'placeholder')
    if (placeholderExt) {
      placeholderExt.options.placeholder = () => text
    }
    inst.view.dom.querySelectorAll('[data-placeholder]').forEach((el) => {
      el.setAttribute('data-placeholder', text)
    })
    inst.view.dispatch(inst.state.tr)
  }

  watch([locale, resolvedPlaceholder], () => {
    nextTick(syncPlaceholder)
  })

  watch(editor, (inst) => {
    if (inst) nextTick(syncPlaceholder)
  })

  onBeforeUnmount(() => {
    revokeBlobs()
    if (unlistenDragDrop) {
      unlistenDragDrop()
      unlistenDragDrop = null
    }
  })

  defineExpose({
    focus,
    clear,
    insertText,
    insertMention,
    insertImage,
    insertFile: insertFileChip,
    insertFileOrImage,
    submit: handleSubmit,
    getEditor: () => editor.value
  })
</script>

<style lang="scss">
  .message-editor {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    border: 1px solid var(--border-color);
    border-radius: 5px;
    background: var(--input-soft-bg);
    color: var(--text-color);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
    overflow: hidden;
    cursor: text;
    display: flex;
    align-items: stretch;

    &.is-disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &.is-dragover {
      border-color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color) 8%, var(--input-soft-bg));
    }

    .message-editor__content {
      flex: 1;
      min-width: 0;
      min-height: 0;
      height: 100%;
      display: flex;
      align-items: stretch;
      overflow: hidden;
    }

    .message-editor__prose {
      flex: 1;
      width: 100%;
      height: 100%;
      padding: 6px 10px;
      outline: none;
      overflow-x: hidden;
      overflow-y: auto;
      white-space: normal;
      overflow-wrap: break-word;
      word-break: break-word;
      caret-color: var(--primary-color);
      line-height: 28px;
      font-size: 14px;

      p {
        margin: 0;
        padding: 0;
        min-height: 28px;
      }

      p.is-editor-empty:first-child::before {
        content: attr(data-placeholder);
        color: var(--text-secondary-color);
        pointer-events: none;
        float: left;
        height: 0;
      }
    }

    .message-editor__image {
      display: inline-block;
      vertical-align: middle;
      max-height: 28px;
      max-width: 60px;
      object-fit: cover;
      border-radius: 3px;
      margin: 0 3px;
      border: 1px solid var(--border-color);
    }

    .message-editor__mention {
      display: inline-flex;
      align-items: center;
      height: 22px;
      line-height: 1;
      padding: 0 6px;
      border-radius: 22px;
      background: color-mix(in srgb, var(--primary-color) 14%, transparent);
      color: var(--primary-color);
      font-weight: 500;
      margin: 0 2px;
      white-space: nowrap;
      cursor: default;
      font-size: 12px;
      vertical-align: middle;
    }

    .rich-editor-file-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0 6px;
      height: 22px;
      border-radius: 22px;
      background: var(--card-bg-color);
      border: 1px solid var(--primary-color);
      font-size: 12px;
      vertical-align: middle;
      margin: 0 3px;
      max-width: 180px;
      cursor: default;

      .rich-editor-file-chip__icon {
        flex-shrink: 0;
      }
      .rich-editor-file-chip__name {
        max-width: 110px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .rich-editor-file-chip__size {
        color: var(--text-secondary-color);
        flex-shrink: 0;
      }
    }

    .message-editor__dragmask {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      font-size: 12px;
      color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color) 6%, transparent);
      border: 1px dashed var(--primary-color);
      border-radius: 5px;
    }
  }
</style>
