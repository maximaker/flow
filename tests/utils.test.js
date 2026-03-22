/**
 * tests/utils.test.js
 * Unit tests for src/utils.js — all pure functions.
 * Runs in happy-dom so document.createElement is available.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateId,
  esc,
  safeColor,
  initials,
  relativeDate,
  formatDate,
  formatDateAbsolute,
  dueDateClass,
  timeAgo,
  priorityBadge,
  effortBadge,
  renderMarkdown,
  appendActivity,
  setMultiSelect,
} from '../src/utils.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Return a LOCAL date string (YYYY-MM-DD) offset by `days` from today.
 * Uses local date parts to avoid UTC-shift issues on non-UTC servers.
 */
function dateOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── generateId ─────────────────────────────────────────────────────────────

describe('generateId', () => {
  it('returns a 15-character string', () => {
    expect(generateId()).toHaveLength(15)
  })

  it('contains only lowercase letters and digits', () => {
    expect(generateId()).toMatch(/^[a-z0-9]{15}$/)
  })

  it('produces unique values', () => {
    const ids = new Set(Array.from({ length: 200 }, generateId))
    expect(ids.size).toBe(200)
  })
})

// ─── esc ────────────────────────────────────────────────────────────────────

describe('esc', () => {
  it('escapes angle brackets', () => {
    expect(esc('<script>alert(1)</script>')).not.toContain('<script>')
    expect(esc('<b>bold</b>')).toContain('&lt;b&gt;')
  })

  it('escapes ampersands', () => {
    expect(esc('a & b')).toBe('a &amp; b')
  })

  it('handles empty/null/undefined gracefully', () => {
    expect(esc('')).toBe('')
    expect(esc(null)).toBe('')
    expect(esc(undefined)).toBe('')
  })

  it('passes plain text through unchanged', () => {
    expect(esc('Hello World')).toBe('Hello World')
  })

  it('leaves double-quotes as-is (textContent does not encode them)', () => {
    // esc() uses textContent → innerHTML which encodes <, >, & but NOT "
    // Double quotes are safe in text nodes and don't need encoding.
    const out = esc('"hello"')
    expect(out).toContain('hello')
    expect(out).not.toContain('<')
  })
})

// ─── safeColor ──────────────────────────────────────────────────────────────

describe('safeColor', () => {
  it('accepts #rrggbb hex', () => {
    expect(safeColor('#ff0000')).toBe('#ff0000')
  })

  it('accepts #rgb short hex', () => {
    expect(safeColor('#f00')).toBe('#f00')
  })

  it('accepts rgb()', () => {
    expect(safeColor('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)')
  })

  it('accepts rgba()', () => {
    expect(safeColor('rgba(255,0,0,0.5)')).toBe('rgba(255,0,0,0.5)')
  })

  it('rejects arbitrary strings and returns fallback', () => {
    expect(safeColor('javascript:alert(1)')).toBe('#7a7a7a')
    expect(safeColor('red')).toBe('#7a7a7a')
  })

  it('uses custom fallback when provided', () => {
    expect(safeColor(null, '#aabbcc')).toBe('#aabbcc')
    expect(safeColor('invalid', '#333')).toBe('#333')
  })
})

// ─── initials ───────────────────────────────────────────────────────────────

describe('initials', () => {
  it('returns two capital letters for a full name', () => {
    expect(initials('Jane Doe')).toBe('JD')
  })

  it('returns one letter for a single name', () => {
    expect(initials('Alice')).toBe('A')
  })

  it('returns first two words only', () => {
    expect(initials('John Paul Jones')).toBe('JP')
  })

  it('returns ? for empty/falsy input', () => {
    expect(initials('')).toBe('?')
    expect(initials(null)).toBe('?')
    expect(initials(undefined)).toBe('?')
  })

  it('uppercases result', () => {
    expect(initials('jane doe')).toBe('JD')
  })
})

// ─── relativeDate ───────────────────────────────────────────────────────────

describe('relativeDate', () => {
  it('returns empty string for falsy input', () => {
    expect(relativeDate('')).toBe('')
    expect(relativeDate(null)).toBe('')
  })

  it('returns "Today" for today\'s date', () => {
    expect(relativeDate(dateOffset(0))).toBe('Today')
  })

  it('returns "Tomorrow" for tomorrow', () => {
    expect(relativeDate(dateOffset(1))).toBe('Tomorrow')
  })

  it('returns "Yesterday" for yesterday', () => {
    expect(relativeDate(dateOffset(-1))).toBe('Yesterday')
  })

  it('returns "In N days" for 2–6 days ahead', () => {
    expect(relativeDate(dateOffset(3))).toBe('In 3 days')
    expect(relativeDate(dateOffset(6))).toBe('In 6 days')
  })

  it('returns "N days ago" for 2–6 days past', () => {
    const r = relativeDate(dateOffset(-3))
    expect(r).toBe('3 days ago')
  })

  it('returns "Next week" for 7–13 days ahead', () => {
    expect(relativeDate(dateOffset(7))).toBe('Next week')
  })

  it('returns "Last week" for 7–13 days past', () => {
    expect(relativeDate(dateOffset(-7))).toBe('Last week')
  })
})

// ─── formatDateAbsolute ─────────────────────────────────────────────────────

describe('formatDateAbsolute', () => {
  it('returns empty string for falsy input', () => {
    expect(formatDateAbsolute('')).toBe('')
    expect(formatDateAbsolute(null)).toBe('')
  })

  it('returns a human-readable date string', () => {
    const result = formatDateAbsolute('2025-06-15')
    // Should include at least year and month abbreviation
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/2025/)
  })
})

// ─── dueDateClass ───────────────────────────────────────────────────────────

describe('dueDateClass', () => {
  it('returns empty string for no date', () => {
    expect(dueDateClass('')).toBe('')
    expect(dueDateClass(null)).toBe('')
  })

  it('returns "overdue" for a past date', () => {
    expect(dueDateClass(dateOffset(-2))).toBe('overdue')
  })

  it('returns "soon" for today or tomorrow', () => {
    expect(dueDateClass(dateOffset(0))).toBe('soon')
    expect(dueDateClass(dateOffset(1))).toBe('soon')
  })

  it('returns empty string for dates 3+ days out', () => {
    expect(dueDateClass(dateOffset(5))).toBe('')
  })
})

// ─── timeAgo ────────────────────────────────────────────────────────────────

describe('timeAgo', () => {
  it('returns empty string for falsy input', () => {
    expect(timeAgo('')).toBe('')
    expect(timeAgo(null)).toBe('')
  })

  it('returns "Just now" for very recent timestamps', () => {
    expect(timeAgo(new Date().toISOString())).toBe('Just now')
  })

  it('returns minutes ago for recent timestamps', () => {
    const ts = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(timeAgo(ts)).toBe('5m ago')
  })

  it('returns hours ago for older timestamps', () => {
    const ts = new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    expect(timeAgo(ts)).toBe('3h ago')
  })

  it('returns days ago for timestamps > 24h', () => {
    const ts = new Date(Date.now() - 2 * 86400 * 1000).toISOString()
    expect(timeAgo(ts)).toBe('2d ago')
  })
})

// ─── priorityBadge ──────────────────────────────────────────────────────────

describe('priorityBadge', () => {
  it('returns empty string for falsy input', () => {
    expect(priorityBadge('')).toBe('')
    expect(priorityBadge(null)).toBe('')
  })

  it('renders correct label for each priority level', () => {
    expect(priorityBadge('p0')).toContain('Urgent')
    expect(priorityBadge('p1')).toContain('High')
    expect(priorityBadge('p2')).toContain('Medium')
    expect(priorityBadge('p3')).toContain('Low')
  })

  it('includes the priority class in the span', () => {
    const html = priorityBadge('p0')
    expect(html).toContain('class="priority-badge p0"')
  })
})

// ─── effortBadge ────────────────────────────────────────────────────────────

describe('effortBadge', () => {
  it('returns empty string for falsy input', () => {
    expect(effortBadge('')).toBe('')
    expect(effortBadge(null)).toBe('')
  })

  it('renders each effort level', () => {
    expect(effortBadge('trivial')).toContain('< 1h')
    expect(effortBadge('small')).toContain('1-2h')
    expect(effortBadge('epic')).toContain('1w+')
  })

  it('wraps in a span with effort-badge class', () => {
    expect(effortBadge('medium')).toContain('class="effort-badge"')
  })
})

// ─── renderMarkdown ─────────────────────────────────────────────────────────

describe('renderMarkdown', () => {
  it('returns empty string for falsy input', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown(null)).toBe('')
  })

  it('escapes raw HTML before processing', () => {
    const out = renderMarkdown('<script>alert(1)</script>')
    expect(out).not.toContain('<script>')
  })

  it('renders **bold**', () => {
    expect(renderMarkdown('**hello**')).toContain('md-bold')
    expect(renderMarkdown('**hello**')).toContain('hello')
  })

  it('renders __bold__', () => {
    expect(renderMarkdown('__hello__')).toContain('md-bold')
  })

  it('renders *italic*', () => {
    expect(renderMarkdown('*hello*')).toContain('md-italic')
  })

  it('renders `inline code`', () => {
    expect(renderMarkdown('`code`')).toContain('md-code')
  })

  it('renders ~~strikethrough~~', () => {
    expect(renderMarkdown('~~struck~~')).toContain('md-strike')
  })

  it('renders [links](url)', () => {
    const out = renderMarkdown('[click](https://example.com)')
    expect(out).toContain('href="https://example.com"')
    expect(out).toContain('md-link')
  })

  it('renders @mentions', () => {
    expect(renderMarkdown('@alice')).toContain('mention-chip')
  })

  it('converts newlines to <br>', () => {
    expect(renderMarkdown('line1\nline2')).toContain('<br>')
  })
})

// ─── appendActivity ─────────────────────────────────────────────────────────

describe('appendActivity', () => {
  it('appends an entry with text and timestamp', () => {
    const task = { activityLog: [] }
    appendActivity(task, 'Task created')
    expect(task.activityLog).toHaveLength(1)
    expect(task.activityLog[0].text).toBe('Task created')
    expect(task.activityLog[0].timestamp).toBeDefined()
  })

  it('initialises activityLog if missing', () => {
    const task = {}
    appendActivity(task, 'Created')
    expect(task.activityLog).toHaveLength(1)
  })

  it('caps the log at 50 entries', () => {
    const task = { activityLog: Array.from({ length: 50 }, (_, i) => ({ text: `entry ${i}`, timestamp: '' })) }
    appendActivity(task, 'new entry')
    expect(task.activityLog).toHaveLength(50)
    expect(task.activityLog[49].text).toBe('new entry')
  })

  it('does not cap when under 50 entries', () => {
    const task = { activityLog: [] }
    for (let i = 0; i < 30; i++) appendActivity(task, `entry ${i}`)
    expect(task.activityLog).toHaveLength(30)
  })
})
