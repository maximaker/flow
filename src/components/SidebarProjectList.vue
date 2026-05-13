<template>
  <!-- Active projects -->
  <template v-if="activeProjects.length">
    <button
      v-for="p in activeProjects"
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
        <span class="project-icon" aria-hidden="true">{{ defaultProjectEmoji(p) }}</span>
      </span>
      <span class="project-item-name">{{ p.name }}</span>
      <span v-if="openCount(p.id) > 0" class="nav-badge visible" :aria-label="`${openCount(p.id)} open tasks`">{{ openCount(p.id) }}</span>
      <span class="project-item-actions">
        <!-- Sidebar hover only shows the safe action. Destructive actions
             (archive, delete) live in the Edit Project modal so they require
             a deliberate path through Settings, not a stray hover-click. -->
        <button
          type="button"
          class="btn-icon-sm"
          title="Edit project"
          aria-label="Edit project"
          @click.stop="store.editProject(p.id)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </span>
    </button>
  </template>

  <button v-if="!activeProjects.length && !archivedProjects.length" type="button" class="sidebar-empty-projects" @click="store.showProjectModal()">+ Create your first project</button>

  <!-- Archived section: collapsed by default, click to expand -->
  <div v-if="archivedProjects.length" class="archived-section" :class="{ open: archivedOpen }">
    <button type="button" class="archived-toggle" @click="toggleArchived" :aria-expanded="archivedOpen">
      <svg class="archived-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
      <span class="archived-label">Archived</span>
      <span class="archived-count">{{ archivedProjects.length }}</span>
    </button>
    <div v-if="archivedOpen" class="archived-list">
      <button
        v-for="p in archivedProjects"
        :key="p.id"
        type="button"
        class="project-item project-item-button project-item-archived"
        :class="{ active: isActive(p.id) }"
        :data-project-id="p.id"
        :title="archiveTooltip(p)"
        :aria-label="`Open archived project ${p.name}`"
        @click="store.selectProject(p.id)"
      >
        <span class="project-dot-col">
          <span class="project-icon" aria-hidden="true">{{ defaultProjectEmoji(p) }}</span>
        </span>
        <span class="project-item-name">{{ p.name }}</span>
        <span class="project-item-actions">
          <!-- Restore is non-destructive (un-hides the project) so we leave
               it as a quick hover action. Delete moves to the Edit modal. -->
          <button
            type="button"
            class="btn-icon-sm"
            title="Restore project"
            aria-label="Restore project"
            @click.stop="store.unarchiveProject(p.id)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 10 9 10"/></svg>
          </button>
          <button
            type="button"
            class="btn-icon-sm"
            title="Edit project"
            aria-label="Edit project"
            @click.stop="store.editProject(p.id)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/app.js'
import { safeColor, defaultProjectEmoji } from '../utils.js'

const store = useAppStore()

// Persist expanded/collapsed state across reloads.
const archivedOpen = ref(false)
try {
  archivedOpen.value = localStorage.getItem('archived-section-open') === '1'
} catch (_) { /* localStorage may be blocked */ }

function toggleArchived() {
  archivedOpen.value = !archivedOpen.value
  try { localStorage.setItem('archived-section-open', archivedOpen.value ? '1' : '0') } catch (_) {}
}

// Reactive partition — adding/removing/archiving updates the list with no render() call.
const activeProjects   = computed(() => store.projects.filter(p => !p.archived))
const archivedProjects = computed(() => store.projects.filter(p =>  p.archived))

function openCount(projectId) {
  return store.tasks.filter(t => t.projectId === projectId && t.status !== 'done').length
}

function isActive(projectId) {
  return store.currentView === 'project' && store.selectedProjectId === projectId
}

function archiveTooltip(p) {
  const when = p.archivedAt ? ` on ${new Date(p.archivedAt).toLocaleDateString()}` : ''
  const note = p.archiveNote ? `\n\nNote: ${p.archiveNote}` : ''
  return `Archived${when}${note}`
}
</script>
