<template>
  <div>
    <!-- Init error boundary: shown when store.init() throws unrecoverably -->
    <div v-if="initError" class="init-error-boundary">
      <div class="init-error-card">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h2>Something went wrong</h2>
        <p>Flow couldn't start up. This is usually a connection issue.</p>
        <p class="init-error-detail">{{ initError }}</p>
        <button class="btn-primary" @click="retryInit">Try again</button>
      </div>
    </div>
    <template v-else>
      <LoginScreen v-if="!loggedIn" />
      <AppShell v-else />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from './stores/app.js'
import LoginScreen from './components/LoginScreen.vue'
import AppShell from './components/AppShell.vue'

const store = useAppStore()
const initError = ref(null)

// Expose a restricted proxy globally so v-html onclick="app.xxx()" handlers work.
// The proxy forwards ALL function properties (bound to store) but hides raw state
// from the browser console — preventing casual inspection of users/tasks/projects data.
// Two state properties are whitelisted because inline HTML reads them directly:
//   - _cmdResults   → app._cmdResults[i].action()
//   - cmdSelectedIndex → class toggle AND app.cmdSelectedIndex=i (hover update)
const READABLE_STATE = new Set(['_cmdResults', 'cmdSelectedIndex'])
const WRITABLE_STATE = new Set(['cmdSelectedIndex']) // hover highlight writes this

window.app = new Proxy(store, {
  get(target, prop) {
    const val = Reflect.get(target, prop)
    if (typeof val === 'function') return val.bind(target)
    if (READABLE_STATE.has(String(prop))) return val
    return undefined // hide all other state from window.app
  },
  set(target, prop, value) {
    if (WRITABLE_STATE.has(String(prop))) target[prop] = value
    return true // silently swallow all other external writes
  },
})

const loggedIn = computed(() => store.currentUserId !== null && store.appStarted)

async function runInit() {
  initError.value = null
  try {
    await store.init()
  } catch (e) {
    console.error('[Flow] init() failed:', e)
    initError.value = e?.message || 'Unknown error'
  }
}

function retryInit() {
  runInit()
}

onMounted(() => {
  runInit()

  // Global unhandled promise rejection guard — surfaces silent async failures
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason) || 'Unknown async error'
    // Ignore benign browser/extension noise
    if (/ResizeObserver|cancelled|abort/i.test(msg)) return
    console.error('[Flow] Unhandled promise rejection:', event.reason)
    // If app is running, show a toast so the user knows something went wrong
    if (store.appStarted && typeof store.toast === 'function') {
      store.toast('Something went wrong. If the problem persists, try refreshing the page.', 'error')
    }
  })
})
</script>
