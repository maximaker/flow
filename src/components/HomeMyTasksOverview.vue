<template>
  <ul v-if="items.length" class="tasks-overview" role="list">
    <li v-for="t in items" :key="t.id" class="task-overview-item">
      <button
        type="button"
        class="task-overview-check"
        :class="{ done: t.status === 'done' }"
        :aria-label="t.status === 'done' ? `Mark ${t.title} as not done` : `Mark ${t.title} as done`"
        :aria-pressed="t.status === 'done'"
        @click="store.toggleTaskStatus(t.id)"
      ></button>
      <button
        type="button"
        class="task-overview-name"
        :class="{ completed: t.status === 'done' }"
        :aria-label="`Open task ${t.title}`"
        @click="store.openTask(t.id)"
      >{{ t.title }}</button>
      <span
        v-if="t.priority"
        class="priority-badge"
        :class="t.priority"
      >{{ priorityLabel(t.priority) }}</span>
    </li>
  </ul>
  <div v-else class="empty-state"><p>No tasks assigned</p></div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app.js'

const store = useAppStore()

const PRIORITY_LABELS = { p0: 'Urgent', p1: 'High', p2: 'Medium', p3: 'Low' }
const priorityLabel = (p) => PRIORITY_LABELS[p] || ''

// First 6 root tasks assigned to the current user.
const items = computed(() => {
  return store.tasks
    .filter(t => t.assigneeId === store.currentUserId && store.isRootTask(t))
    .slice(0, 6)
})
</script>

<style scoped>
/* The legacy markup made the name span a static <span>; here it's a real
 * <button> so we need to reset UA defaults to look identical. */
.task-overview-name {
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.task-overview-name:hover { color: var(--text); }
</style>
