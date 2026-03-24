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
 * Inline Markdown → HTML (bold, italic, strikethrough, inline-code, links, @mentions).
 * Expects already-escaped input.
 */
function inlineMd(html) {
  html = html.replace(/@(\w+(?:\s\w+)?)/g, '<span class="mention-chip">@$1</span>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  html = html.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<em>$1</em>');
  html = html.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="md-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return html;
}

/**
 * Lightweight Markdown → HTML (inline only: bold, italic, strikethrough, code, links, @mentions).
 * Used for comments and activity entries. Escapes input internally.
 */
export function renderMarkdown(text) {
  if (!text) return '';
  return inlineMd(esc(text)).replace(/\n/g, '<br>');
}

/**
 * Full block-level Markdown → HTML for task descriptions.
 * Supports: headings (h1–h3), bullet lists, ordered lists, checklists,
 * blockquotes, horizontal rules, and all inline formatting.
 * Checklist checkboxes emit onclick="app.toggleDescCheck(N)" so they
 * are directly clickable in the preview pane.
 */
export function renderDescriptionMd(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let html = '';
  let listType = ''; // 'ul' | 'ol' | 'check' | ''

  const closeList = () => {
    if (listType === 'ul' || listType === 'check') html += '</ul>';
    else if (listType === 'ol') html += '</ol>';
    listType = '';
  };

  const openList = (type) => {
    if (listType === type) return;
    closeList();
    if (type === 'ol') html += '<ol class="md-ol">';
    else if (type === 'check') html += '<ul class="md-ul md-checklist">';
    else html += '<ul class="md-ul">';
    listType = type;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const escaped = esc(raw);

    // Headings
    if (/^### /.test(raw)) { closeList(); html += `<h3 class="md-h3">${inlineMd(esc(raw.slice(4)))}</h3>`; continue; }
    if (/^## /.test(raw))  { closeList(); html += `<h2 class="md-h2">${inlineMd(esc(raw.slice(3)))}</h2>`; continue; }
    if (/^# /.test(raw))   { closeList(); html += `<h1 class="md-h1">${inlineMd(esc(raw.slice(2)))}</h1>`; continue; }

    // Horizontal rule
    if (/^(---|\*\*\*|___)$/.test(raw.trim())) { closeList(); html += '<hr class="md-hr">'; continue; }

    // Checklist  — must check before generic bullet
    const chkM = raw.match(/^[-*] \[([ xX])\] (.*)/);
    if (chkM) {
      openList('check');
      const done = chkM[1].toLowerCase() === 'x';
      html += `<li class="md-check-item">` +
        `<button class="md-checkbox${done ? ' checked' : ''}" onclick="app.toggleDescCheck(${i})" aria-label="${done ? 'Mark incomplete' : 'Mark complete'}"></button>` +
        `<span class="md-check-label${done ? ' md-check-done' : ''}">${inlineMd(esc(chkM[2]))}</span>` +
        `</li>`;
      continue;
    }

    // Unordered list
    const ulM = raw.match(/^[-*] (.*)/);
    if (ulM) { openList('ul'); html += `<li>${inlineMd(esc(ulM[1]))}</li>`; continue; }

    // Ordered list
    const olM = raw.match(/^\d+\. (.*)/);
    if (olM) { openList('ol'); html += `<li>${inlineMd(esc(olM[1]))}</li>`; continue; }

    // Blockquote
    if (raw.startsWith('> ')) {
      closeList();
      html += `<blockquote class="md-blockquote">${inlineMd(esc(raw.slice(2)))}</blockquote>`;
      continue;
    }

    // Empty line → paragraph break spacer
    if (raw.trim() === '') {
      closeList();
      html += '<div class="md-gap"></div>';
      continue;
    }

    // Plain paragraph line
    closeList();
    html += `<p class="md-p">${inlineMd(escaped)}</p>`;
  }

  closeList();
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
