<template>
  <div class="screenshot-toolbar-wrap">
    <div class="screenshot-toolbar" @mousedown.stop>
      <div class="screenshot-toolbar__group">
        <n-tooltip v-for="tool in drawTools" :key="tool.id" placement="top" :show-arrow="false">
          <template #trigger>
            <SvgIconButton
              :href="`#${tool.id}`"
              :size="30"
              :icon-size="iconSize"
              :active="activeTool === tool.tool"
              @click="emit('update:activeTool', tool.tool)" />
          </template>
          {{ t(tool.titleKey) }}
        </n-tooltip>
      </div>

      <span class="screenshot-toolbar__divider" />

      <div class="screenshot-toolbar__group">
        <n-tooltip placement="top" :show-arrow="false">
          <template #trigger>
            <span class="screenshot-toolbar__icon-trigger">
              <SvgIconButton href="#undo" :size="30" :icon-size="iconSize" :disabled="!canUndo" @click="emit('undo')" />
            </span>
          </template>
          {{ t('screenshot.undo') }}
        </n-tooltip>

        <n-tooltip placement="top" :show-arrow="false">
          <template #trigger>
            <span class="screenshot-toolbar__icon-trigger">
              <SvgIconButton href="#redo" :size="30" :icon-size="iconSize" :disabled="!canRedo" @click="emit('redo')" />
            </span>
          </template>
          {{ t('screenshot.redo') }}
        </n-tooltip>

        <n-tooltip placement="top" :show-arrow="false">
          <template #trigger>
            <SvgIconButton href="#download" :size="30" :icon-size="iconSize" @click="emit('download')" />
          </template>
          {{ t('screenshot.download') }}
        </n-tooltip>

        <n-tooltip placement="top" :show-arrow="false">
          <template #trigger>
            <SvgIconButton
              href="#close"
              :size="30"
              :icon-size="iconSize"
              color="var(--red)"
              hover-color="#fff"
              hover-bg="var(--red)"
              @click="emit('cancel')" />
          </template>
          {{ t('screenshot.cancel') }}
        </n-tooltip>

        <n-tooltip placement="top" :show-arrow="false">
          <template #trigger>
            <SvgIconButton
              href="#check"
              :size="30"
              :icon-size="iconSize"
              color="var(--primary-color)"
              hover-color="#fff"
              hover-bg="var(--primary-color)"
              @click="emit('confirm')" />
          </template>
          {{ t('screenshot.confirm') }}
        </n-tooltip>
      </div>
    </div>

    <ScreenshotStrokeOptions
      v-if="showStrokeOptions"
      :stroke-width="strokeWidth"
      :stroke-color="strokeColor"
      :anchor-left="strokeOptionsAnchorLeft"
      @update:stroke-width="emit('update:strokeWidth', $event)"
      @update:stroke-color="emit('update:strokeColor', $event)" />

    <ScreenshotMosaicOptions
      v-if="showMosaicOptions"
      :stroke-width="strokeWidth"
      :anchor-left="mosaicOptionsAnchorLeft"
      @update:stroke-width="emit('update:strokeWidth', $event)" />
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import SvgIconButton from '@/components/SvgIconButton.vue'
  import { SCREENSHOT_STYLE_TOOLS } from '@/constants/screenshot'
  import ScreenshotMosaicOptions from './ScreenshotMosaicOptions.vue'
  import ScreenshotStrokeOptions from './ScreenshotStrokeOptions.vue'
  import type { ScreenshotTool } from '@/types/screenshot'

  interface DrawToolItem {
    id: string
    tool: ScreenshotTool
    titleKey: string
  }

  interface Props {
    activeTool: ScreenshotTool
    canUndo?: boolean
    canRedo?: boolean
    strokeWidth: number
    strokeColor: string
  }

  const props = withDefaults(defineProps<Props>(), {
    canUndo: false,
    canRedo: false
  })

  const emit = defineEmits<{
    'update:activeTool': [tool: ScreenshotTool]
    'update:strokeWidth': [value: number]
    'update:strokeColor': [value: string]
    undo: []
    redo: []
    download: []
    cancel: []
    confirm: []
  }>()

  const { t } = useI18n()
  const iconSize = '58%'

  const drawTools: DrawToolItem[] = [
    { id: 'move', tool: 'move', titleKey: 'screenshot.tools.move' },
    { id: 'rectangle', tool: 'rectangle', titleKey: 'screenshot.tools.rectangle' },
    { id: 'arrow-diagonal', tool: 'arrow', titleKey: 'screenshot.tools.arrow' },
    { id: 'brush', tool: 'brush', titleKey: 'screenshot.tools.brush' },
    { id: 'text-a', tool: 'text', titleKey: 'screenshot.tools.text' },
    { id: 'mosaic', tool: 'mosaic', titleKey: 'screenshot.tools.mosaic' }
  ]

  const showStrokeOptions = computed(() =>
    SCREENSHOT_STYLE_TOOLS.includes(props.activeTool as (typeof SCREENSHOT_STYLE_TOOLS)[number])
  )

  const showMosaicOptions = computed(() => props.activeTool === 'mosaic')

  const strokeOptionsAnchorLeft = computed(() => {
    const offsets: Partial<Record<ScreenshotTool, number>> = {
      rectangle: 34,
      arrow: 68,
      brush: 102,
      text: 136
    }
    return offsets[props.activeTool] ?? 34
  })

  const mosaicOptionsAnchorLeft = 170
</script>

<style lang="scss" scoped>
  .screenshot-toolbar-wrap {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .screenshot-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 12px;
    border-radius: 10px;
    background: var(--bg-primary-color);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.14);
    user-select: none;

    &__group {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    &__icon-trigger {
      display: inline-flex;
    }

    &__divider {
      width: 1px;
      height: 22px;
      background: var(--divider-color);
      flex-shrink: 0;
    }
  }
</style>
