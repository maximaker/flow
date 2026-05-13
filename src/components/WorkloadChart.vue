<template>
  <div v-if="users.length" class="workload-chart">
    <div v-for="row in rows" :key="row.id" class="workload-row">
      <div class="workload-user">
        <div class="team-avatar" :style="{ background: safeColor(row.color) }" aria-hidden="true">{{ initials(row.name) }}</div>
        <span class="workload-user-name">{{ row.name }}</span>
      </div>
      <div class="workload-bars" :aria-label="`Workload for ${row.name}: ${row.todo} to do, ${row.prog} in progress, ${row.done} done`">
        <div class="workload-bar-row">
          <span class="workload-bar-label">To Do</span>
          <div class="workload-bar-track"><div class="workload-bar-fill" :style="{ width: pct(row.todo, row.max) + '%', background: 'var(--todo)' }"></div></div>
          <span class="workload-bar-count">{{ row.todo }}</span>
        </div>
        <div class="workload-bar-row">
          <span class="workload-bar-label">In Progress</span>
          <div class="workload-bar-track"><div class="workload-bar-fill" :style="{ width: pct(row.prog, row.max) + '%', background: 'var(--progress)' }"></div></div>
          <span class="workload-bar-count">{{ row.prog }}</span>
        </div>
        <div class="workload-bar-row">
          <span class="workload-bar-label">Done</span>
          <div class="workload-bar-track"><div class="workload-bar-fill" :style="{ width: pct(row.done, row.max) + '%', background: 'var(--done)' }"></div></div>
          <span class="workload-bar-count">{{ row.done }}</span>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="empty-state"><p>No team members &mdash; assign tasks to people to see workload.</p></div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app.js'
import { safeColor, initials } from '../utils.js'

const store = useAppStore()

const users = computed(() => store.users)

// Pre-compute the per-user counts so the template stays declarative.
const rows = computed(() =>
  store.users.map((u) => {
    const tasks = store.tasks.filter((t) => t.assigneeId === u.id)
    const todo = tasks.filter((t) => t.status === 'todo').length
    const prog = tasks.filter((t) => t.status === 'in-progress').length
    const done = tasks.filter((t) => t.status === 'done').length
    return {
      id: u.id,
      name: u.name,
      color: u.color,
      todo,
      prog,
      done,
      max: Math.max(todo + prog + done, 1),
    }
  }),
)

const pct = (n, max) => (n / max) * 100
</script>
