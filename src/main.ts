import 'uno.css'
import '@unocss/reset/eric-meyer.css'
import { createApp } from 'vue'
import App from '@/App.vue'
import { pinia } from '@/stores'
import { i18n } from '@/locales'

createApp(App).use(pinia).use(i18n).mount('#app')
