/**
 * Pure utility functions — no Pinia state, no `this`.
 * Import directly wherever needed; the store delegates to these via thin wrappers.
 */

/** 15-char lowercase alphanumeric ID compatible with PocketBase */
export function generateId() {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 15 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

/** HTML-escape a string */
export function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

/**
 * Sanitise a user-supplied colour value before injecting into style= attributes.
 * Accepts #rrggbb, #rgb, rgb(...), rgba(...); returns fallback for anything else.
 */
export function safeColor(c, fallback = '#7a7a7a') {
  if (!c) return fallback;
  if (/^#[0-9a-fA-F]{3,8}$/.test(c)) return c;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}/.test(c)) return c;
  return fallback;
}

/** Two-letter initials from a display name */
export function initials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
}

/** Human-friendly relative date (Today / Tomorrow / In 3 days / etc.) */
export function relativeDate(ds) {
  if (!ds) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(ds + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff >= 2 && diff <= 6) return `In ${diff} days`;
  if (diff >= 7 && diff <= 13) return 'Next week';
  if (diff >= 14 && diff <= 27) return `In ${Math.ceil(diff / 7)} weeks`;
  if (diff >= 28) { const months = Math.round(diff / 30); return months === 1 ? 'Next month' : `In ${months} months`; }
  if (diff <= -2 && diff >= -6) return `${Math.abs(diff)} days ago`;
  if (diff <= -7 && diff >= -13) return 'Last week';
  if (diff <= -14 && diff >= -27) return `${Math.ceil(Math.abs(diff) / 7)} weeks ago`;
  return new Date(ds + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export function formatDate(ds) { return ds ? relativeDate(ds) : ''; }
export function formatDateShort(ds) { return formatDate(ds); }
export function formatDateAbsolute(ds) {
  if (!ds) return '';
  return new Date(ds + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** CSS class for overdue / soon-due dates */
export function dueDateClass(ds) {
  if (!ds) return '';
  const diff = (new Date(ds + 'T23:59:59') - new Date()) / 86400000;
  return diff < 0 ? 'overdue' : diff < 2 ? 'soon' : '';
}

/** Compact time-ago string for timestamps */
export function timeAgo(ts) {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

/** Priority badge HTML */
export function priorityBadge(p) {
  if (!p) return '';
  const labels = { p0: 'Urgent', p1: 'High', p2: 'Medium', p3: 'Low' };
  const titles = { p0: 'Urgent priority', p1: 'High priority', p2: 'Medium priority', p3: 'Low priority' };
  return `<span class="priority-badge ${p}" title="${titles[p] || ''}">${labels[p] || ''}</span>`;
}

/** Effort badge HTML */
export function effortBadge(e) {
  if (!e) return '';
  const labels = { trivial: '< 1h', small: '1-2h', medium: '\u00bd day', large: '1-2d', xl: '3-5d', epic: '1w+' };
  const fullLabels = { trivial: 'Estimated effort: Under 1 hour', small: 'Estimated effort: 1-2 hours', medium: 'Estimated effort: Half day', large: 'Estimated effort: 1-2 days', xl: 'Estimated effort: 3-5 days', epic: 'Estimated effort: 1+ week' };
  return `<span class="effort-badge" title="${fullLabels[e] || ''}">${labels[e] || ''}</span>`;
}

/**
 * Lightweight Markdown → HTML (bold, italic, strikethrough, code, links, @mentions).
 * Input is HTML-escaped first so user content cannot inject raw tags.
 */
export function renderMarkdown(text) {
  if (!text) return '';
  let html = esc(text);
  html = html.replace(/@(\w+(?:\s\w+)?)/g, '<span class="mention-chip">@$1</span>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<span class="md-bold">$1</span>');
  html = html.replace(/__(.+?)__/g, '<span class="md-bold">$1</span>');
  html = html.replace(/~~(.+?)~~/g, '<span class="md-strike">$1</span>');
  html = html.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<span class="md-italic">$1</span>');
  html = html.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<span class="md-italic">$1</span>');
  html = html.replace(/`([^`]+)`/g, '<span class="md-code">$1</span>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="md-link" href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

/**
 * Append an activity-log entry and cap the array at 50 entries (D-01).
 * Mutates the task object in place.
 */
export function appendActivity(task, text) {
  task.activityLog = task.activityLog || [];
  task.activityLog.push({ text, timestamp: new Date().toISOString() });
  if (task.activityLog.length > 50) task.activityLog = task.activityLog.slice(-50);
}

/** Set selected options on a <select multiple> by an array of values */
export function setMultiSelect(elementId, values) {
  const el = document.getElementById(elementId);
  if (!el) return;
  Array.from(el.options).forEach(o => { o.selected = (values || []).includes(o.value); });
}
