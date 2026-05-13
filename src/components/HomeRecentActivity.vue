<template>
  <ul v-if="items.length" class="activity-list" role="list">
    <li v-for="(r, i) in items" :key="r.comment.id || r.comment.timestamp + i" class="activity-item">
      <span class="activity-dot" aria-hidden="true"></span>
      <span class="activity-text">
        <strong>{{ r.user?.name || 'Unknown' }}</strong>
        commented on
        <strong>{{ r.task.title }}</strong>
        <span class="time">{{ timeAgo(r.comment.timestamp) }}</span>
      </span>
    </li>
  </ul>
  <div v-else class="empty-state"><p>No recent activity</p></div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app.js'
import { timeAgo } from '../utils.js'

const store = useAppStore()

// Flatten every task's comments → join with task + author → newest first.
// Capped at 5 to keep the home card scannable.
const items = computed(() => {
  const rows = []
  store.tasks.forEach(t => {
    (t.comments || []).forEach(c => {
      if (!c || !c.userId) return
      const user = store.users.find(u => u.id === c.userId)
      rows.push({ task: t, comment: c, user })
    })
  })
  rows.sort((a, b) => new Date(b.comment.timestamp) - new Date(a.comment.timestamp))
  return rows.slice(0, 5)
})
</script>
