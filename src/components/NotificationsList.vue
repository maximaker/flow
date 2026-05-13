<template>
  <ul v-if="notifications.length" class="notification-list" role="list">
    <li v-for="n in notifications" :key="n.id">
      <button
        type="button"
        class="notif-item"
        :class="{ unread: !n.read }"
        :aria-label="ariaLabelFor(n)"
        @click="store.readNotification(n.id)"
      >
        <component :is="iconFor(n.type)" />
        <span class="notif-text">
          <span class="notif-body">{{ n.text }}</span>
          <span class="notif-time">{{ timeAgo(n.timestamp) }}</span>
        </span>
      </button>
    </li>
  </ul>
  <div v-else class="empty-state">
    <p>No notifications</p>
  </div>
</template>

<script setup>
import { computed, h } from 'vue'
import { useAppStore } from '../stores/app.js'
import { timeAgo } from '../utils.js'

const store = useAppStore()
const notifications = computed(() => store.notifications)

// Notification type → icon glyph. Each lives inside a tinted circle that's
// styled by the existing .notif-icon.{type} CSS rules.
const ICONS = {
  deadline: '⏰',  // alarm clock
  assign: '\u{1F464}', // bust silhouette
  comment: '\u{1F4AC}', // speech balloon
}
function iconFor(type) {
  const glyph = ICONS[type] || ICONS.assign
  const cls = `notif-icon ${type || 'assign'}`
  // Render a presentational <span> (icon is decorative; the button's
  // aria-label carries the meaning) so screen readers don't announce
  // the emoji.
  return () => h('span', { class: cls, 'aria-hidden': 'true' }, glyph)
}

function ariaLabelFor(n) {
  const status = n.read ? 'Read' : 'Unread'
  return `${status} notification: ${n.text}, ${timeAgo(n.timestamp)}`
}
</script>
