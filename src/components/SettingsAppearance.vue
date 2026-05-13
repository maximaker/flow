<template>
  <div class="settings-row">
    <div>
      <div class="settings-row-label">Dark mode</div>
      <div class="settings-row-desc">Switch between light and dark theme</div>
    </div>
    <label class="toggle">
      <input
        type="checkbox"
        :checked="store.theme === 'dark'"
        @change="store.toggleTheme()"
        :aria-label="store.theme === 'dark' ? 'Disable dark mode' : 'Enable dark mode'"
      >
      <span class="toggle-slider" aria-hidden="true"></span>
    </label>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app.js'
const store = useAppStore()
</script>
