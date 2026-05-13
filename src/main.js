import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '../styles.css'
import { init as initErrorReporter, captureError } from './lib/errorReporter.js'

// Install the global error reporter before any app code runs so we catch
// init-time failures too. No-op when VITE_ERROR_REPORT_URL is unset.
initErrorReporter()

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
// Vue 3 component error handler — funnels into the same reporter so we get
// a single observability pipe for window errors, unhandled rejections, and
// Vue render/lifecycle errors.
app.config.errorHandler = (err, _instance, info) => {
  captureError(err, { vueInfo: info })
}
app.mount('#app')
