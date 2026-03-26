import { defineConfig } from '@unocss/vite'
import presetWind3 from '@unocss/preset-wind3'
import transformerDirectives from '@unocss/transformer-directives'
import transformerVariantGroup from '@unocss/transformer-variant-group'

export default defineConfig({
  content: {
    filesystem: ['src/**/*.{vue,js,ts,jsx,tsx,html}']
  },
  presets: [
    presetWind3({
      dark: {
        dark: '[data-theme="dark"]',
        light: '[data-theme="light"]'
      }
    })
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  shortcuts: {
    /* Flex 布局 */
    'flex-center': 'flex justify-center items-center',
    'flex-x-center': 'flex justify-center',
    'flex-y-center': 'flex items-center',
    'flex-col-center': 'flex-center flex-col',
    'flex-col-x-center': 'flex-col-center items-center',
    'flex-col-y-center': 'flex-col-center justify-center',
    'flex-between-center': 'flex justify-between items-center',
    'flex-around-center': 'flex justify-around items-center',
    'flex-evenly-center': 'flex justify-evenly items-center',

    /* 绝对定位 */
    'absolute-center': 'absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2',
    'absolute-flex-center': 'absolute-center flex-center',
    'absolute-lt': 'absolute left-0 top-0',
    'absolute-lb': 'absolute left-0 bottom-0',
    'absolute-rt': 'absolute right-0 top-0',
    'absolute-rb': 'absolute right-0 bottom-0',
    'absolute-x-center': 'absolute-lt flex-x-center size-full',
    'absolute-y-center': 'absolute-lt flex-y-center size-full',

    /* 固定定位 */
    'fixed-lt': 'fixed left-0 top-0',
    'fixed-lb': 'fixed left-0 bottom-0',
    'fixed-rt': 'fixed right-0 top-0',
    'fixed-rb': 'fixed right-0 bottom-0',
    'fixed-center': 'fixed-lt flex-center size-full'
  }
})
