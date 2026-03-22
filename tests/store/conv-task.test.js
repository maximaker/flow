/**
 * tests/store/conv-task.test.js
 * Tests for the conversational task creation flow.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { convTaskActions } from '../../src/stores/actions/convTaskActions.js'
import * as utils from '../../src/utils.js'

// ─── DOM setup ────────────────────────────────────────────────────────────

function setupConvDOM() {
  document.body.innerHTML = `
    <div id="conv-task-overlay">
      <div id="conv-thread"></div>
      <p id="conv-current-question"></p>
      <p id="conv-current-hint"></p>
      <div id="conv-input-area"></div>
      <button id="conv-skip-btn"></button>
    </div>
  `
}

// ─── Mock store ───────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
  return { id: utils.generateId(), name: 'User', color: '#6366f1', ...overrides }
}

function makeConvStore(overrides = {}) {
  const store = {
    convActive: false,
    convStep: 0,
    convAnswers: {},
    tasks: [],
    projects: [],
    users: [makeUser({ name: 'Alice' })],
    currentUserId: null,
    boardColumns: [{ id: 'todo', name: 'To Do' }],
    save: vi.fn(),
    renderMyTasks: vi.fn(),
    toast: vi.fn(),
    generateId: utils.generateId,
    esc: utils.esc,
    safeColor: utils.safeColor,
    initials: utils.initials,
    formatDate: utils.formatDate,
    ...overrides,
  }
  Object.entries(convTaskActions).forEach(([key, fn]) => {
    if (typeof fn === 'function') store[key] = fn.bind(store)
  })
  return store
}

// ═══════════════════════════════════════════════════════════════════════════

describe('convTaskActions — _convSteps', () => {
  it('returns 5 steps with required fields', () => {
    const store = makeConvStore()
    const steps = store._convSteps()
    expect(steps).toHaveLength(5)
    steps.forEach(step => {
      expect(step).toHaveProperty('id')
      expect(step).toHaveProperty('question')
      expect(step).toHaveProperty('type')
    })
  })

  it('first step (title) is required', () => {
    const store = makeConvStore()
    const [first] = store._convSteps()
    expect(first.id).toBe('title')
    expect(first.required).toBe(true)
  })

  it('non-title steps have skipLabel', () => {
    const store = makeConvStore()
    const steps = store._convSteps().slice(1)
    steps.forEach(s => expect(s.skipLabel).toBeTruthy())
  })
})

describe('convTaskActions — openConvTask / closeConvTask', () => {
  beforeEach(setupConvDOM)

  it('openConvTask sets convActive = true', () => {
    const store = makeConvStore()
    store.openConvTask()
    expect(store.convActive).toBe(true)
  })

  it('openConvTask resets step to 0 and answers to {}', () => {
    const store = makeConvStore({ convStep: 3, convAnswers: { title: 'old' } })
    store.openConvTask()
    expect(store.convStep).toBe(0)
    expect(store.convAnswers).toEqual({})
  })

  it('openConvTask adds "show" class to overlay', () => {
    const store = makeConvStore()
    store.openConvTask()
    expect(document.getElementById('conv-task-overlay').classList.contains('show')).toBe(true)
  })

  it('closeConvTask sets convActive = false', () => {
    const store = makeConvStore({ convActive: true })
    document.getElementById('conv-task-overlay').classList.add('show')
    store.closeConvTask()
    expect(store.convActive).toBe(false)
  })

  it('closeConvTask removes "show" from overlay', () => {
    const store = makeConvStore({ convActive: true })
    document.getElementById('conv-task-overlay').classList.add('show')
    store.closeConvTask()
    expect(document.getElementById('conv-task-overlay').classList.contains('show')).toBe(false)
  })
})

describe('convTaskActions — _convSubmit / _convSkip', () => {
  beforeEach(setupConvDOM)

  it('_convSubmit records answer and increments step', () => {
    const store = makeConvStore()
    store._convSubmit('Buy milk')
    expect(store.convAnswers.title).toBe('Buy milk')
    expect(store.convStep).toBe(1)
  })

  it('_convSkip records null and increments step', () => {
    const store = makeConvStore({ convStep: 1 }) // step 1 = dueDate (not required)
    store._convSkip()
    expect(store.convAnswers.dueDate).toBeNull()
    expect(store.convStep).toBe(2)
  })

  it('_convSkip does nothing if step is required', () => {
    const store = makeConvStore({ convStep: 0 }) // title is required
    store._convSkip()
    expect(store.convStep).toBe(0) // no change
  })
})

describe('convTaskActions — _convAnswerLabel', () => {
  it('returns user name for assigneeId', () => {
    const user = makeUser({ name: 'Bob' })
    const store = makeConvStore({ users: [user] })
    const step = { id: 'assigneeId' }
    expect(store._convAnswerLabel(step, user.id)).toBe('Bob')
  })

  it('returns project name for projectId', () => {
    const proj = { id: utils.generateId(), name: 'Alpha', color: '#f00' }
    const store = makeConvStore({ projects: [proj] })
    const step = { id: 'projectId' }
    expect(store._convAnswerLabel(step, proj.id)).toBe('Alpha')
  })

  it('returns priority label for priority', () => {
    const store = makeConvStore()
    const step = { id: 'priority' }
    expect(store._convAnswerLabel(step, 'p0')).toContain('Urgent')
    expect(store._convAnswerLabel(step, 'p3')).toContain('Low')
  })

  it('returns null for empty value', () => {
    const store = makeConvStore()
    const step = { id: 'title' }
    expect(store._convAnswerLabel(step, null)).toBeNull()
    expect(store._convAnswerLabel(step, '')).toBeNull()
  })

  it('returns the raw value for title', () => {
    const store = makeConvStore()
    const step = { id: 'title' }
    expect(store._convAnswerLabel(step, 'Write report')).toBe('Write report')
  })
})

describe('convTaskActions — _convCreate', () => {
  beforeEach(setupConvDOM)

  it('creates a task and pushes it to store.tasks', () => {
    const store = makeConvStore({
      convAnswers: { title: 'Deploy feature', dueDate: null, assigneeId: null, projectId: null, priority: 'p1' },
    })
    document.getElementById('conv-task-overlay').classList.add('show')
    store.convActive = true
    store._convCreate()

    expect(store.tasks).toHaveLength(1)
    expect(store.tasks[0].title).toBe('Deploy feature')
    expect(store.tasks[0].priority).toBe('p1')
  })

  it('does not create a task if title is missing', () => {
    const store = makeConvStore({ convAnswers: { title: '' } })
    store._convCreate()
    expect(store.tasks).toHaveLength(0)
  })

  it('calls save() and shows a toast', () => {
    const store = makeConvStore({
      convAnswers: { title: 'Test task' },
    })
    document.getElementById('conv-task-overlay').classList.add('show')
    store.convActive = true
    store._convCreate()
    expect(store.save).toHaveBeenCalled()
    expect(store.toast).toHaveBeenCalled()
  })

  it('closes the conv overlay after creation', () => {
    const overlay = document.getElementById('conv-task-overlay')
    overlay.classList.add('show')
    const store = makeConvStore({ convActive: true, convAnswers: { title: 'Test' } })
    store._convCreate()
    expect(overlay.classList.contains('show')).toBe(false)
    expect(store.convActive).toBe(false)
  })

  it('auto-skips project step when no projects exist', () => {
    const store = makeConvStore({
      projects: [],
      convStep: 3, // projectId step
      convAnswers: { title: 'Task', dueDate: null, assigneeId: null },
    })
    // Calling _renderConvStep for the projects step when projects.length === 0 should auto-skip
    const before = store.convStep
    store._renderConvStep()
    // Step should have advanced past projects
    expect(store.convStep).toBeGreaterThan(before)
  })

  it('assigns task to currentUserId if no assigneeId given', () => {
    const userId = utils.generateId()
    const store = makeConvStore({
      currentUserId: userId,
      convAnswers: { title: 'Solo task', dueDate: null, assigneeId: null, projectId: null, priority: null },
    })
    document.getElementById('conv-task-overlay').classList.add('show')
    store.convActive = true
    store._convCreate()
    expect(store.tasks[0].assigneeId).toBe(userId)
  })
})
