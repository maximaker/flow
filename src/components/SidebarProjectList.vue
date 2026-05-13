<template>
  <template v-if="projects.length">
    <button
      v-for="p in projects"
      :key="p.id"
      type="button"
      class="project-item project-item-button"
      :class="{ active: isActive(p.id) }"
      :data-project-id="p.id"
      :aria-current="isActive(p.id) ? 'page' : undefined"
      :aria-label="`Open project ${p.name}`"
      @click="store.selectProject(p.id)"
    >
      <span class="project-dot-col">
        <span v-if="p.icon" class="project-icon" aria-hidden="true">{{ p.icon }}</span>
        <span v-else class="project-dot" :style="{ background: safeColor(p.color) }" aria-hidden="true"></span>
      </span>
      <span class="project-item-name">{{ p.name }}</span>
      <span v-if="openCount(p.id) > 0" class="nav-badge visible" :aria-label="`${openCount(p.id)} open tasks`">{{ openCount(p.id) }}</span>
      <span class="project-item-actions">
        <button
          type="button"
          class="btn-icon-sm"
          title="Edit project"
          aria-label="Edit project"
          @click.stop="store.editProject(p.id)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button
          type="button"
          class="btn-icon-sm"
          title="Delete project"
          aria-label="Delete project"
          @click.stop="store.deleteProject(p.id)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </span>
    </button>
  </template>
  <button v-else type="button" class="sidebar-empty-projects" @click="store.showProjectModal()">+ Create your first project</button>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app.js'
import { safeColor } from '../utils.js'

const store = useAppStore()

// Reactive on store.projects so adding/removing/renaming a project updates
// the list without an explicit render() call.
const projects = computed(() => store.projects)

// Open-task count (anything not done) for a given project. The legacy renderer
// recomputed this on every render() tick; here it's reactive on store.tasks.
function openCount(projectId) {
  return store.tasks.filter(t => t.projectId === projectId && t.status !== 'done').length
}

function isActive(projectId) {
  return store.currentView === 'project' && store.selectedProjectId === projectId
}
</script>
