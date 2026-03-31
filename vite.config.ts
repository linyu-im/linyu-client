import UnoCSS from '@unocss/vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    vue(),
    UnoCSS(),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar']
        }
      ],
      dts: 'src/typings/auto-imports.d.ts'
    }),
    Components({
      resolvers: [NaiveUiResolver()],
      dts: 'src/typings/components.d.ts'
    }),
    createSvgIconsPlugin({
      iconDirs: [fileURLToPath(new URL('./src/assets/icons', import.meta.url))],
      symbolId: '[name]',
      inject: 'body-last',
      customDomId: '__svg_icons'
    })
  ],

  clearScreen: false,

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~': fileURLToPath(new URL('.', import.meta.url))
    }
  },

  server: {
    port: 1420,
    strictPort: true,
    host: host || '127.0.0.1',
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**']
    }
  }
}))
