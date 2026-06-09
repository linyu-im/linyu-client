<template>
  <textarea
    ref="inputRef"
    v-model="value"
    class="screenshot-text-input"
    :style="inputStyle"
    :placeholder="t('screenshot.textPlaceholder')"
    rows="1"
    @mousedown.stop
    @click.stop
    @keydown="onKeydown"
    @blur="onBlur" />
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { getScreenshotTextFontSize } from '@/constants/screenshot'
  import type { Point } from '@/types/screenshot'

  interface Props {
    position: Point
    strokeColor: string
    strokeWidth: number
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{
    submit: [content: string]
    cancel: []
  }>()

  const { t } = useI18n()
  const inputRef = ref<HTMLTextAreaElement | null>(null)
  const value = ref('')
  const canBlur = ref(false)

  const inputStyle = computed(() => ({
    left: `${props.position.x}px`,
    top: `${props.position.y}px`,
    color: props.strokeColor,
    fontSize: `${getScreenshotTextFontSize(props.strokeWidth)}px`,
    minWidth: `${Math.max(80, getScreenshotTextFontSize(props.strokeWidth) * 4)}px`,
    caretColor: props.strokeColor
  }))

  const onSubmit = () => {
    emit('submit', value.value)
  }

  const onCancel = () => {
    emit('cancel')
  }

  const onBlur = () => {
    if (!canBlur.value) return
    onSubmit()
  }

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }

  onMounted(() => {
    nextTick(() => {
      inputRef.value?.focus()
      requestAnimationFrame(() => {
        canBlur.value = true
      })
    })
  })
</script>

<style lang="scss" scoped>
  .screenshot-text-input {
    position: absolute;
    z-index: 10;
    margin: 0;
    padding: 2px 4px;
    border: 1px dashed rgba(var(--primary-rgb), 0.65);
    border-radius: 2px;
    outline: none;
    resize: none;
    background: rgba(var(--bg-primary-rgb), 0.72);
    line-height: 1.2;
    font-family: inherit;
    overflow: hidden;
    white-space: pre-wrap;
    word-break: break-word;
    pointer-events: auto;
  }
</style>
