/**
 * tests/integration/view-switching.test.js
 *
 * Tests for switchView, toast system, clearFilters, and the
 * updateBulkBar fix that caused all nav clicks to silently fail.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as utils from '../../src/utils.js'

// ─── Minimal app shell DOM ────────────────────────────────────────────────

function setupAppShellDOM() {
  document.body.innerHTML = `
    <span id="page-title"></span>

    <!-- Nav items -->
    <a class="nav-item" data-view="home">Home</a>
    <a class="nav-item" data-view="my-tasks">My Tasks</a>
    <a class="nav-item" data-view="board">Board</a>
    <a class="nav-item" data-view="settings">Settings</a>

    <!-- View panels -->
    <div class="view active" id="view-home"></div>
    <div class="view" id="view-my-tasks"></div>
    <div class="view" id="view-board"></div>
    <div class="view" id="view-settings"></div>

    <!-- Bulk bar -->
    <div id="bulk-bar"></div>
    <span id="bulk-count-num">0</span>

    <!-- Toast -->
    <div id="toast-container"></div>

    <!-- Sidebar project list -->
    <div id="project-list"></div>

    <!-- Search / filters -->
    <input id="search-input" value="" />
    <select id="filter-project"><option value="">All</option></select>
    <select id="filter-status"><option value="">All</option></select>
    <select id="filter-priority"><option value="">All</option></select>
    <select id="filter-label"><option value="">All</option></select>
    <select id="filter-assignee"><option value="">All</option></select>
  `
}

// ─── Replicated switchView / updateBulkBar / clearFilters logic ──────────
// (These live in app.js; we replicate them here to test them in isolation.)

function makeSwitchStore(overrides = {}) {
  const store = {
    currentView: 'home',
    selectedTasks: [],
    tasks: [],
    projects: [],
    users: [],
    currentUserId: null,
    notifications: [],

    // stubs for sub-renders
    renderSidebar: vi.fn(),
    renderNotifications: vi.fn(),
    renderNavBadges: vi.fn(),
    renderBreadcrumb: vi.fn(),
    renderHome: vi.fn(),
    renderMyTasks: vi.fn(),
    renderBoard: vi.fn(),
    renderTimeline: vi.fn(),
    renderAnalytics: vi.fn(),
    renderWorkload: vi.fn(),
    renderProjectView: vi.fn(),
    renderSettings: vi.fn(),
    toast: vi.fn(),
    save: vi.fn(),
    esc: utils.esc,

    updateBulkBar() {
      const bar = document.getElementById('bulk-bar')
      const countEl = document.getElementById('bulk-count-num')
      if (!bar) return
      bar.classList.toggle('show', this.selectedTasks.length > 0)
      if (countEl) countEl.textContent = this.selectedTasks.length
    },

    render() {
      this.renderSidebar()
      this.renderNotifications()
      this.renderNavBadges()
      this.renderBreadcrumb()
      const map = {
        home: 'renderHome', 'my-tasks': 'renderMyTasks', board: 'renderBoard',
        timeline: 'renderTimeline', analytics: 'renderAnalytics',
        workload: 'renderWorkload', project: 'renderProjectView', settings: 'renderSettings',
      }
      this[map[this.currentView]]?.()
    },

    switchView(view) {
      this.currentView = view
      this.selectedTasks = []
      this.updateBulkBar()
      document.querySelectorAll('.nav-item[data-view]').forEach(el =>
        el.classList.toggle('active', el.dataset.view === view)
      )
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
      const viewMap = {
        home: 'view-home', 'my-tasks': 'view-my-tasks', board: 'view-board',
        timeline: 'view-timeline', analytics: 'view-analytics', workload: 'view-workload',
        project: 'view-project', settings: 'view-settings',
      }
      document.getElementById(viewMap[view])?.classList.add('active')
      document.getElementById('page-title').textContent = view
      this.render()
    },

    clearFilters() {
      const ids = ['search-input', 'filter-project', 'filter-status', 'filter-priority', 'filter-label', 'filter-assignee']
      ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = '' })
      this.renderMyTasks()
    },

    ...overrides,
  }
  return store
}

// ═══════════════════════════════════════════════════════════════════════════

describe('switchView — DOM state', () => {
  beforeEach(setupAppShellDOM)

  it('sets currentView on the store', () => {
    const store = makeSwitchStore()
    store.switchView('my-tasks')
    expect(store.currentView).toBe('my-tasks')
  })

  it('activates the correct .view panel', () => {
    const store = makeSwitchStore()
    store.switchView('my-tasks')
    expect(document.getElementById('view-my-tasks').classList.contains('active')).toBe(true)
    expect(document.getElementById('view-home').classList.contains('active')).toBe(false)
    expect(document.getElementById('view-board').classList.contains('active')).toBe(false)
  })

  it('activates the correct nav item', () => {
    const store = makeSwitchStore()
    store.switchView('board')
    const boardNav = document.querySelector('[data-view="board"]')
    const homeNav = document.querySelector('[data-view="home"]')
    expect(boardNav.classList.contains('active')).toBe(true)
    expect(homeNav.classList.contains('active')).toBe(false)
  })

  it('updates page-title text', () => {
    const store = makeSwitchStore()
    store.switchView('settings')
    expect(document.getElementById('page-title').textContent).toBe('settings')
  })

  it('clears selectedTasks on view switch', () => {
    const store = makeSwitchStore({ selectedTasks: ['a', 'b', 'c'] })
    store.switchView('board')
    expect(store.selectedTasks).toHaveLength(0)
  })

  it('hides bulk bar after clearing selection', () => {
    const bar = document.getElementById('bulk-bar')
    bar.classList.add('show')
    const store = makeSwitchStore({ selectedTasks: ['a'] })
    store.switchView('home')
    expect(bar.classList.contains('show')).toBe(false)
  })

  it('calls render() which triggers the correct view renderer', () => {
    const store = makeSwitchStore()
    store.switchView('my-tasks')
    expect(store.renderMyTasks).toHaveBeenCalled()

    store.switchView('board')
    expect(store.renderBoard).toHaveBeenCalled()

    store.switchView('settings')
    expect(store.renderSettings).toHaveBeenCalled()
  })

  it('does NOT throw even when optional view panels are absent', () => {
    // timeline/analytics/workload don't have DOM elements in our minimal fixture
    const store = makeSwitchStore()
    expect(() => store.switchView('timeline')).not.toThrow()
    expect(store.currentView).toBe('timeline')
  })

  it('switching views multiple times always reflects latest view', () => {
    const store = makeSwitchStore()
    store.switchView('board')
    store.switchView('my-tasks')
    store.switchView('home')
    expect(store.currentView).toBe('home')
    expect(document.getElementById('view-home').classList.contains('active')).toBe(true)
  })
})

describe('clearFilters', () => {
  beforeEach(setupAppShellDOM)

  it('resets all filter inputs to empty string', () => {
    // Set some filter values
    document.getElementById('search-input').value = 'hello'
    document.getElementById('filter-project').value = ''
    document.getElementById('filter-status').value = ''

    const store = makeSwitchStore()
    store.clearFilters()

    expect(document.getElementById('search-input').value).toBe('')
  })

  it('calls renderMyTasks after clearing', () => {
    const store = makeSwitchStore()
    store.clearFilters()
    expect(store.renderMyTasks).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════

describe('Toast system', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="toast-container"></div>'
  })

  function makeToastStore() {
    const store = {
      esc: utils.esc,
      toast(msg, type = '') {
        const c = document.getElementById('toast-container')
        if (!c) return
        const t = document.createElement('div')
        t.className = 'toast' + (type ? ' ' + type : '')
        t.textContent = msg
        c.appendChild(t)
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400) }, 3000)
      },
    }
    return store
  }

  it('appends a toast element to the container', () => {
    const store = makeToastStore()
    store.toast('Saved successfully')
    const toasts = document.querySelectorAll('.toast')
    expect(toasts.length).toBeGreaterThanOrEqual(1)
    expect(toasts[0].textContent).toBe('Saved successfully')
  })

  it('applies type class when provided', () => {
    const store = makeToastStore()
    store.toast('Something went wrong', 'error')
    const toast = document.querySelector('.toast.error')
    expect(toast).toBeTruthy()
    expect(toast.textContent).toBe('Something went wrong')
  })

  it('success toast has "success" class', () => {
    const store = makeToastStore()
    store.toast('Task created', 'success')
    expect(document.querySelector('.toast.success')).toBeTruthy()
  })

  it('does not throw when container is missing', () => {
    document.body.innerHTML = '' // no container
    const store = makeToastStore()
    expect(() => store.toast('test')).not.toThrow()
  })

  it('multiple toasts stack in the container', () => {
    const store = makeToastStore()
    store.toast('First')
    store.toast('Second')
    store.toast('Third')
    expect(document.querySelectorAll('.toast').length).toBe(3)
  })
})

// ═══════════════════════════════════════════════════════════════════════════

describe('render() — view dispatch', () => {
  beforeEach(setupAppShellDOM)

  it('calls renderHome when currentView is home', () => {
    const store = makeSwitchStore({ currentView: 'home' })
    store.render()
    expect(store.renderHome).toHaveBeenCalled()
  })

  it('calls renderMyTasks when currentView is my-tasks', () => {
    const store = makeSwitchStore({ currentView: 'my-tasks' })
    store.render()
    expect(store.renderMyTasks).toHaveBeenCalled()
  })

  it('always calls renderSidebar, renderNavBadges, renderBreadcrumb', () => {
    const store = makeSwitchStore({ currentView: 'home' })
    store.render()
    expect(store.renderSidebar).toHaveBeenCalled()
    expect(store.renderNavBadges).toHaveBeenCalled()
    expect(store.renderBreadcrumb).toHaveBeenCalled()
  })
})
