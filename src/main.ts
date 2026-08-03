import 'uno.css'
import '@unocss/reset/eric-meyer.css'
import '@/styles/global.scss'
import 'virtual:svg-icons-register'
import { createApp } from 'vue'
import App from '@/App.vue'
import pinia from '@/stores'
import i18n from '@/services/i18n'
import router from '@/router'
import { initDatabase } from '@/db'

const skipDatabaseInitialization = ['/pluginRuntime', '/plugin'].includes(window.location.pathname)
const databaseReady = skipDatabaseInitialization ? Promise.resolve() : initDatabase()

databaseReady.then(() => {
  createApp(App).use(router).use(pinia).use(i18n).mount('#app')
})
