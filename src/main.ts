import 'uno.css'
import '@unocss/reset/eric-meyer.css'
import { createApp } from 'vue'
import App from './App.vue'
import { pinia } from './stores'

createApp(App).use(pinia).mount('#app')
