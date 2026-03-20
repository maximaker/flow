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

// Expose globally so v-html onclick="app.xxx()" handlers work
window.app = store

const loggedIn = computed(() => store.currentUserId !== null && store.appStarted)

onMounted(() => store.init())
</script>
