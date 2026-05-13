<template>
  <div v-if="user" class="sidebar-user" :class="{ 'sidebar-user-brand': brand }">
    <div class="team-avatar" :style="{ background: safeColor(user.color) }">{{ initials(user.name) }}</div>
    <div class="sidebar-user-meta">
      <div class="sidebar-user-name">{{ user.name }}</div>
      <span v-if="roleLabel" class="role-badge" :class="user.role">{{ roleLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app.js'
import { safeColor, initials } from '../utils.js'

// `brand=true` uses the larger brand-row styling at the top of the sidebar
// (matches n.thedigitalvitamins.com's user-as-brand pattern). When false the
// component renders in the original compact footer style.
defineProps({ brand: { type: Boolean, default: false } })

const store = useAppStore()

// Falls back to users[0] for the seed-data startApp window where currentUserId
// hasn't been set yet — same behavior as the legacy renderSidebar code.
const user = computed(() => {
  const cu = typeof store.getCurrentUser === 'function' ? store.getCurrentUser() : null
  return cu || store.users[0] || null
})

// Mirror of getRoleBadge: only admin/collaborator get a visible role chip.
const roleLabel = computed(() => {
  if (!user.value) return ''
  if (user.value.role === 'admin') return 'Admin'
  if (user.value.role === 'collaborator') return 'Collab'
  return ''
})
</script>
