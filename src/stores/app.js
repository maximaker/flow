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
import { tourActions } from './actions/tourActions.js'
import { convTaskActions } from './actions/convTaskActions.js'

export const useAppStore = defineStore('app', {
  state: () => ({

  // Data
  users: [], projects: [], tasks: [], notifications: [], labels: [],
  currentTaskId: null, editingProjectId: null, editingUserId: null,
  editingTaskId: null, draggedTaskId: null, timelineOffset: 0,
  currentView: 'home', selectedTasks: [], cmdSelectedIndex: 0, selectedProjectId: null, projectViewMode: 'list',
  appStarted: false,
  loginError: false,
  focusMode: false,  // ADHD focus: show only today's actionable tasks
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

  // Sync health — surfaced in the topbar indicator
  // 'idle' | 'syncing' | 'error' | 'offline'
  _syncStatus: 'idle',
  _syncError: null,

  // Feature: Onboarding tour
  tourActive: false,
  tourStep: 0,
  tourCompleted: false,

  // Feature: Conversational task creation
  convActive: false,
  convStep: 0,
  convAnswers: {},

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
  ...tourActions,
  ...convTaskActions,

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
  renderMarkdown:      utils.renderMarkdown,
  renderDescriptionMd: utils.renderDescriptionMd,
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
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchView(el.dataset.view);
        // Auto-close sidebar drawer on mobile after nav
        if (window.innerWidth < 768) this.closeSidebar();
      });
    });
    // Bottom nav items (mobile)
    document.querySelectorAll('.bottom-nav-item[data-view]').forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); this.switchView(el.dataset.view); });
    });
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      const isMobile = window.innerWidth < 768;
      const sidebar = document.getElementById('sidebar');
      if (isMobile) {
        const isOpen = sidebar.classList.contains('mobile-open');
        isOpen ? this.closeSidebar() : this.openSidebar();
      } else {
        sidebar.classList.toggle('collapsed');
      }
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

    // Quick add (topbar)
    document.getElementById('quick-add-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { this.quickAdd(e.target.value); e.target.value = ''; }
    });

    // Inline add-task row (My Tasks view)
    const inlineInput = document.getElementById('inline-add-input');
    if (inlineInput) {
      inlineInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const title = inlineInput.value.trim();
          if (title) {
            this.tasks.push({
              id: this.generateId(), title,
              description: '', status: this.boardColumns[0]?.id || 'todo',
              projectId: '', assigneeId: this.currentUserId || '',
              dueDate: '', priority: '', labelIds: [], blockedBy: [],
              order: this.tasks.length, parentId: '',
              attachments: [], comments: [],
              activityLog: [{ text: 'Task created', timestamp: new Date().toISOString() }],
              createdAt: new Date().toISOString().split('T')[0],
            });
            inlineInput.value = '';
            this.save(); this.renderMyTasks();
          }
        }
        if (e.key === 'Escape') { inlineInput.value = ''; inlineInput.blur(); }
      });
    }

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
        if (document.getElementById('conv-task-overlay')?.classList.contains('show')) { this.closeConvTask(); return; }
        if (document.getElementById('task-panel').classList.contains('open')) { this.closeTaskPanel(); return; }
        document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
        this.clearSelection();
      }
      // N = new task (when no input focused) — opens conversational flow
      if (e.key === 'n' && !this.isInputFocused()) { e.preventDefault(); this.openConvTask(); }
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

  openSidebar() {
    document.getElementById('sidebar')?.classList.add('mobile-open');
    document.getElementById('sidebar-backdrop')?.classList.add('show');
    document.body.classList.add('sidebar-open');
  },

  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-backdrop')?.classList.remove('show');
    document.body.classList.remove('sidebar-open');
  },

  toggleFocusMode() {
    this.focusMode = !this.focusMode;
    const btn = document.getElementById('focus-mode-btn');
    if (btn) btn.classList.toggle('active', this.focusMode);
    this.renderMyTasks();
    this.toast(this.focusMode ? 'Focus mode on — showing only what needs attention today' : 'Focus mode off — showing all tasks');
  },

  isInputFocused() {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
  },

  clearFilters() {
    const ids = ['search-input', 'filter-project', 'filter-status', 'filter-priority', 'filter-label', 'filter-assignee'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    this.renderMyTasks();
  },

  // ===== BULK SELECTION =====
  updateBulkBar() {
    const bar = document.getElementById('bulk-bar');
    const countEl = document.getElementById('bulk-count-num');
    if (!bar) return;
    const n = this.selectedTasks.length;
    bar.classList.toggle('show', n > 0);
    if (countEl) countEl.textContent = n;
  },

  toggleSelect(taskId) {
    if (this.selectedTasks.includes(taskId)) {
      this.selectedTasks = this.selectedTasks.filter(id => id !== taskId);
    } else {
      this.selectedTasks.push(taskId);
    }
    this.updateBulkBar();
    // Re-render to update checkbox state
    if (this.currentView === 'my-tasks') this.renderMyTasks();
    if (this.currentView === 'board') this.renderBoard();
  },

  clearSelection() {
    this.selectedTasks = [];
    this.updateBulkBar();
  },

  bulkMove(status) {
    if (!this.selectedTasks.length) return;
    const count = this.selectedTasks.length;
    this.selectedTasks.forEach(id => {
      const task = this.tasks.find(t => t.id === id);
      if (task) task.status = status;
    });
    this.save();
    this.clearSelection();
    this.render();
    this.toast(`Moved ${count} task${count !== 1 ? 's' : ''} to ${status.replace('-', ' ')}`);
  },

  bulkDelete() {
    if (!this.selectedTasks.length) return;
    const count = this.selectedTasks.length;
    this.tasks = this.tasks.filter(t => !this.selectedTasks.includes(t.id));
    this.save();
    this.clearSelection();
    this.render();
    this.toast(`Deleted ${count} task${count !== 1 ? 's' : ''}`);
  },

  showBulkAssign() {
    // Simple: assign all selected tasks to a picked user
    // For now, open the task modal on the first selected task as a fallback
    if (!this.selectedTasks.length) return;
    const userId = prompt('Enter user name to assign (quick assign):');
    if (!userId) return;
    const user = this.users.find(u => u.name.toLowerCase().includes(userId.toLowerCase()));
    if (!user) { this.toast('User not found', 'error'); return; }
    this.selectedTasks.forEach(id => {
      const task = this.tasks.find(t => t.id === id);
      if (task) task.assigneeId = user.id;
    });
    this.save();
    this.clearSelection();
    this.render();
    this.toast(`Assigned to ${user.name}`);
  },

  // ===== TOAST NOTIFICATIONS =====
  toast(msg, type = '') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; setTimeout(() => t.remove(), 400); }, 3000);
  },

  toastUndo(msg, undoFn) {
    const c = document.getElementById('undo-toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'undo-toast';
    t.innerHTML = `<span>${this.esc(msg)}</span><button class="undo-btn">Undo</button>`;
    t.querySelector('.undo-btn').addEventListener('click', () => { undoFn(); t.remove(); });
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; setTimeout(() => t.remove(), 400); }, 5000);
  },

  toastWithAction(msg, btnText, action) {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast toast-with-action';
    t.innerHTML = `<span>${this.esc(msg)}</span><button class="toast-action-btn">${this.esc(btnText)}</button>`;
    t.querySelector('.toast-action-btn').addEventListener('click', () => { action(); t.remove(); });
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; setTimeout(() => t.remove(), 400); }, 5000);
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
    const mobileTitle = document.getElementById('mobile-page-title');
    if (mobileTitle) mobileTitle.textContent = titles[view];
    // Sync bottom nav active states
    document.querySelectorAll('.bottom-nav-item[data-view]').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });
    this.render();
  },

  render() {
    try {
      this.renderSidebar();
      this.renderNotifications();
      this.renderNavBadges();
      this.renderBreadcrumb();
    } catch (e) {
      console.error('[Flow] Shell render error:', e);
    }
    try {
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
    } catch (e) {
      console.error('[Flow] View render error:', e);
      // Show an in-place error rather than a blank view
      const contentArea = document.querySelector('.content-area');
      if (contentArea) {
        contentArea.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-secondary)">
          <p style="font-size:18px;font-weight:500;margin-bottom:8px">Something went wrong displaying this view</p>
          <p style="font-size:14px;margin-bottom:20px">${e?.message || 'Unknown error'}</p>
          <button class="btn-primary" onclick="window.location.reload()">Reload</button>
        </div>`;
      }
    }
  },

  // ===== COMMAND PALETTE =====
  openCommandPalette() {
    const overlay = document.getElementById('cmd-overlay');
    if (!overlay) return;
    overlay.classList.add('show');
    const input = document.getElementById('cmd-input');
    if (input) { input.value = ''; input.focus(); }
    this.cmdSelectedIndex = 0;
    this.updateCommandResults();
  },

  closeCommandPalette() {
    document.getElementById('cmd-overlay')?.classList.remove('show');
  },

  updateCommandResults() {
    const q = (document.getElementById('cmd-input')?.value || '').toLowerCase();
    const actions = [
      { title: 'New Task',            desc: 'Create a new task',           action: () => { this.closeCommandPalette(); this.showTaskModal(); } },
      { title: 'Toggle Dark Mode',    desc: 'Switch between light and dark', action: () => { this.closeCommandPalette(); this.toggleTheme(); } },
      { title: 'Go to Board',         desc: 'Switch to board view',        action: () => { this.closeCommandPalette(); this.switchView('board'); } },
      { title: 'Go to Timeline',      desc: 'Switch to timeline view',     action: () => { this.closeCommandPalette(); this.switchView('timeline'); } },
      { title: 'Go to Analytics',     desc: 'View analytics',              action: () => { this.closeCommandPalette(); this.switchView('analytics'); } },
      { title: 'Go to Workload',      desc: 'View team workload',          action: () => { this.closeCommandPalette(); this.switchView('workload'); } },
      { title: 'Manage Labels',       desc: 'Add or remove labels',        action: () => { this.closeCommandPalette(); this.showLabelModal(); } },
      { title: 'New Project',         desc: 'Create a new project',        action: () => { this.closeCommandPalette(); this.showProjectModal(); } },
    ];
    const taskResults  = this.tasks.filter(t => !q || t.title.toLowerCase().includes(q)).slice(0,8).map(t => ({ title: t.title, desc: this.projects.find(p => p.id === t.projectId)?.name || '', type: 'task',    action: () => { this.closeCommandPalette(); this.openTask(t.id); } }));
    const projResults  = this.projects.filter(p => !q || p.name.toLowerCase().includes(q)).map(p => ({ title: p.name, desc: 'Project', type: 'project', action: () => { this.closeCommandPalette(); this.selectProject(p.id); } }));
    const userResults  = this.users.filter(u => !q || u.name.toLowerCase().includes(q)).map(u => ({ title: u.name, desc: u.role, type: 'user', action: () => this.closeCommandPalette() }));
    const actionResults = actions.filter(a => !q || a.title.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)).map(a => ({ ...a, type: 'action' }));
    const results = [...actionResults, ...taskResults, ...projResults, ...userResults].slice(0, 12);
    this._cmdResults = results;
    this.cmdSelectedIndex = Math.min(this.cmdSelectedIndex, Math.max(0, results.length - 1));
    const icons = { task: '<div class="cmd-item-icon task">T</div>', project: '<div class="cmd-item-icon project">P</div>', action: '<div class="cmd-item-icon action">&#9889;</div>', user: '<div class="cmd-item-icon user">U</div>' };
    const el = document.getElementById('cmd-results');
    if (el) el.innerHTML = results.length ? results.map((r, i) => `<div class="cmd-item ${i === this.cmdSelectedIndex ? 'active' : ''}" onmouseenter="app.cmdSelectedIndex=${i};app.highlightCmd()" onclick="app._cmdResults[${i}].action()">${icons[r.type]||icons.action}<div class="cmd-item-info"><div class="cmd-item-title">${this.esc(r.title)}</div>${r.desc ? `<div class="cmd-item-desc">${this.esc(r.desc)}</div>` : ''}</div></div>`).join('') : '<div class="empty-state" style="padding:30px"><p>No results</p></div>';
  },

  cmdNavigate(dir) {
    this.cmdSelectedIndex = Math.max(0, Math.min((this._cmdResults||[]).length - 1, this.cmdSelectedIndex + dir));
    this.highlightCmd();
  },

  highlightCmd() {
    document.querySelectorAll('.cmd-item').forEach((el, i) => el.classList.toggle('active', i === this.cmdSelectedIndex));
    document.querySelector('.cmd-item.active')?.scrollIntoView({ block: 'nearest' });
  },

  cmdSelect() {
    if (this._cmdResults?.[this.cmdSelectedIndex]) this._cmdResults[this.cmdSelectedIndex].action();
  },

  renderSidebar() {
    const pl = document.getElementById('project-list');
    pl.innerHTML = this.projects.length
      ? this.projects.map(p => `
      <div class="project-item" data-project-id="${p.id}" onclick="app.selectProject('${p.id}')">
        <span class="project-dot" style="background:${p.color}"></span>
        <span class="project-item-name">${this.esc(p.name)}</span>
        <span class="nav-badge" style="display:inline-flex">${this.tasks.filter(t => t.projectId === p.id && t.status !== 'done').length}</span>
        <div class="project-item-actions">
          <button class="btn-icon-sm" onclick="event.stopPropagation();app.editProject('${p.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon-sm" onclick="event.stopPropagation();app.deleteProject('${p.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
      </div>`).join('')
      : `<button class="sidebar-empty-projects" onclick="app.showProjectModal()">+ Create your first project</button>`;

    const cu = this.getCurrentUser() || this.users[0];
    if (cu) document.getElementById('current-user').innerHTML = `<div class="team-avatar" style="background:${this.safeColor(cu.color)}">${this.initials(cu.name)}</div><div style="min-width:0"><div style="font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px">${this.esc(cu.name)} ${this.getRoleBadge(cu.role)}</div></div><button class="btn-icon-sm" onclick="app.logout()" title="Sign out" style="margin-left:auto"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>`;
    this.populateSelects();
  },

  populateStatusSelects() {
    ['panel-status', 'modal-task-status', 'filter-status'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const val = el.value;
      const isFilter = id === 'filter-status';
      el.innerHTML = (isFilter ? '<option value="">All Status</option>' : '') +
        this.boardColumns.map(c => `<option value="${c.id}">${this.esc(c.name)}</option>`).join('');
      el.value = val;
    });
  },

  populatePanelStatusFromColumns() {
    const el = document.getElementById('panel-status');
    if (!el) return;
    const val = el.value;
    el.innerHTML = this.boardColumns.map(c => `<option value="${c.id}">${this.esc(c.name)}</option>`).join('');
    el.value = val;
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


  // ===== BULK IMPORT =====
  showBulkImport() {
    const sel = document.getElementById('bulk-import-project');
    if (!sel) return;
    sel.innerHTML = '<option value="">No project</option>' + this.projects.map(p => `<option value="${p.id}">${this.esc(p.name)}</option>`).join('');
    if (this.projects.length === 1) sel.value = this.projects[0].id;
    const textEl = document.getElementById('bulk-import-text');
    if (textEl) textEl.value = '';
    document.getElementById('bulk-import-overlay')?.classList.add('show');
    setTimeout(() => document.getElementById('bulk-import-text')?.focus(), 100);
  },

  closeBulkImport() {
    document.getElementById('bulk-import-overlay')?.classList.remove('show');
  },

  executeBulkImport() {
    const textEl = document.getElementById('bulk-import-text');
    const projectEl = document.getElementById('bulk-import-project');
    const text = textEl?.value || '';
    const projectId = projectEl?.value || '';
    if (!text.trim()) { this.toast('Paste some tasks first', 'error'); return; }

    const lines = text.split('\n').filter(l => l.trim());
    if (!lines.length) { this.toast('No tasks found', 'error'); return; }

    // Parse indentation to determine nesting level
    const parsed = lines.map(line => {
      const expanded = line.replace(/\t/g, '  ');
      const leadingSpaces = expanded.match(/^(\s*)/)[1].length;
      let title = expanded.trim()
        .replace(/^[-*+]\s+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .replace(/^\[[ x]\]\s*/i, '')
        .trim();
      if (!title) return null;
      return { title, indent: Math.floor(leadingSpaces / 2) };
    }).filter(Boolean);

    if (!parsed.length) { this.toast('No valid tasks found', 'error'); return; }

    // Normalize: first item at level 0, cap at 4 levels
    const minIndent = Math.min(...parsed.map(p => p.indent));
    parsed.forEach(p => p.indent = Math.min(p.indent - minIndent, 4));

    // Build tree by tracking parent stack
    const parentStack = [];
    let created = 0;

    parsed.forEach(item => {
      while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= item.indent) {
        parentStack.pop();
      }
      const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].id : '';
      const siblings = this.tasks.filter(t => (t.parentId || '') === parentId);

      const task = {
        id: this.generateId(),
        title: item.title, description: '', status: this.boardColumns[0]?.id || 'todo',
        projectId, assigneeId: '', dueDate: '', priority: '',
        labelIds: [], blockedBy: [], order: siblings.length,
        parentId, attachments: [], comments: [],
        activityLog: [{ text: 'Created via bulk import', timestamp: new Date().toISOString() }],
        createdAt: new Date().toISOString().split('T')[0],
      };

      this.tasks.push(task);
      parentStack.push({ id: task.id, level: item.indent });
      created++;
    });

    this.save();
    this.closeBulkImport();
    this.render();
    this.toast(`Imported ${created} task${created !== 1 ? 's' : ''}`);
  },

  // ===== BOARD COLUMN MANAGEMENT =====
  saveBoardColumns() {
    localStorage.setItem('fb_board_columns', JSON.stringify(this.boardColumns));
    this._syncSettings();
  },

  showColumnManager() {
    const overlay = document.getElementById('column-manager-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.classList.add('show');
    this.renderColumnManager();
  },

  closeColumnManager() {
    const overlay = document.getElementById('column-manager-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.classList.remove('show');
  },

  renderColumnManager() {
    const body = document.getElementById('column-manager-body');
    if (!body) return;
    body.innerHTML = this.boardColumns.map((col, i) => `
      <div class="column-manager-item" data-col-id="${col.id}">
        <input type="text" value="${this.esc(col.name)}" onchange="app.renameBoardColumn('${col.id}', this.value)">
        <div class="column-manager-actions">
          ${i > 0 ? `<button onclick="app.moveBoardColumn('${col.id}', -1)" title="Move up">&#9650;</button>` : '<button disabled style="opacity:0.3">&#9650;</button>'}
          ${i < this.boardColumns.length - 1 ? `<button onclick="app.moveBoardColumn('${col.id}', 1)" title="Move down">&#9660;</button>` : '<button disabled style="opacity:0.3">&#9660;</button>'}
          <button class="danger" onclick="app.removeBoardColumn('${col.id}')" title="Delete column">&times;</button>
        </div>
      </div>`).join('');
  },

  addBoardColumn() {
    const name = prompt('Column name:');
    if (!name || !name.trim()) return;
    const id = this.generateId();
    this.boardColumns.push({ id, name: name.trim() });
    this.saveBoardColumns();
    this.renderColumnManager();
    this.renderBoard();
    this.populateStatusSelects();
  },

  async removeBoardColumn(id) {
    if (this.boardColumns.length <= 1) { this.toast('Cannot remove last column', 'error'); return; }
    const tasksInCol = this.tasks.filter(t => t.status === id);
    if (tasksInCol.length > 0) {
      if (!await this.confirm(`${tasksInCol.length} task(s) use this status. Move them to the first column?`, 'Remove column', 'Move & remove')) return;
      const firstCol = this.boardColumns.find(c => c.id !== id);
      tasksInCol.forEach(t => t.status = firstCol.id);
      this.save();
    }
    this.boardColumns = this.boardColumns.filter(c => c.id !== id);
    this.saveBoardColumns();
    this.renderColumnManager();
    this.renderBoard();
    this.populateStatusSelects();
  },

  renameBoardColumn(id, name) {
    const col = this.boardColumns.find(c => c.id === id);
    if (col && name.trim()) {
      col.name = name.trim();
      this.saveBoardColumns();
      this.renderBoard();
      this.populateStatusSelects();
    }
  },

  moveBoardColumn(id, direction) {
    const idx = this.boardColumns.findIndex(c => c.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= this.boardColumns.length) return;
    const temp = this.boardColumns[idx];
    this.boardColumns[idx] = this.boardColumns[newIdx];
    this.boardColumns[newIdx] = temp;
    this.saveBoardColumns();
    this.renderColumnManager();
    this.renderBoard();
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
