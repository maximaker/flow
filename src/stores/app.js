import { defineStore } from 'pinia'
import { pb } from '../pb.js'
import * as utils from '../utils.js'
import { authActions } from './actions/authActions.js'
import { syncActions } from './actions/syncActions.js'
import { labelActions } from './actions/labelActions.js'
import { projectActions } from './actions/projectActions.js'
import { userActions } from './actions/userActions.js'
import { taskActions } from './actions/taskActions.js'
import { renderActions } from './actions/renderActions.js'

export const useAppStore = defineStore('app', {
  state: () => ({

  // Data
  users: [], projects: [], tasks: [], notifications: [], labels: [],
  currentTaskId: null, editingProjectId: null, editingUserId: null,
  editingTaskId: null, draggedTaskId: null, timelineOffset: 0,
  currentView: 'home', selectedTasks: [], cmdSelectedIndex: 0, selectedProjectId: null, projectViewMode: 'list',
  appStarted: false,
  loginError: false,
  theme: 'light', draggedSubtaskId: null,
  currentUserId: null,
  boardColumns: [],
  collapsedTasks: [], // accordion state for tree view (persisted)
  expandedTasks: [], // explicitly expanded tasks (we track expanded since default=collapsed)
  // Feature: Undo
  undoStack: [],
  // Feature: Sort
  sortPref: 'status',
  // Feature: Templates
  templates: [],
  // Feature: Favicon badge
  _faviconOriginal: null,
  // Feature: Recently viewed tasks
  recentTasks: [],

  // Feature: Notification preferences
  notifPrefs: { deadlines: true, assignments: true, comments: true, email: false },

  // PocketBase sync state
  _pbSnapshot: {},
  _pbSyncTimer: null,
  _pbSubs: [],       // unsubscribe functions from real-time subscriptions
  _syncing: false,   // true while _syncToPb() is writing, prevents echo-handling own writes
  _changePwUserId: null,
  _settingsSection: 'users',

  // ===== INIT =====
  }),

  actions: {
  // ===== MODULE SPREADS =====
  ...authActions,
  ...syncActions,
  ...labelActions,
  ...projectActions,
  ...userActions,
  ...taskActions,
  ...renderActions,

  // ===== UTILITY DELEGATES (thin wrappers so this.xxx() keeps working) =====
  generateId: utils.generateId,
  esc:        utils.esc,
  safeColor:  utils.safeColor,
  initials:   utils.initials,
  relativeDate:      utils.relativeDate,
  formatDate:        utils.formatDate,
  formatDateShort:   utils.formatDateShort,
  formatDateAbsolute:utils.formatDateAbsolute,
  dueDateClass:      utils.dueDateClass,
  timeAgo:           utils.timeAgo,
  priorityBadge:     utils.priorityBadge,
  effortBadge:       utils.effortBadge,
  renderMarkdown:    utils.renderMarkdown,
  _appendActivity(task, text) { utils.appendActivity(task, text); },
  _setMultiSelect(id, values)  { utils.setMultiSelect(id, values); },

  showChangePassword(userId) {
    const targetUser = this.users.find(u => u.id === userId);
    if (!targetUser) return;
    const isSelf = userId === this.currentUserId;
    this._changePwUserId = userId;
    const overlay = document.getElementById('change-pw-modal-overlay');
    if (overlay) {
      document.getElementById('change-pw-modal-title').textContent = isSelf ? 'Change Your Password' : `Change Password — ${targetUser.name}`;
      document.getElementById('change-pw-old-group').style.display = isSelf ? '' : 'none';
      document.getElementById('change-pw-old').value = '';
      document.getElementById('change-pw-new').value = '';
      document.getElementById('change-pw-confirm').value = '';
      overlay.classList.add('show');
      setTimeout(() => document.getElementById('change-pw-new').focus(), 50);
    }
  },

  closeChangePwModal() {
    document.getElementById('change-pw-modal-overlay')?.classList.remove('show');
    this._changePwUserId = null;
  },

  async submitChangePassword() {
    const userId = this._changePwUserId;
    if (!userId) return;
    const isSelf = userId === this.currentUserId;
    const oldPw = isSelf ? document.getElementById('change-pw-old').value : null;
    const newPw = document.getElementById('change-pw-new').value;
    const confirm = document.getElementById('change-pw-confirm').value;
    if (!newPw || newPw.length < 8) { this.toast('Password must be at least 8 characters', 'error'); return; }
    if (newPw !== confirm) { this.toast('Passwords do not match', 'error'); return; }
    await this.changePassword(userId, newPw, oldPw);
    this.closeChangePwModal();
  },

  // ===== DARK MODE =====
  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    const icon = document.getElementById('theme-icon');
    if (icon) {
      icon.innerHTML = this.theme === 'dark'
        ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
  },

  toggleTheme() {
    // Smooth cross-fade between themes
    document.body.style.transition = 'background 0.5s ease, color 0.5s ease';
    document.querySelectorAll('.sidebar, .topbar, .content-area, .kanban-column, .task-card, .home-card, .slide-panel').forEach(el => {
      el.style.transition = 'background 0.5s ease, color 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease';
    });
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    this.save();
    this.toast(this.theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled');
    // Clean up transition overrides
    setTimeout(() => {
      document.body.style.transition = '';
      document.querySelectorAll('.sidebar, .topbar, .content-area, .kanban-column, .task-card, .home-card, .slide-panel').forEach(el => {
        el.style.transition = '';
      });
    }, 600);
  },

  // ===== EVENTS =====
  bindEvents() {
    document.querySelectorAll('.nav-item[data-view]').forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); this.switchView(el.dataset.view); });
    });
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
    });
    document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

    // Notification
    document.getElementById('notification-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('notification-dropdown').classList.toggle('show');
      this.renderNotifPrefs(); // sync toggle checked states from store
    });
    document.querySelectorAll('.notif-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('notif-in-app').classList.toggle('hidden', tab.dataset.tab !== 'in-app');
        document.getElementById('notif-settings').classList.toggle('hidden', tab.dataset.tab !== 'settings');
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.notification-wrapper')) document.getElementById('notification-dropdown').classList.remove('show');
    });

    document.getElementById('task-overlay').addEventListener('click', () => this.closeTaskPanel());

    // Color pickers
    document.querySelectorAll('.color-picker').forEach(picker => {
      picker.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          picker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
        });
      });
    });

    // Search & Filters
    document.getElementById('search-input').addEventListener('input', () => {
      if (this.currentView === 'my-tasks') this.renderMyTasks();
      if (this.currentView === 'board') this.renderBoard();
    });
    ['filter-project', 'filter-status', 'filter-priority', 'filter-label', 'filter-assignee'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => this.renderMyTasks());
    });
    document.getElementById('board-project-select').addEventListener('change', () => this.renderBoard());
    document.getElementById('timeline-project-select').addEventListener('change', () => this.renderTimeline());

    // Timeline nav
    document.getElementById('timeline-prev').addEventListener('click', () => { this.timelineOffset -= 7; this.renderTimeline(); });
    document.getElementById('timeline-next').addEventListener('click', () => { this.timelineOffset += 7; this.renderTimeline(); });
    document.getElementById('timeline-today').addEventListener('click', () => { this.timelineOffset = 0; this.renderTimeline(); });

    // Panel auto-save with debounce on text inputs
    const debouncedAutoSave = this.debounce(() => this.autoSavePanel(), 500);
    ['panel-title', 'panel-description'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', debouncedAutoSave);
    });
    // Immediate save on select changes (hidden selects)
    ['panel-assignee', 'panel-due', 'panel-project', 'panel-status', 'panel-priority', 'panel-effort', 'panel-blocked-by'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => this.autoSavePanel());
    });

    // QOL: Press Enter in panel title to blur (auto-save handles saving)
    document.getElementById('panel-title')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
    });

    // Quick add
    document.getElementById('quick-add-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { this.quickAdd(e.target.value); e.target.value = ''; }
    });

    // Sort select
    document.getElementById('sort-select')?.addEventListener('change', () => { this.sortPref = document.getElementById('sort-select').value; this.saveSortPref(); this.renderMyTasks(); });

    // Context menu close on click/escape
    document.addEventListener('click', (e) => { if (!e.target.closest('.context-menu')) this.hideContextMenu(); });
    document.addEventListener('contextmenu', (e) => {
      const taskItem = e.target.closest('.task-list-item[data-task-id]');
      const taskCard = e.target.closest('.task-card[data-id]');
      const projectItem = e.target.closest('.project-item');
      if (taskItem) { e.preventDefault(); this.showContextMenu(e, 'task', taskItem.dataset.taskId); }
      else if (taskCard) { e.preventDefault(); this.showContextMenu(e, 'task', taskCard.dataset.id); }
      else if (projectItem) {
        e.preventDefault();
        const pId = projectItem.dataset.projectId;
        if (pId) this.showContextMenu(e, 'project', pId);
      }
    });

    // Mentions in comment input
    const commentInput = document.getElementById('comment-input');
    if (commentInput) {
      commentInput.addEventListener('input', (e) => this.handleMentionInput(e));
      commentInput.addEventListener('keydown', (e) => this.handleMentionKeydown(e));
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl+K = command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); this.openCommandPalette(); return; }
      // Ctrl+Z = undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (!this.isInputFocused()) { e.preventDefault(); this.undo(); return; }
      }
      // Escape
      if (e.key === 'Escape') {
        this.hideContextMenu();
        this.hideMentions();
        if (document.getElementById('cmd-overlay').classList.contains('show')) { this.closeCommandPalette(); return; }
        if (document.getElementById('task-panel').classList.contains('open')) { this.closeTaskPanel(); return; }
        document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
        this.clearSelection();
      }
      // N = new task (when no input focused)
      if (e.key === 'n' && !this.isInputFocused()) { e.preventDefault(); this.showTaskModal(); }
      // B = board, T = timeline, H = home
      if (!this.isInputFocused()) {
        if (e.key === 'b') this.switchView('board');
        if (e.key === 'h') this.switchView('home');
        if (e.key === 't') this.switchView('timeline');
        if (e.key === 'l') this.switchView('my-tasks');
        if (e.key === 'd') this.toggleTheme();
      }
    });

    // Command palette input
    const cmdInput = document.getElementById('cmd-input');
    cmdInput.addEventListener('input', () => this.updateCommandResults());
    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.cmdNavigate(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); this.cmdNavigate(-1); }
      if (e.key === 'Enter') { e.preventDefault(); this.cmdSelect(); }
      if (e.key === 'Escape') { this.closeCommandPalette(); }
    });
    document.getElementById('cmd-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeCommandPalette();
    });
  },

  isInputFocused() {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
  },

  // ===== VIEWS =====
  switchView(view) {
    this.currentView = view;
    (this.selectedTasks = []);
    this.updateBulkBar();
    document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewMap = { home: 'view-home', 'my-tasks': 'view-my-tasks', board: 'view-board', timeline: 'view-timeline', analytics: 'view-analytics', workload: 'view-workload', project: 'view-project', settings: 'view-settings' };
    document.getElementById(viewMap[view])?.classList.add('active');
    const titles = { home: 'Home', 'my-tasks': 'My Tasks', board: 'Board', timeline: 'Timeline', analytics: 'Analytics', workload: 'Workload', project: 'Project', settings: 'Settings' };
    document.getElementById('page-title').textContent = titles[view];
    this.render();
  },

  render() {
    this.renderSidebar();
    this.renderNotifications();
    this.renderNavBadges();
    this.renderBreadcrumb();
    switch (this.currentView) {
      case 'home': this.renderHome(); break;
      case 'my-tasks': this.renderMyTasks(); break;
      case 'board': this.renderBoard(); break;
      case 'timeline': this.renderTimeline(); break;
      case 'analytics': this.renderAnalytics(); break;
      case 'workload': this.renderWorkload(); break;
      case 'project': this.renderProjectView(); break;
      case 'settings': this.renderSettings(); break;
    }
  },

  renderSidebar() {
    const pl = document.getElementById('project-list');
    pl.innerHTML = this.projects.map(p => `
      <div class="project-item" data-project-id="${p.id}" onclick="app.selectProject('${p.id}')">
        <span class="project-dot" style="background:${p.color}"></span>
        <span class="project-item-name">${this.esc(p.name)}</span>
        <span class="nav-badge" style="display:inline-flex">${this.tasks.filter(t => t.projectId === p.id && t.status !== 'done').length}</span>
        <div class="project-item-actions">
          <button class="btn-icon-sm" onclick="event.stopPropagation();app.editProject('${p.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon-sm" onclick="event.stopPropagation();app.deleteProject('${p.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
      </div>`).join('');

    const cu = this.getCurrentUser() || this.users[0];
    if (cu) document.getElementById('current-user').innerHTML = `<div class="team-avatar" style="background:${this.safeColor(cu.color)}">${this.initials(cu.name)}</div><div style="min-width:0"><div style="font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px">${this.esc(cu.name)} ${this.getRoleBadge(cu.role)}</div></div><button class="btn-icon-sm" onclick="app.logout()" title="Sign out" style="margin-left:auto"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>`;
    this.populateSelects();
  },

  populateSelects() {
    ['filter-project', 'board-project-select', 'timeline-project-select', 'modal-task-project', 'panel-project'].forEach(id => {
      const el = document.getElementById(id); if (!el) return;
      const val = el.value;
      const prefix = (id.includes('modal') || id.includes('panel')) ? '<option value="">No project</option>' : '<option value="">All Projects</option>';
      el.innerHTML = prefix + this.projects.map(p => `<option value="${p.id}">${this.esc(p.name)}</option>`).join('');
      el.value = val;
    });
    ['modal-task-assignee', 'panel-assignee'].forEach(id => {
      const el = document.getElementById(id); if (!el) return;
      const val = el.value;
      el.innerHTML = '<option value="">Unassigned</option>' + this.users.map(u => `<option value="${u.id}">${this.esc(u.name)}</option>`).join('');
      el.value = val;
    });
    // Blocked-by multi-select (preserve current selection after repopulating)
    const blockedEl = document.getElementById('panel-blocked-by');
    if (blockedEl) {
      const selectedIds = Array.from(blockedEl.selectedOptions).map(o => o.value);
      blockedEl.innerHTML = this.tasks.filter(t => t.id !== this.currentTaskId).map(t => `<option value="${t.id}">${this.esc(t.title)}</option>`).join('');
      this._setMultiSelect('panel-blocked-by', selectedIds);
    }
    // Label filter
    const labelFilter = document.getElementById('filter-label');
    if (labelFilter) {
      const val = labelFilter.value;
      labelFilter.innerHTML = '<option value="">All Labels</option>' + this.labels.map(l => `<option value="${l.id}">${this.esc(l.name)}</option>`).join('');
      labelFilter.value = val;
    }
    // Populate status selects from board columns
    this.populateStatusSelects();
  },


  // ===== DEPENDENCY HELPERS =====
  isBlocked(task) {
    if (!task.blockedBy?.length) return false;
    return task.blockedBy.some(id => {
      const blocker = this.tasks.find(t => t.id === id);
      return blocker && blocker.status !== 'done';
    });
  },

  getBlockedBy(task) {
    if (!task.blockedBy?.length) return [];
    return task.blockedBy.map(id => this.tasks.find(t => t.id === id)).filter(Boolean);
  },

  getBlocking(taskId) {
    return this.tasks.filter(t => t.blockedBy?.includes(taskId));
  },

  }
})
