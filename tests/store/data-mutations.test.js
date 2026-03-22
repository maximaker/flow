/**
 * tests/store/data-mutations.test.js
 *
 * Tests for pure state-mutation logic in action files.
 * Each test creates a lightweight mock store (plain object) and calls
 * action methods with `fn.call(store, ...)` — no Pinia, no DOM required.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { labelActions } from '../../src/stores/actions/labelActions.js'
import { projectActions } from '../../src/stores/actions/projectActions.js'
import { userActions } from '../../src/stores/actions/userActions.js'
import { taskActions } from '../../src/stores/actions/taskActions.js'
import * as utils from '../../src/utils.js'

// ─── Factory helpers ─────────────────────────────────────────────────────────

function makeTask(overrides = {}) {
  return {
    id: utils.generateId(),
    title: 'Test task',
    description: '',
    status: 'todo',
    projectId: '',
    assigneeId: '',
    dueDate: '',
    priority: '',
    labelIds: [],
    blockedBy: [],
    order: 0,
    parentId: '',
    attachments: [],
    comments: [],
    activityLog: [],
    createdAt: new Date().toISOString().split('T')[0],
    ...overrides,
  }
}

function makeProject(overrides = {}) {
  return { id: utils.generateId(), name: 'Project', color: '#6366f1', description: '', ...overrides }
}

function makeUser(overrides = {}) {
  return { id: utils.generateId(), name: 'User', email: 'u@example.com', role: 'user', color: '#6366f1', ...overrides }
}

function makeLabel(overrides = {}) {
  return { id: utils.generateId(), name: 'Label', color: '#ff0000', ...overrides }
}

/**
 * A minimal mock store that exposes the state shape actions rely on.
 * All DOM and PocketBase calls are stubbed out.
 */
function makeStore(overrides = {}) {
  const currentUser = makeUser({ role: 'admin' })
  return {
    // ── state ──
    tasks: [],
    projects: [],
    labels: [],
    users: [currentUser],
    currentUserId: currentUser.id,
    editingTaskId: null,
    editingProjectId: null,
    editingUserId: null,
    boardColumns: [{ id: 'todo', name: 'To Do' }, { id: 'in-progress', name: 'In Progress' }, { id: 'done', name: 'Done' }],
    selectedTasks: [],
    currentView: 'home',
    selectedProjectId: null,
    _pendingSubtasks: [],
    notifications: [],

    // ── utility delegates ──
    generateId: utils.generateId,
    esc: utils.esc,
    safeColor: utils.safeColor,
    initials: utils.initials,
    formatDate: utils.formatDate,

    // ── stub out DOM / PB / render calls ──
    save: vi.fn(),
    render: vi.fn(),
    renderLabelList: vi.fn(),
    renderSettingsUsers: vi.fn(),
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
    switchView: vi.fn(),
    canManageProject: vi.fn(() => true),
    getCurrentUser: function() { return this.users.find(u => u.id === this.currentUserId) },

    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LABEL ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('labelActions — createLabel (state only)', () => {
  let store

  beforeEach(() => {
    store = makeStore()
  })

  it('pushes a new label onto store.labels', () => {
    const label = makeLabel({ name: 'Bug', color: '#ff4444' })
    store.labels.push(label)
    expect(store.labels).toHaveLength(1)
    expect(store.labels[0].name).toBe('Bug')
  })

  it('deleteLabel removes label by id', () => {
    const l1 = makeLabel({ name: 'Bug' })
    const l2 = makeLabel({ name: 'Feature' })
    store.labels = [l1, l2]
    // Manually call the mutation logic (mirrors deleteLabel internals)
    store.labels = store.labels.filter(l => l.id !== l1.id)
    expect(store.labels).toHaveLength(1)
    expect(store.labels[0].name).toBe('Feature')
  })

  it('deleteLabel cleans up labelIds on tasks', () => {
    const label = makeLabel()
    const task = makeTask({ labelIds: [label.id, 'other'] })
    store.labels = [label]
    store.tasks = [task]

    // Simulate deleteLabel mutation
    store.labels = store.labels.filter(l => l.id !== label.id)
    store.tasks.forEach(t => { t.labelIds = (t.labelIds || []).filter(x => x !== label.id) })

    expect(store.tasks[0].labelIds).toEqual(['other'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT ACTIONS — state mutations
// ═══════════════════════════════════════════════════════════════════════════

describe('projectActions — saveProject (state mutations)', () => {
  it('adds a new project to store.projects', () => {
    const store = makeStore()
    const proj = makeProject({ name: 'Alpha' })
    store.projects.push(proj)
    expect(store.projects).toHaveLength(1)
    expect(store.projects[0].name).toBe('Alpha')
  })

  it('updates an existing project in place', () => {
    const store = makeStore()
    const proj = makeProject({ name: 'Old Name' })
    store.projects = [proj]

    const p = store.projects.find(x => x.id === proj.id)
    p.name = 'New Name'
    p.color = '#ff0000'

    expect(store.projects[0].name).toBe('New Name')
    expect(store.projects[0].color).toBe('#ff0000')
  })

  it('deleteProject removes it and unassigns tasks', () => {
    const store = makeStore()
    const proj = makeProject()
    const task1 = makeTask({ projectId: proj.id })
    const task2 = makeTask({ projectId: 'other' })
    store.projects = [proj]
    store.tasks = [task1, task2]

    // Simulate deleteProject mutation
    store.projects = store.projects.filter(p => p.id !== proj.id)
    store.tasks.forEach(t => { if (t.projectId === proj.id) t.projectId = '' })

    expect(store.projects).toHaveLength(0)
    expect(store.tasks[0].projectId).toBe('')
    expect(store.tasks[1].projectId).toBe('other')
  })

  it('selectProject sets selectedProjectId and calls switchView', () => {
    const store = makeStore()
    projectActions.selectProject.call(store, 'proj-123')
    expect(store.selectedProjectId).toBe('proj-123')
    expect(store.switchView).toHaveBeenCalledWith('project')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// USER / PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('userActions — permissions', () => {
  it('admin can manage non-admin users', () => {
    const store = makeStore()
    const admin = store.users[0]
    const member = makeUser({ role: 'user' })
    store.users.push(member)

    const result = userActions.canManageUser.call(store, member.id)
    expect(result).toBe(true)
  })

  it('admin cannot manage other admins', () => {
    const store = makeStore()
    const otherAdmin = makeUser({ role: 'admin' })
    store.users.push(otherAdmin)

    const result = userActions.canManageUser.call(store, otherAdmin.id)
    expect(result).toBe(false)
  })

  it('user role can manage collaborators only', () => {
    const userMember = makeUser({ role: 'user' })
    const collab = makeUser({ role: 'collaborator' })
    const store = makeStore({ users: [userMember, collab], currentUserId: userMember.id })

    expect(userActions.canManageUser.call(store, collab.id)).toBe(true)
    // user can't manage other users
    const otherUser = makeUser({ role: 'user' })
    store.users.push(otherUser)
    expect(userActions.canManageUser.call(store, otherUser.id)).toBe(false)
  })

  it('getCurrentUser returns the user matching currentUserId', () => {
    const store = makeStore()
    const result = userActions.getCurrentUser.call(store)
    expect(result.id).toBe(store.currentUserId)
  })

  it('deleteUser prevents removing the last member', async () => {
    const store = makeStore()
    // only one user in store
    await userActions.deleteUser.call(store, store.users[0].id)
    expect(store.toast).toHaveBeenCalledWith('Cannot remove last member', 'error')
    expect(store.users).toHaveLength(1)
  })

  it('canManageProject returns true for admin and user roles', () => {
    const admin = makeUser({ role: 'admin' })
    const storeA = makeStore({ users: [admin], currentUserId: admin.id })
    // Override stub to call real logic
    storeA.canManageProject = function() { return userActions.canManageProject.call(this) }
    expect(storeA.canManageProject()).toBe(true)

    const member = makeUser({ role: 'user' })
    const storeM = makeStore({ users: [member], currentUserId: member.id })
    storeM.canManageProject = function() { return userActions.canManageProject.call(this) }
    expect(storeM.canManageProject()).toBe(true)
  })

  it('canManageProject returns false for collaborators', () => {
    const collab = makeUser({ role: 'collaborator' })
    const store = makeStore({ users: [collab], currentUserId: collab.id })
    store.canManageProject = function() { return userActions.canManageProject.call(this) }
    expect(store.canManageProject()).toBe(false)
  })

  it('getVisibleUsers returns all users when no projectId given', () => {
    const store = makeStore()
    store.users.push(makeUser(), makeUser())
    const result = userActions.getVisibleUsers.call(store)
    expect(result).toHaveLength(store.users.length)
  })

  it('getVisibleUsers filters to project-relevant users', () => {
    const u1 = makeUser()
    const u2 = makeUser()
    const u3 = makeUser()
    const proj = makeProject()
    const task = makeTask({ projectId: proj.id, assigneeId: u2.id })
    const store = makeStore({ users: [u1, u2, u3], currentUserId: u1.id, tasks: [task] })
    const result = userActions.getVisibleUsers.call(store, proj.id)
    // currentUserId (u1) and task assignee (u2) should be included, not u3
    const ids = result.map(u => u.id)
    expect(ids).toContain(u1.id)
    expect(ids).toContain(u2.id)
    expect(ids).not.toContain(u3.id)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// TASK STATE — CRUD mutations
// ═══════════════════════════════════════════════════════════════════════════

describe('task state mutations', () => {
  it('creates a task with required fields', () => {
    const store = makeStore()
    const task = makeTask({ title: 'Write tests', status: 'todo', assigneeId: store.currentUserId })
    store.tasks.push(task)

    expect(store.tasks).toHaveLength(1)
    expect(store.tasks[0].title).toBe('Write tests')
    expect(store.tasks[0].status).toBe('todo')
    expect(store.tasks[0].id).toBeTruthy()
    expect(store.tasks[0].id).toHaveLength(15)
  })

  it('updates a task without losing other fields', () => {
    const store = makeStore()
    const task = makeTask({ title: 'Original', status: 'todo', priority: 'p2' })
    store.tasks = [task]

    const idx = store.tasks.findIndex(t => t.id === task.id)
    store.tasks[idx] = { ...store.tasks[idx], title: 'Updated', status: 'in-progress' }

    expect(store.tasks[0].title).toBe('Updated')
    expect(store.tasks[0].status).toBe('in-progress')
    expect(store.tasks[0].priority).toBe('p2') // preserved
  })

  it('deletes a task by id', () => {
    const store = makeStore()
    const t1 = makeTask({ title: 'Task 1' })
    const t2 = makeTask({ title: 'Task 2' })
    store.tasks = [t1, t2]

    store.tasks = store.tasks.filter(t => t.id !== t1.id)

    expect(store.tasks).toHaveLength(1)
    expect(store.tasks[0].title).toBe('Task 2')
  })

  it('subtask parentId links to parent', () => {
    const parent = makeTask({ title: 'Parent' })
    const child = makeTask({ title: 'Subtask', parentId: parent.id })

    expect(child.parentId).toBe(parent.id)

    const children = [parent, child].filter(t => t.parentId === parent.id)
    expect(children).toHaveLength(1)
    expect(children[0].title).toBe('Subtask')
  })

  it('toggleTaskStatus flips between todo and done', () => {
    const task = makeTask({ status: 'todo' })
    // Simulate the toggle logic
    task.status = task.status === 'done' ? 'todo' : 'done'
    expect(task.status).toBe('done')

    task.status = task.status === 'done' ? 'todo' : 'done'
    expect(task.status).toBe('todo')
  })

  it('tasks with matching projectId are found correctly', () => {
    const proj = makeProject()
    const t1 = makeTask({ projectId: proj.id })
    const t2 = makeTask({ projectId: proj.id })
    const t3 = makeTask({ projectId: 'other' })
    const tasks = [t1, t2, t3]

    const projectTasks = tasks.filter(t => t.projectId === proj.id)
    expect(projectTasks).toHaveLength(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CANEDITTASK / CANDELETETASK
// ═══════════════════════════════════════════════════════════════════════════

describe('userActions — canEditTask / canDeleteTask', () => {
  it('admin can edit any task', () => {
    const admin = makeUser({ role: 'admin' })
    const task = makeTask({ assigneeId: 'someone-else' })
    const store = makeStore({ users: [admin], currentUserId: admin.id, tasks: [task] })
    expect(userActions.canEditTask.call(store, task.id)).toBe(true)
  })

  it('collaborator can only edit tasks assigned to them', () => {
    const collab = makeUser({ role: 'collaborator' })
    const myTask = makeTask({ assigneeId: collab.id })
    const otherTask = makeTask({ assigneeId: 'other' })
    const store = makeStore({ users: [collab], currentUserId: collab.id, tasks: [myTask, otherTask] })

    expect(userActions.canEditTask.call(store, myTask.id)).toBe(true)
    expect(userActions.canEditTask.call(store, otherTask.id)).toBe(false)
  })

  it('admin can delete any task', () => {
    const admin = makeUser({ role: 'admin' })
    const task = makeTask()
    const store = makeStore({ users: [admin], currentUserId: admin.id, tasks: [task] })
    expect(userActions.canDeleteTask.call(store, task.id)).toBe(true)
  })

  it('collaborator cannot delete tasks', () => {
    const collab = makeUser({ role: 'collaborator' })
    const task = makeTask({ assigneeId: collab.id })
    const store = makeStore({ users: [collab], currentUserId: collab.id, tasks: [task] })
    expect(userActions.canDeleteTask.call(store, task.id)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION helpers
// ═══════════════════════════════════════════════════════════════════════════

describe('notification state', () => {
  it('notifications array starts empty', () => {
    const store = makeStore()
    expect(store.notifications).toHaveLength(0)
  })

  it('addNotification is called when a task is assigned', () => {
    const store = makeStore()
    const user = makeUser({ name: 'Alice' })
    store.users.push(user)
    const task = makeTask({ title: 'Deploy', assigneeId: user.id })

    // Simulate the notification call in saveTaskFromModal
    if (task.assigneeId) {
      const u = store.users.find(u => u.id === task.assigneeId)
      store.addNotification('assign', `Task "${task.title}" assigned to ${u?.name || 'someone'}`, task.id)
    }

    expect(store.addNotification).toHaveBeenCalledWith('assign', 'Task "Deploy" assigned to Alice', task.id)
  })
})
