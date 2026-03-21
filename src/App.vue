<template>
  <div>
    <LoginScreen v-if="!loggedIn" />
    <AppShell v-else />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAppStore } from './stores/app.js'
import LoginScreen from './components/LoginScreen.vue'
import AppShell from './components/AppShell.vue'

const store = useAppStore()

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

onMounted(() => store.init())
</script>
