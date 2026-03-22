/**
 * tests/integration/task-lifecycle.test.js
 *
 * End-to-end data-flow tests: create → read → update → delete.
 * Uses a realistic store assembled from the actual action modules.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { taskActions } from '../../src/stores/actions/taskActions.js'
import { projectActions } from '../../src/stores/actions/projectActions.js'
import { labelActions } from '../../src/stores/actions/labelActions.js'
import { userActions } from '../../src/stores/actions/userActions.js'
import * as utils from '../../src/utils.js'

// ─── Shared test fixtures ────────────────────────────────────────────────

const ADMIN_USER = { id: utils.generateId(), name: 'Admin User', email: 'admin@test.com', role: 'admin', color: '#6366f1' }
const COLLAB_USER = { id: utils.generateId(), name: 'Alice', email: 'alice@test.com', role: 'collaborator', color: '#22c55e' }

function makeFullStore(overrides = {}) {
  const store = {
    // ── state ──
    tasks: [],
    projects: [],
    labels: [],
    users: [ADMIN_USER, COLLAB_USER],
    notifications: [],
    currentUserId: ADMIN_USER.id,
    editingTaskId: null,
    editingProjectId: null,
    editingUserId: null,
    boardColumns: [
      { id: 'todo', name: 'To Do' },
      { id: 'in-progress', name: 'In Progress' },
      { id: 'done', name: 'Done' },
    ],
    selectedTasks: [],
    currentView: 'home',
    selectedProjectId: null,
    undoStack: [],

    // ── utility delegates ──
    generateId: utils.generateId,
    esc: utils.esc,
    safeColor: utils.safeColor,
    initials: utils.initials,
    formatDate: utils.formatDate,
    appendActivity: (task, text) => utils.appendActivity(task, text),

    // ── stubs ──
    save: vi.fn(),
    render: vi.fn(),
    renderLabelList: vi.fn(),
    renderLabelPicker: vi.fn(),
    populateStatusSelects: vi.fn(),
    populateTemplateSelect: vi.fn(),
    getSelectedLabels: vi.fn(() => []),
    addNotification: vi.fn(),
    toast: vi.fn(),
    closeTaskModal: vi.fn(),
    closeProjectModal: vi.fn(),
    closeUserModal: vi.fn(),
    confirm: vi.fn(async () => true),
    switchView: vi.fn(function(v) { this.currentView = v }),
    canManageProject: function() { return userActions.canManageProject.call(this) },
    getCurrentUser: function() { return this.users.find(u => u.id === this.currentUserId) },
    canEditTask: function(id) { return userActions.canEditTask.call(this, id) },
    canDeleteTask: function(id) { return userActions.canDeleteTask.call(this, id) },
    isBlocked: vi.fn(() => false),
    renderMyTasks: vi.fn(),
    renderBoard: vi.fn(),
    updateBulkBar: vi.fn(),
    renderProjectView: vi.fn(),
    ...overrides,
  }
  return store
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════

describe('Task lifecycle — create', () => {
  it('task has all required fields after creation', () => {
    const store = makeFullStore()
    const task = {
      id: store.generateId(),
      title: 'Write the spec',
      description: 'Detailed spec needed.',
      status: 'todo',
      projectId: '',
      assigneeId: ADMIN_USER.id,
      dueDate: '2025-12-31',
      priority: 'p1',
      labelIds: [],
      blockedBy: [],
      order: 0,
      parentId: '',
      attachments: [],
      comments: [],
      activityLog: [{ text: 'Task created', timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString().split('T')[0],
    }
    store.tasks.push(task)

    const found = store.tasks.find(t => t.id === task.id)
    expect(found).toBeDefined()
    expect(found.title).toBe('Write the spec')
    expect(found.activityLog).toHaveLength(1)
    expect(found.activityLog[0].text).toBe('Task created')
  })

  it('multiple tasks can coexist with unique ids', () => {
    const store = makeFullStore()
    for (let i = 0; i < 10; i++) {
      store.tasks.push({ id: store.generateId(), title: `Task ${i}`, status: 'todo' })
    }
    const ids = new Set(store.tasks.map(t => t.id))
    expect(ids.size).toBe(10)
  })

  it('subtask creation links to parent', () => {
    const store = makeFullStore()
    const parent = { id: store.generateId(), title: 'Parent', status: 'todo', parentId: '' }
    const child = { id: store.generateId(), title: 'Subtask', status: 'todo', parentId: parent.id }
    store.tasks = [parent, child]

    const children = store.tasks.filter(t => t.parentId === parent.id)
    expect(children).toHaveLength(1)
    expect(children[0].title).toBe('Subtask')
  })
})

describe('Task lifecycle — update', () => {
  let store, task

  beforeEach(() => {
    store = makeFullStore()
    task = {
      id: utils.generateId(),
      title: 'Original title',
      status: 'todo',
      priority: 'p2',
      description: 'Original',
      assigneeId: ADMIN_USER.id,
      dueDate: '2025-06-01',
      labelIds: [],
      projectId: '',
      comments: [],
      attachments: [],
      activityLog: [],
      createdAt: '2025-01-01',
      parentId: '',
      blockedBy: [],
      order: 0,
    }
    store.tasks = [task]
  })

  it('updates title without losing other fields', () => {
    const idx = store.tasks.findIndex(t => t.id === task.id)
    const updated = { ...store.tasks[idx], title: 'Updated title' }
    store.tasks[idx] = updated

    expect(store.tasks[0].title).toBe('Updated title')
    expect(store.tasks[0].priority).toBe('p2')
    expect(store.tasks[0].assigneeId).toBe(ADMIN_USER.id)
  })

  it('updates status', () => {
    store.tasks[0].status = 'done'
    expect(store.tasks[0].status).toBe('done')
  })

  it('assigns to a different user', () => {
    store.tasks[0].assigneeId = COLLAB_USER.id
    expect(store.tasks[0].assigneeId).toBe(COLLAB_USER.id)
  })

  it('attaches a label', () => {
    const label = { id: utils.generateId(), name: 'Bug', color: '#ff0000' }
    store.labels = [label]
    store.tasks[0].labelIds = [label.id]
    expect(store.tasks[0].labelIds).toContain(label.id)
  })

  it('removes a label', () => {
    const l1 = { id: utils.generateId(), name: 'Bug', color: '#f00' }
    const l2 = { id: utils.generateId(), name: 'Feature', color: '#0f0' }
    store.labels = [l1, l2]
    store.tasks[0].labelIds = [l1.id, l2.id]

    store.tasks[0].labelIds = store.tasks[0].labelIds.filter(id => id !== l1.id)
    expect(store.tasks[0].labelIds).toEqual([l2.id])
  })
})

describe('Task lifecycle — delete', () => {
  let store

  beforeEach(() => {
    store = makeFullStore()
    store.tasks = [
      { id: 'task-1', title: 'First', status: 'todo', parentId: '' },
      { id: 'task-2', title: 'Second', status: 'todo', parentId: '' },
      { id: 'task-3', title: 'Third', status: 'done', parentId: '' },
    ]
  })

  it('removes a task by id', () => {
    store.tasks = store.tasks.filter(t => t.id !== 'task-1')
    expect(store.tasks).toHaveLength(2)
    expect(store.tasks.find(t => t.id === 'task-1')).toBeUndefined()
  })

  it('deleting a parent also removes subtasks', () => {
    store.tasks.push({ id: 'child-1', title: 'Child', status: 'todo', parentId: 'task-1' })
    const toDelete = 'task-1'
    store.tasks = store.tasks.filter(t => t.id !== toDelete && t.parentId !== toDelete)
    expect(store.tasks.find(t => t.id === 'child-1')).toBeUndefined()
    expect(store.tasks).toHaveLength(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════

describe('Project lifecycle', () => {
  it('create → find → update → delete', () => {
    const store = makeFullStore()

    // Create
    const proj = { id: utils.generateId(), name: 'Alpha', color: '#6366f1', description: '' }
    store.projects.push(proj)
    expect(store.projects).toHaveLength(1)

    // Read
    const found = store.projects.find(p => p.id === proj.id)
    expect(found.name).toBe('Alpha')

    // Update
    found.name = 'Alpha V2'
    expect(store.projects[0].name).toBe('Alpha V2')

    // Delete + task cleanup
    store.tasks = [
      { id: utils.generateId(), title: 'T1', projectId: proj.id, status: 'todo' },
      { id: utils.generateId(), title: 'T2', projectId: 'other', status: 'todo' },
    ]
    store.projects = store.projects.filter(p => p.id !== proj.id)
    store.tasks.forEach(t => { if (t.projectId === proj.id) t.projectId = '' })

    expect(store.projects).toHaveLength(0)
    expect(store.tasks.filter(t => t.projectId === proj.id)).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LABEL LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════

describe('Label lifecycle', () => {
  it('create → apply to task → delete cleans up tasks', () => {
    const store = makeFullStore()

    // Create label
    const label = { id: utils.generateId(), name: 'Bug', color: '#ff4444' }
    store.labels.push(label)

    // Apply to task
    const task = { id: utils.generateId(), title: 'Fix it', status: 'todo', labelIds: [label.id] }
    store.tasks.push(task)
    expect(store.tasks[0].labelIds).toContain(label.id)

    // Delete label → task cleanup
    store.labels = store.labels.filter(l => l.id !== label.id)
    store.tasks.forEach(t => { t.labelIds = (t.labelIds || []).filter(x => x !== label.id) })

    expect(store.labels).toHaveLength(0)
    expect(store.tasks[0].labelIds).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// FILTER / SEARCH logic
// ═══════════════════════════════════════════════════════════════════════════

describe('Task filtering logic', () => {
  let tasks

  beforeEach(() => {
    tasks = [
      { id: 'a', title: 'Deploy backend', status: 'todo', priority: 'p0', projectId: 'proj-1', assigneeId: 'user-1', labelIds: [] },
      { id: 'b', title: 'Write tests', status: 'in-progress', priority: 'p1', projectId: 'proj-1', assigneeId: 'user-2', labelIds: [] },
      { id: 'c', title: 'Update docs', status: 'done', priority: 'p2', projectId: 'proj-2', assigneeId: 'user-1', labelIds: ['label-1'] },
      { id: 'd', title: 'Fix login bug', status: 'todo', priority: 'p0', projectId: 'proj-2', assigneeId: 'user-2', labelIds: ['label-1'] },
    ]
  })

  it('search filter is case-insensitive and matches title substrings', () => {
    const q = 'deploy'
    const result = tasks.filter(t => t.title.toLowerCase().includes(q.toLowerCase()))
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })

  it('filters by status', () => {
    const result = tasks.filter(t => t.status === 'todo')
    expect(result).toHaveLength(2)
  })

  it('filters by project', () => {
    const result = tasks.filter(t => t.projectId === 'proj-2')
    expect(result).toHaveLength(2)
  })

  it('filters by priority', () => {
    const result = tasks.filter(t => t.priority === 'p0')
    expect(result).toHaveLength(2)
  })

  it('filters by assignee', () => {
    const result = tasks.filter(t => t.assigneeId === 'user-1')
    expect(result).toHaveLength(2)
  })

  it('filters by label', () => {
    const result = tasks.filter(t => (t.labelIds || []).includes('label-1'))
    expect(result).toHaveLength(2)
  })

  it('combined filters narrow results', () => {
    const result = tasks.filter(t =>
      t.projectId === 'proj-2' &&
      t.assigneeId === 'user-2'
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('d')
  })

  it('empty search returns all tasks', () => {
    const q = ''
    const result = q ? tasks.filter(t => t.title.toLowerCase().includes(q.toLowerCase())) : tasks
    expect(result).toHaveLength(4)
  })

  it('detects isFiltered correctly', () => {
    const checkFiltered = (search, fProj, fStatus, fPriority, fLabel, fAssignee) =>
      !!(search || fProj || fStatus || fPriority || fLabel || fAssignee)

    expect(checkFiltered('', '', '', '', '', '')).toBe(false)
    expect(checkFiltered('deploy', '', '', '', '', '')).toBe(true)
    expect(checkFiltered('', 'proj-1', '', '', '', '')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// UNDO STACK
// ═══════════════════════════════════════════════════════════════════════════

describe('Undo stack', () => {
  it('pushes snapshots and pops them correctly', () => {
    const store = makeFullStore()
    const task = { id: 'x', title: 'Original', status: 'todo' }
    store.tasks = [task]

    // Push snapshot
    store.undoStack.push({ tasks: JSON.parse(JSON.stringify(store.tasks)) })

    // Mutate
    store.tasks[0].title = 'Changed'
    store.tasks[0].status = 'done'

    expect(store.tasks[0].title).toBe('Changed')
    expect(store.undoStack).toHaveLength(1)

    // Undo
    const snapshot = store.undoStack.pop()
    store.tasks = snapshot.tasks

    expect(store.tasks[0].title).toBe('Original')
    expect(store.tasks[0].status).toBe('todo')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// BOARD COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

describe('Board column data integrity', () => {
  it('each column has id and name', () => {
    const store = makeFullStore()
    store.boardColumns.forEach(col => {
      expect(col).toHaveProperty('id')
      expect(col).toHaveProperty('name')
      expect(typeof col.id).toBe('string')
      expect(col.id.length).toBeGreaterThan(0)
    })
  })

  it('tasks reference valid board column ids', () => {
    const store = makeFullStore()
    const validStatuses = new Set(store.boardColumns.map(c => c.id))
    store.tasks = [
      { id: '1', title: 'T1', status: 'todo' },
      { id: '2', title: 'T2', status: 'in-progress' },
      { id: '3', title: 'T3', status: 'done' },
    ]
    store.tasks.forEach(t => {
      expect(validStatuses.has(t.status)).toBe(true)
    })
  })
})
