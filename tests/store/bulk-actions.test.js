/**
 * tests/store/bulk-actions.test.js
 *
 * Tests for bulk selection / bulk operation logic defined in app.js.
 * DOM calls are stubbed; state mutations are verified directly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as utils from '../../src/utils.js'

// ─── Inline the bulk-action functions so we can test them independently ───
// (These functions live in app.js and rely on `this`.)

const bulkActions = {
  updateBulkBar() {
    const bar = document.getElementById('bulk-bar')
    const countEl = document.getElementById('bulk-count-num')
    if (!bar) return
    const n = this.selectedTasks.length
    bar.classList.toggle('show', n > 0)
    if (countEl) countEl.textContent = n
  },

  toggleSelect(taskId) {
    if (this.selectedTasks.includes(taskId)) {
      this.selectedTasks = this.selectedTasks.filter(id => id !== taskId)
    } else {
      this.selectedTasks.push(taskId)
    }
    this.updateBulkBar()
    if (this.currentView === 'my-tasks') this.renderMyTasks?.()
    if (this.currentView === 'board') this.renderBoard?.()
  },

  clearSelection() {
    this.selectedTasks = []
    this.updateBulkBar()
  },

  bulkMove(status) {
    if (!this.selectedTasks.length) return
    const count = this.selectedTasks.length
    this.selectedTasks.forEach(id => {
      const task = this.tasks.find(t => t.id === id)
      if (task) task.status = status
    })
    this.save()
    this.clearSelection()
    this.render()
    this.toast(`Moved ${count} task${count !== 1 ? 's' : ''} to ${status.replace('-', ' ')}`)
  },

  bulkDelete() {
    if (!this.selectedTasks.length) return
    const count = this.selectedTasks.length
    this.tasks = this.tasks.filter(t => !this.selectedTasks.includes(t.id))
    this.save()
    this.clearSelection()
    this.render()
    this.toast(`Deleted ${count} task${count !== 1 ? 's' : ''}`)
  },
}

// ─── Mock DOM helpers ─────────────────────────────────────────────────────

function setupBulkBarDOM() {
  document.body.innerHTML = `
    <div id="bulk-bar"></div>
    <span id="bulk-count-num">0</span>
  `
}

// ─── Mock store ───────────────────────────────────────────────────────────

function makeTask(overrides = {}) {
  return {
    id: utils.generateId(),
    title: 'Task',
    status: 'todo',
    ...overrides,
  }
}

function makeStore(overrides = {}) {
  const store = {
    selectedTasks: [],
    tasks: [],
    currentView: 'home',
    save: vi.fn(),
    render: vi.fn(),
    renderMyTasks: vi.fn(),
    renderBoard: vi.fn(),
    toast: vi.fn(),
    ...overrides,
  }
  // Bind all bulk actions to the store
  Object.assign(store, {
    updateBulkBar: bulkActions.updateBulkBar.bind(store),
    toggleSelect: bulkActions.toggleSelect.bind(store),
    clearSelection: bulkActions.clearSelection.bind(store),
    bulkMove: bulkActions.bulkMove.bind(store),
    bulkDelete: bulkActions.bulkDelete.bind(store),
  })
  return store
}

// ═══════════════════════════════════════════════════════════════════════════

describe('updateBulkBar', () => {
  beforeEach(setupBulkBarDOM)

  it('adds "show" class when tasks are selected', () => {
    const store = makeStore({ selectedTasks: ['a', 'b'] })
    store.updateBulkBar()
    expect(document.getElementById('bulk-bar').classList.contains('show')).toBe(true)
  })

  it('removes "show" class when nothing is selected', () => {
    const bar = document.getElementById('bulk-bar')
    bar.classList.add('show')
    const store = makeStore({ selectedTasks: [] })
    store.updateBulkBar()
    expect(bar.classList.contains('show')).toBe(false)
  })

  it('updates the count element text', () => {
    const store = makeStore({ selectedTasks: ['x', 'y', 'z'] })
    store.updateBulkBar()
    expect(document.getElementById('bulk-count-num').textContent).toBe('3')
  })

  it('does not throw when DOM elements are missing', () => {
    document.body.innerHTML = '' // no DOM
    const store = makeStore({ selectedTasks: ['a'] })
    expect(() => store.updateBulkBar()).not.toThrow()
  })
})

describe('toggleSelect', () => {
  beforeEach(setupBulkBarDOM)

  it('adds a task id to selectedTasks', () => {
    const store = makeStore()
    store.toggleSelect('task-1')
    expect(store.selectedTasks).toContain('task-1')
  })

  it('removes a task id when toggled twice', () => {
    const store = makeStore()
    store.toggleSelect('task-1')
    store.toggleSelect('task-1')
    expect(store.selectedTasks).not.toContain('task-1')
  })

  it('can select multiple tasks', () => {
    const store = makeStore()
    store.toggleSelect('a')
    store.toggleSelect('b')
    store.toggleSelect('c')
    expect(store.selectedTasks).toHaveLength(3)
  })

  it('calls renderMyTasks when in my-tasks view', () => {
    const store = makeStore({ currentView: 'my-tasks' })
    store.toggleSelect('x')
    expect(store.renderMyTasks).toHaveBeenCalled()
  })

  it('calls renderBoard when in board view', () => {
    const store = makeStore({ currentView: 'board' })
    store.toggleSelect('x')
    expect(store.renderBoard).toHaveBeenCalled()
  })
})

describe('clearSelection', () => {
  beforeEach(setupBulkBarDOM)

  it('empties selectedTasks', () => {
    const store = makeStore({ selectedTasks: ['a', 'b', 'c'] })
    store.clearSelection()
    expect(store.selectedTasks).toHaveLength(0)
  })

  it('hides the bulk bar', () => {
    const bar = document.getElementById('bulk-bar')
    bar.classList.add('show')
    const store = makeStore({ selectedTasks: ['a'] })
    store.clearSelection()
    expect(bar.classList.contains('show')).toBe(false)
  })
})

describe('bulkMove', () => {
  beforeEach(setupBulkBarDOM)

  it('updates the status of selected tasks', () => {
    const t1 = makeTask({ status: 'todo' })
    const t2 = makeTask({ status: 'todo' })
    const store = makeStore({ tasks: [t1, t2], selectedTasks: [t1.id] })
    store.bulkMove('done')
    expect(store.tasks.find(t => t.id === t1.id).status).toBe('done')
    expect(store.tasks.find(t => t.id === t2.id).status).toBe('todo') // unchanged
  })

  it('clears selection after moving', () => {
    const t1 = makeTask()
    const store = makeStore({ tasks: [t1], selectedTasks: [t1.id] })
    store.bulkMove('in-progress')
    expect(store.selectedTasks).toHaveLength(0)
  })

  it('calls save() and render()', () => {
    const t1 = makeTask()
    const store = makeStore({ tasks: [t1], selectedTasks: [t1.id] })
    store.bulkMove('done')
    expect(store.save).toHaveBeenCalled()
    expect(store.render).toHaveBeenCalled()
  })

  it('shows toast with correct count', () => {
    const t1 = makeTask()
    const t2 = makeTask()
    const store = makeStore({ tasks: [t1, t2], selectedTasks: [t1.id, t2.id] })
    store.bulkMove('done')
    expect(store.toast).toHaveBeenCalledWith(expect.stringContaining('2 tasks'))
  })

  it('does nothing when nothing selected', () => {
    const store = makeStore({ tasks: [makeTask()] })
    store.bulkMove('done')
    expect(store.save).not.toHaveBeenCalled()
  })
})

describe('bulkDelete', () => {
  beforeEach(setupBulkBarDOM)

  it('removes selected tasks from store.tasks', () => {
    const t1 = makeTask()
    const t2 = makeTask()
    const t3 = makeTask()
    const store = makeStore({ tasks: [t1, t2, t3], selectedTasks: [t1.id, t2.id] })
    store.bulkDelete()
    expect(store.tasks).toHaveLength(1)
    expect(store.tasks[0].id).toBe(t3.id)
  })

  it('clears selection after delete', () => {
    const t1 = makeTask()
    const store = makeStore({ tasks: [t1], selectedTasks: [t1.id] })
    store.bulkDelete()
    expect(store.selectedTasks).toHaveLength(0)
  })

  it('calls save() and render()', () => {
    const t1 = makeTask()
    const store = makeStore({ tasks: [t1], selectedTasks: [t1.id] })
    store.bulkDelete()
    expect(store.save).toHaveBeenCalled()
    expect(store.render).toHaveBeenCalled()
  })

  it('shows toast with singular form for one task', () => {
    const t1 = makeTask()
    const store = makeStore({ tasks: [t1], selectedTasks: [t1.id] })
    store.bulkDelete()
    expect(store.toast).toHaveBeenCalledWith('Deleted 1 task')
  })

  it('shows toast with plural form for multiple tasks', () => {
    const t1 = makeTask()
    const t2 = makeTask()
    const store = makeStore({ tasks: [t1, t2], selectedTasks: [t1.id, t2.id] })
    store.bulkDelete()
    expect(store.toast).toHaveBeenCalledWith('Deleted 2 tasks')
  })

  it('does nothing when nothing selected', () => {
    const store = makeStore({ tasks: [makeTask()] })
    store.bulkDelete()
    expect(store.save).not.toHaveBeenCalled()
  })
})
