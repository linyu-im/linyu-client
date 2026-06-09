export const SCREENSHOT_PRESET_COLORS = [
  '#ED4C4C',
  '#FF8C00',
  '#FFD700',
  '#52C41A',
  '#4C9BFF',
  '#FFFFFF',
  '#000000'
] as const

export const SCREENSHOT_DEFAULT_STROKE_STYLE = {
  stroke: '#ED4C4C',
  strokeWidth: 4
}

export const SCREENSHOT_STROKE_TOOLS = ['rectangle', 'arrow', 'brush'] as const

export const SCREENSHOT_DRAW_TOOLS = [...SCREENSHOT_STROKE_TOOLS, 'mosaic'] as const

export const SCREENSHOT_STYLE_TOOLS = [...SCREENSHOT_STROKE_TOOLS, 'text'] as const

export const getScreenshotTextFontSize = (strokeWidth: number) => Math.max(12, strokeWidth * 4)
