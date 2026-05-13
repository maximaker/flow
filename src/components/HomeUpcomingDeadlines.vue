<template>
  <ul v-if="items.length" class="upcoming-list" role="list">
    <li v-for="t in items" :key="t.id">
      <button
        type="button"
        class="upcoming-item"
        :aria-label="`Open task ${t.title}, due ${formatDateAbsolute(t.dueDate)}`"
        @click="store.openTask(t.id)"
      >
        <span class="upcoming-dot" :style="{ background: dotColor(t) }" aria-hidden="true"></span>
        <span class="upcoming-info">
          <span class="upcoming-info-title">{{ t.title }}</span>
          <small>{{ projectName(t) }}</small>
        </span>
        <span class="upcoming-date" :class="dueDateClass(t.dueDate)" :title="formatDateAbsolute(t.dueDate)">
          {{ formatDate(t.dueDate) }}
        </span>
      </button>
    </li>
  </ul>
  <div v-else class="empty-state"><p>All caught up &mdash; no upcoming deadlines.</p></div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app.js'
import { safeColor, dueDateClass, formatDate, formatDateAbsolute } from '../utils.js'

const store = useAppStore()

// Top 5 incomplete tasks with a due date, soonest first.
const items = computed(() => {
  return store.tasks
    .filter(t => t.dueDate && t.status !== 'done')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5)
})

function project(t) {
  return store.projects.find(p => p.id === t.projectId)
}
function dotColor(t) {
  return safeColor(project(t)?.color, '#94a3b8')
}
function projectName(t) {
  return project(t)?.name || 'No project'
}
</script>
