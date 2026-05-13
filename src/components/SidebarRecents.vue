<template>
  <div v-if="recents.length" class="nav-section recents-section">
    <div class="nav-section-header">
      <div class="nav-section-toggle">
        <span>Recents</span>
      </div>
    </div>
    <div class="accordion-body">
      <button
        v-for="p in recents"
        :key="p.id"
        type="button"
        class="project-item project-item-button"
        :class="{ active: isActive(p.id) }"
        :aria-current="isActive(p.id) ? 'page' : undefined"
        :aria-label="`Open project ${p.name}`"
        @click="store.selectProject(p.id)"
      >
        <span class="project-dot-col">
          <span class="project-icon" aria-hidden="true">{{ defaultProjectEmoji(p) }}</span>
        </span>
        <span class="project-item-name">{{ p.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app.js'
import { defaultProjectEmoji } from '../utils.js'

const store = useAppStore()

// Recently-opened projects (max 5). Stored in localStorage so each browser
// keeps its own history — matches the Notion sidebar's Recents pattern.
// We read inside the computed so changes via `_recentsTick` re-trigger this.
const recents = computed(() => {
  // Reactive dependency on the bump counter — selectProject updates it.
  // eslint-disable-next-line no-unused-vars
  const _ = store._recentsTick
  let ids = []
  try {
    ids = JSON.parse(localStorage.getItem('flow_recent_projects') || '[]')
  } catch (_) { /* ignore */ }
  return ids
    .map(id => store.projects.find(p => p.id === id))
    .filter(p => p && !p.archived)
    .slice(0, 5)
})

function isActive(projectId) {
  return store.currentView === 'project' && store.selectedProjectId === projectId
}
</script>
