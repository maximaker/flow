import { defineStore } from 'pinia'
import { pb } from '../pb.js'
import * as utils from '../utils.js'
import { authActions } from './actions/authActions.js'
import { syncActions } from './actions/syncActions.js'

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

  // ===== LABEL HELPERS =====
  renderLabelPicker(containerId, selectedIds) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = this.labels.map(l => {
      const sel = selectedIds.includes(l.id);
      return `<span class="label-chip ${sel ? 'selected' : ''}" style="background:${this.safeColor(l.color)}20;color:${this.safeColor(l.color)}" onclick="app.toggleLabelInPicker('${containerId}','${l.id}')" data-id="${l.id}">${this.esc(l.name)}</span>`;
    }).join('') + `<button class="add-label-btn" onclick="app.showLabelModal()">+ Manage</button>`;
  },

  toggleLabelInPicker(containerId, labelId) {
    const chip = document.querySelector(`#${containerId} [data-id="${labelId}"]`);
    if (chip) chip.classList.toggle('selected');
    // Sync visible labels to hidden labels and vice versa
    if (containerId === 'panel-labels-visible') {
      const hiddenChip = document.querySelector(`#panel-labels [data-id="${labelId}"]`);
      if (hiddenChip) hiddenChip.classList.toggle('selected', chip?.classList.contains('selected'));
      this.autoSavePanel();
    } else if (containerId === 'panel-labels') {
      const visibleChip = document.querySelector(`#panel-labels-visible [data-id="${labelId}"]`);
      if (visibleChip) visibleChip.classList.toggle('selected', chip?.classList.contains('selected'));
    }
  },

  getSelectedLabels(containerId) {
    return Array.from(document.querySelectorAll(`#${containerId} .label-chip.selected`)).map(c => c.dataset.id);
  },

  renderLabelTags(labelIds) {
    return (labelIds || []).map(id => {
      const l = this.labels.find(x => x.id === id);
      return l ? `<span class="label-tag" style="background:${this.safeColor(l.color)}20;color:${this.safeColor(l.color)}">${this.esc(l.name)}</span>` : '';
    }).join('');
  },

  showLabelModal() {
    document.getElementById('label-modal-overlay').classList.add('show');
    this.renderLabelList();
  },
  closeLabelModal() { document.getElementById('label-modal-overlay').classList.remove('show'); },

  renderLabelList() {
    document.getElementById('label-list-manage').innerHTML = this.labels.map(l => `
      <div class="label-manage-item">
        <span class="label-tag" style="background:${this.safeColor(l.color)}20;color:${this.safeColor(l.color)}">${this.esc(l.name)}</span>
        <button onclick="app.deleteLabel('${l.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>`).join('');
  },

  createLabel() {
    const name = document.getElementById('new-label-name').value.trim();
    if (!name) return;
    const color = document.querySelector('#label-color-picker .color-swatch.active')?.dataset.color || '#7a7a7a';
    this.labels.push({ id: this.generateId(), name, color });
    document.getElementById('new-label-name').value = '';
    this.save(); this.renderLabelList(); this.render();
  },

  deleteLabel(id) {
    this.labels = this.labels.filter(l => l.id !== id);
    this.tasks.forEach(t => { t.labelIds = (t.labelIds || []).filter(x => x !== id); });
    this.save(); this.renderLabelList(); this.render();
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

  // ===== HOME =====
  renderHome() {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    document.getElementById('greeting-time').textContent = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const curUser = this.getCurrentUser();
    document.getElementById('greeting-name').textContent = curUser?.name?.split(' ')[0] || 'User';

    // Contextual subtitle
    const myPending = this.tasks.filter(t => t.assigneeId === this.currentUserId && t.status !== 'done');
    const dueThisWeek = myPending.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate + 'T00:00:00');
      const td = new Date(); td.setHours(0,0,0,0);
      const endOfWeek = new Date(td); endOfWeek.setDate(endOfWeek.getDate() + (5 - endOfWeek.getDay()));
      return d >= td && d <= endOfWeek;
    }).length;

    let subtitle = "Here's what's happening with your projects today.";
    if (dayOfWeek === 1) subtitle = `Fresh start to the week \u2014 you have ${dueThisWeek} task${dueThisWeek!==1?'s':''} due before Friday.`;
    else if (dayOfWeek === 5) subtitle = dueThisWeek > 0 ? `It's Friday \u2014 ${dueThisWeek} task${dueThisWeek!==1?'s':''} to wrap up this week!` : "It's Friday \u2014 you're all caught up for the week!";
    else if (dayOfWeek === 0 || dayOfWeek === 6) subtitle = "Taking a peek on the weekend? Here's where things stand.";
    else subtitle = myPending.length > 0 ? `You have ${myPending.length} open task${myPending.length!==1?'s':''}. Here's what needs your attention.` : "You're all caught up \u2014 enjoy the moment!";
    const subtitleEl = document.querySelector('.welcome-card .subtitle');
    if (subtitleEl) subtitleEl.textContent = subtitle;

    // Today's Focus + This Week's Focus
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date(); todayDate.setHours(0,0,0,0);
    const myUrgent = this.tasks.filter(t =>
      t.assigneeId === this.currentUserId &&
      t.status !== 'done' &&
      (t.dueDate === today || (t.dueDate && t.dueDate < today) || t.status === 'in-progress')
    );

    // This week: tasks due between today and end of week (Sunday), plus overdue
    const endOfWeek = new Date(todayDate);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    const myWeek = this.tasks.filter(t =>
      t.assigneeId === this.currentUserId &&
      t.status !== 'done' &&
      t.dueDate
    ).sort((a,b) => a.dueDate.localeCompare(b.dueDate));

    const weekOverdue = myWeek.filter(t => t.dueDate < today);
    const weekToday = myWeek.filter(t => t.dueDate === today);
    const weekUpcoming = myWeek.filter(t => {
      const d = new Date(t.dueDate + 'T00:00:00');
      return d > todayDate && d <= endOfWeek;
    });
    const weekLater = myWeek.filter(t => {
      const d = new Date(t.dueDate + 'T00:00:00');
      return d > endOfWeek;
    });

    const focusEl = document.getElementById('today-focus');
    const focusListEl = document.getElementById('today-focus-list');
    const weekListEl = document.getElementById('week-focus-list');

    const renderFocusItem = (t) => {
      const dueLine = t.dueDate ? (t.dueDate < today ? 'Overdue' : t.dueDate === today ? 'Due today' : this.formatDate(t.dueDate)) : '';
      const dueClass = t.dueDate ? this.dueDateClass(t.dueDate) : '';
      return `<div class="today-focus-item" onclick="app.openTask('${t.id}')">
        <div class="task-check ${t.status==='done'?'done':''}" onclick="event.stopPropagation();app.toggleTaskStatus('${t.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <span class="today-focus-name">${this.esc(t.title)}</span>
        ${dueLine ? `<span class="task-list-due ${dueClass}">${dueLine}</span>` : ''}
        ${this.priorityBadge(t.priority)}
        ${this.effortBadge(t.effort)}
      </div>`;
    };

    const hasAnyFocus = myUrgent.length > 0 || myWeek.length > 0;
    if (hasAnyFocus) {
      focusEl.classList.remove('hidden');
      // Today tab
      focusListEl.innerHTML = myUrgent.length
        ? myUrgent.map(renderFocusItem).join('')
        : '<div class="today-focus-empty" style="padding:8px;color:var(--text-light);font-size:13px">Nothing pressing today — you\'re in good shape!</div>';
      // Week tab
      let weekHtml = '';
      if (weekOverdue.length) {
        weekHtml += '<div class="week-section-label">Overdue</div>' + weekOverdue.map(renderFocusItem).join('');
      }
      if (weekToday.length) {
        weekHtml += '<div class="week-section-label">Today</div>' + weekToday.map(renderFocusItem).join('');
      }
      if (weekUpcoming.length) {
        weekHtml += '<div class="week-section-label">This week</div>' + weekUpcoming.map(renderFocusItem).join('');
      }
      if (weekLater.length) {
        weekHtml += '<div class="week-section-label">Later</div>' + weekLater.map(renderFocusItem).join('');
      }
      weekListEl.innerHTML = weekHtml || '<div class="today-focus-empty" style="padding:8px;color:var(--text-light);font-size:13px">No tasks with due dates this week.</div>';
    } else {
      focusEl.classList.add('hidden');
    }

    const total = this.tasks.length, done = this.tasks.filter(t => t.status === 'done').length;
    const inProg = this.tasks.filter(t => t.status === 'in-progress').length;
    const overdue = this.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
    document.getElementById('home-stats').innerHTML = `
      <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Total Tasks</div></div>
      <div class="stat-card"><div class="stat-value">${inProg}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card"><div class="stat-value">${done}</div><div class="stat-label">Completed</div></div>
      <div class="stat-card"><div class="stat-value">${overdue}</div><div class="stat-label">Overdue</div></div>`;

    const upcoming = this.tasks.filter(t => t.dueDate && t.status !== 'done').sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0,5);
    document.getElementById('upcoming-deadlines').innerHTML = upcoming.length ? upcoming.map(t => {
      const proj = this.projects.find(p => p.id === t.projectId);
      return `<div class="upcoming-item" onclick="app.openTask('${t.id}')">
        <span class="upcoming-dot" style="background:${proj?.color || '#94a3b8'}"></span>
        <div class="upcoming-info"><p>${this.esc(t.title)}</p><small>${proj?.name || 'No project'}</small></div>
        <span class="upcoming-date ${this.dueDateClass(t.dueDate)}" title="${this.formatDateAbsolute(t.dueDate)}">${this.formatDate(t.dueDate)}</span>
      </div>`;
    }).join('') : '<div class="empty-state-rich" style="padding:24px"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14l2 2 4-4"/></svg><p>All caught up!</p><p class="empty-state-sub">No upcoming deadlines</p></div>';

    const recentComments = [];
    this.tasks.forEach(t => (t.comments||[]).forEach(c => { const u = this.users.find(x => x.id === c.userId); recentComments.push({task:t,comment:c,user:u}); }));
    recentComments.sort((a,b) => new Date(b.comment.timestamp) - new Date(a.comment.timestamp));
    document.getElementById('recent-activity').innerHTML = recentComments.length ? recentComments.slice(0,5).map(r => `
      <div class="activity-item"><div class="activity-dot"></div><div class="activity-text"><strong>${this.esc(r.user?.name||'Unknown')}</strong> commented on <strong>${this.esc(r.task.title)}</strong><span class="time">${this.timeAgo(r.comment.timestamp)}</span></div></div>
    `).join('') : '<div class="empty-state"><p>No recent activity</p></div>';

    const myTasks = this.tasks.filter(t => t.assigneeId === this.currentUserId && this.isRootTask(t)).slice(0,6);
    document.getElementById('my-tasks-overview').innerHTML = myTasks.length ? myTasks.map(t => `
      <div class="task-overview-item">
        <div class="task-overview-check ${t.status==='done'?'done':''}" onclick="app.toggleTaskStatus('${t.id}')"></div>
        <span class="task-overview-name ${t.status==='done'?'completed':''}">${this.esc(t.title)}</span>
        ${this.priorityBadge(t.priority)}
      </div>`).join('') : '<div class="empty-state"><p>No tasks assigned</p></div>';

    // Recently Viewed section
    let recentContainer = document.getElementById('recent-viewed-card');
    if (this.recentTasks && this.recentTasks.length) {
      const recentHtml = this.recentTasks.map(id => {
        const t = this.tasks.find(x => x.id === id);
        if (!t) return '';
        return `<div class="recent-task-item" onclick="app.openTask('${t.id}')">
          <div class="task-check ${t.status==='done'?'done':''}" style="pointer-events:none"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <span class="${t.status==='done'?'completed':''}">${this.esc(t.title)}</span>
        </div>`;
      }).filter(Boolean).join('');
      if (!recentContainer) {
        recentContainer = document.createElement('div');
        recentContainer.id = 'recent-viewed-card';
        recentContainer.className = 'home-card';
        document.querySelector('.home-grid')?.appendChild(recentContainer);
      }
      recentContainer.innerHTML = `<h3>Recently Viewed</h3><div class="recent-tasks-list">${recentHtml}</div>`;
    } else if (recentContainer) {
      recentContainer.remove();
    }
  },

  // ===== MY TASKS =====
  renderMyTasks() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const fProj = document.getElementById('filter-project').value;
    const fStatus = document.getElementById('filter-status').value;
    const fPriority = document.getElementById('filter-priority').value;
    const fLabel = document.getElementById('filter-label').value;
    const fAssignee = document.getElementById('filter-assignee').value;

    // Filter function for individual tasks
    const matchesFilter = (t) => {
      if (search && !t.title.toLowerCase().includes(search)) return false;
      if (fProj && t.projectId !== fProj) return false;
      if (fStatus && t.status !== fStatus) return false;
      if (fPriority && t.priority !== fPriority) return false;
      if (fLabel && !(t.labelIds||[]).includes(fLabel)) return false;
      if (fAssignee === 'me' && t.assigneeId !== this.currentUserId) return false;
      return true;
    };

    // Check if a task or any descendant matches filters
    const taskOrDescendantMatches = (t) => {
      if (matchesFilter(t)) return true;
      return this.getChildren(t.id).some(c => taskOrDescendantMatches(c));
    };

    // Check if a task or any ancestor matches filters
    const taskOrAncestorMatches = (t) => {
      if (matchesFilter(t)) return true;
      if (t.parentId) {
        const parent = this.tasks.find(p => p.id === t.parentId);
        if (parent && taskOrAncestorMatches(parent)) return true;
      }
      return false;
    };

    // Get root tasks that should be visible
    let rootTasks = this.tasks.filter(t => this.isRootTask(t) && taskOrDescendantMatches(t));
    // Apply sort preference
    const sortPref = this.sortPref || 'status';
    if (sortPref === 'status') rootTasks.sort((a,b) => { const o = {'in-progress':0,todo:1,done:2}; return (o[a.status]??1) - (o[b.status]??1); });
    else if (sortPref === 'due') rootTasks.sort((a,b) => { if (!a.dueDate && !b.dueDate) return 0; if (!a.dueDate) return 1; if (!b.dueDate) return -1; return a.dueDate.localeCompare(b.dueDate); });
    else if (sortPref === 'priority') rootTasks.sort((a,b) => { const o = {p0:0,p1:1,p2:2,p3:3,'':4}; return (o[a.priority]??4) - (o[b.priority]??4); });
    else if (sortPref === 'alpha') rootTasks.sort((a,b) => a.title.localeCompare(b.title));
    else if (sortPref === 'created') rootTasks.sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));

    // Render tree recursively
    const renderTaskRow = (t, level, parentTask) => {
      const assignee = this.users.find(u => u.id === t.assigneeId);
      const proj = this.projects.find(p => p.id === t.projectId);
      const si = this.getSubtaskInfo(t);
      const ac = (t.attachments||[]).length;
      const sel = this.selectedTasks.includes(t.id);
      const blocked = this.isBlocked(t);
      const children = this.getChildren(t.id);
      const hasChildren = children.length > 0;
      const isCollapsed = !this.expandedTasks.includes(t.id);
      const indent = level * 24 + 12;

      // For subtasks (level > 0), hide meta that matches parent
      const showPriority = level > 0 && parentTask ? (t.priority && t.priority !== parentTask.priority) : !!t.priority;
      const showProject = level > 0 && parentTask ? (proj && t.projectId !== parentTask.projectId) : !!proj;
      const showEffort = !!(t.effort);
      const filteredLabelIds = level > 0 && parentTask ? (t.labelIds||[]).filter(lid => !(parentTask.labelIds||[]).includes(lid)) : (t.labelIds||[]);

      const hasMeta = showPriority || showProject || t.dueDate || blocked || filteredLabelIds.length || showEffort;

      let html = `<div class="task-list-item ${sel?'selected':''}" data-task-id="${t.id}" data-level="${level}" draggable="true"
        ondragstart="app.onListDragStart(event,'${t.id}')" ondragend="app.onListDragEnd(event)"
        ondragover="app.onListDragOver(event,'${t.id}',${level})" ondragleave="app.onListDragLeave(event)"
        ondrop="app.onListDrop(event,'${t.id}',${level})"
        onclick="app.openTask('${t.id}')">
        <div class="task-list-row" style="padding-left:${indent}px">
          ${hasChildren ? `<button class="task-tree-toggle ${isCollapsed?'collapsed':''}" title="Expand/Collapse subtasks" onclick="event.stopPropagation();app.toggleTreeCollapse('${t.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>` : '<span class="task-tree-spacer"></span>'}
          <div class="task-list-info-wrap">
            <div class="task-select-check ${sel?'checked':''}" onclick="event.stopPropagation();app.toggleSelect('${t.id}')"></div>
            <div class="task-check ${t.status==='done'?'done':''}" onclick="event.stopPropagation();app.toggleTaskStatus('${t.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="task-list-info">
              <span class="task-list-name ${t.status==='done'?'completed':''}" ondblclick="event.stopPropagation();app.startInlineEdit(event,'${t.id}')">${this.esc(t.title)}</span>
            </div>
          </div>
          <div class="task-list-right">
            ${si.total>0 ? `<span class="task-subtask-badge" title="${si.done} of ${si.total} subtasks completed">${si.done}/${si.total}</span>` : ''}
            ${ac>0 ? '<span class="task-attachment-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span>' : ''}
            ${assignee ? `<div class="task-avatar-sm" style="background:${this.safeColor(assignee.color)}" title="${this.esc(assignee.name)}">${this.initials(assignee.name)}</div>` : ''}
          </div>
        </div>
        ${hasMeta ? `<div class="task-list-meta" style="padding-left:${indent + 20 + 16 + 18 + 24}px">
            ${showPriority ? this.priorityBadge(t.priority) : ''}
            ${showProject && proj ? `<span class="task-list-project" style="background:${this.safeColor(proj.color)}20;color:${this.safeColor(proj.color)}">${this.esc(proj.name)}</span>` : ''}
            ${t.dueDate ? `<span class="task-list-due ${this.dueDateClass(t.dueDate)}" title="${this.formatDateAbsolute(t.dueDate)}">${this.formatDate(t.dueDate)}</span>` : ''}
            ${t.dueDate && this.dueDateClass(t.dueDate) === 'overdue' && t.status !== 'done' ? `<button class="rescue-btn" onclick="event.stopPropagation();app.rescueTask('${t.id}')" title="Reschedule to today">\u2192 Today</button>` : ''}
            ${blocked ? '<span class="blocked-indicator">Blocked</span>' : ''}
            ${showEffort ? this.effortBadge(t.effort) : ''}
            ${this.renderLabelTags(filteredLabelIds)}
          </div>` : ''}
      </div>`;

      // Render children if not collapsed
      if (hasChildren && !isCollapsed) {
        children.filter(c => taskOrAncestorMatches(c) || matchesFilter(t)).forEach(c => {
          html += renderTaskRow(c, level + 1, t);
        });
      }
      return html;
    };

    document.getElementById('my-tasks-list').innerHTML = rootTasks.length
      ? rootTasks.map(t => renderTaskRow(t, 0)).join('')
      : `<div class="empty-state-rich">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
          <p>Your task list is clear — nice work!</p>
          <p class="empty-state-sub">Ready to plan something new?</p>
          <button class="btn-primary" onclick="app.showTaskModal()">Create your first task</button>
        </div>`;

    this.updateBulkBar();
  },

  toggleTreeCollapse(taskId) {
    // Default is collapsed, so we track expanded tasks
    if (this.expandedTasks.includes(taskId)) (this.expandedTasks = this.expandedTasks.filter(_i=>_i!==(taskId)));
    else (this.expandedTasks.includes(taskId)||this.expandedTasks.push(taskId));
    this.saveTreeState();
    if (this.currentView === 'project') this.renderProjectView();
    else this.renderMyTasks();
  },

  loadTreeState() {
    try {
      const saved = JSON.parse(localStorage.getItem('fb_expanded_tasks') || '[]');
      this.expandedTasks = Array.isArray(saved) ? saved : [];
    } catch { this.expandedTasks = []; }
  },

  saveTreeState() {
    localStorage.setItem('fb_expanded_tasks', JSON.stringify(this.expandedTasks));
  },

  // ===== LIST DRAG & DROP (reparenting across tree) =====
  draggedListTaskId: null,

  onListDragStart(e, taskId) {
    this.draggedListTaskId = taskId;
    e.target.classList.add('dragging-row');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  },

  onListDragEnd(e) {
    this.draggedListTaskId = null;
    e.target.classList.remove('dragging-row');
    document.querySelectorAll('.task-list-item').forEach(el => {
      el.classList.remove('drag-over-above', 'drag-over-below', 'drag-over-nest');
    });
  },

  onListDragOver(e, targetId, targetLevel) {
    e.preventDefault();
    e.stopPropagation();
    if (targetId === this.draggedListTaskId) return;
    // Don't allow dropping onto own descendant
    const dragged = this.tasks.find(t => t.id === this.draggedListTaskId);
    if (!dragged) return;
    const descendants = this.getAllDescendants(dragged.id);
    if (descendants.some(d => d.id === targetId)) return;

    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;

    el.classList.remove('drag-over-above', 'drag-over-below', 'drag-over-nest');
    if (y < h * 0.25) {
      el.classList.add('drag-over-above'); // drop as sibling above
    } else if (y > h * 0.75) {
      el.classList.add('drag-over-below'); // drop as sibling below
    } else {
      el.classList.add('drag-over-nest'); // drop as child of target
    }
  },

  onListDragLeave(e) {
    e.currentTarget.classList.remove('drag-over-above', 'drag-over-below', 'drag-over-nest');
  },

  onListDrop(e, targetId, targetLevel) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.draggedListTaskId || this.draggedListTaskId === targetId) return;

    const dragged = this.tasks.find(t => t.id === this.draggedListTaskId);
    const target = this.tasks.find(t => t.id === targetId);
    if (!dragged || !target) return;

    // Don't allow dropping onto own descendant
    const descendants = this.getAllDescendants(dragged.id);
    if (descendants.some(d => d.id === targetId)) return;

    const el = e.currentTarget;
    const isAbove = el.classList.contains('drag-over-above');
    const isBelow = el.classList.contains('drag-over-below');
    const isNest = el.classList.contains('drag-over-nest');

    el.classList.remove('drag-over-above', 'drag-over-below', 'drag-over-nest');

    if (isNest) {
      // Reparent: make dragged a child of target
      const newDepth = this.getTaskDepth(target) + 1;
      if (newDepth >= 5) { this.toast('Maximum nesting depth reached', 'error'); return; }
      dragged.parentId = target.id;
      dragged.order = this.getChildren(target.id).length;
      // Expand the target so user can see the dropped item
      (this.expandedTasks.includes(target.id)||this.expandedTasks.push(target.id));
    } else if (isAbove || isBelow) {
      // Move as sibling (same parent as target)
      dragged.parentId = target.parentId || '';
      // Reorder among siblings
      const siblings = this.tasks
        .filter(t => (t.parentId || '') === (target.parentId || '') && t.id !== dragged.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const targetIdx = siblings.indexOf(target);
      const insertIdx = isBelow ? targetIdx + 1 : targetIdx;
      siblings.splice(insertIdx, 0, dragged);
      siblings.forEach((t, i) => t.order = i);
    }

    this.saveTreeState();
    this.save();
    this.renderMyTasks();
  },

  // ===== BOARD =====
  renderBoard() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const fProj = document.getElementById('board-project-select').value;
    let filtered = this.tasks.filter(t => this.isRootTask(t));
    if (search) filtered = filtered.filter(t => t.title.toLowerCase().includes(search));
    if (fProj) filtered = filtered.filter(t => t.projectId === fProj);

    const board = document.getElementById('kanban-board');
    const dotColors = { 'todo': 'var(--todo)', 'in-progress': 'var(--progress)', 'done': 'var(--done)' };

    board.innerHTML = this.boardColumns.map(col => {
      const status = col.id;
      const tasks = filtered.filter(t => t.status === status).sort((a,b) => (a.order||0) - (b.order||0));
      const dotColor = dotColors[status] || 'var(--text-light)';

      const cardsHtml = tasks.length ? tasks.map(t => {
        const assignee = this.users.find(u => u.id === t.assigneeId);
        const proj = this.projects.find(p => p.id === t.projectId);
        const si = this.getSubtaskInfo(t);
        const ac = (t.attachments||[]).length;
        const blocked = this.isBlocked(t);
        const labelHtml = (t.labelIds||[]).length ? `<div class="card-labels">${this.renderLabelTags(t.labelIds)}</div>` : '';

        const bsel = this.selectedTasks.includes(t.id);
        return `<div class="task-card ${bsel?'board-selected':''}" draggable="true" data-id="${t.id}"
          ondragstart="app.onDragStart(event,'${t.id}')" ondragend="app.onDragEnd(event)"
          ondragover="app.onCardDragOver(event,'${t.id}')" ondragleave="app.onCardDragLeave(event)"
          ondrop="app.onCardDrop(event,'${t.id}','${status}')"
          onclick="app.handleBoardCardClick(event,'${t.id}')">
          <div class="card-top">
            <span class="card-title ${t.status==='done'?'completed':''}">${this.esc(t.title)}</span>
            ${proj ? `<span class="card-project-tag" style="background:${this.safeColor(proj.color)}15;color:${this.safeColor(proj.color)}">${this.esc(proj.name)}</span>` : ''}
          </div>
          ${labelHtml}
          ${si.total>0 ? `<div class="card-subtask-bar"><div class="card-subtask-info"><span class="card-subtask-label">${si.done}/${si.total} subtasks</span><span class="card-subtask-label">${si.percent}%</span></div><div class="card-progress-track"><div class="card-progress-fill ${si.percent===100?'complete':''}" style="width:${si.percent}%"></div></div></div>` : ''}
          <div class="card-bottom">
            <div class="card-left">
              ${assignee ? `<div class="card-avatar" style="background:${this.safeColor(assignee.color)}" title="${this.esc(assignee.name)}">${this.initials(assignee.name)}</div>` : ''}
              ${t.dueDate ? `<span class="card-due ${this.dueDateClass(t.dueDate)}" title="${this.formatDateAbsolute(t.dueDate)}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${this.formatDateShort(t.dueDate)}</span>` : ''}
              ${this.priorityBadge(t.priority)}
              ${this.effortBadge(t.effort)}
              ${blocked ? '<span class="blocked-indicator">Blocked</span>' : ''}
            </div>
            <div class="card-right">
              ${ac>0 ? `<span class="card-attachment-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>${ac}</span>` : ''}
            </div>
          </div>
        </div>`;
      }).join('') : '<div class="column-cards-empty">Drag tasks here or click + to add</div>';

      return `<div class="kanban-column" data-status="${status}">
        <div class="column-header">
          <div class="column-title"><span class="column-dot" style="background:${dotColor}"></span>${this.esc(col.name)} <span class="column-count">${tasks.length}</span></div>
          <button class="btn-icon-sm" onclick="app.showTaskModal('${status}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        <div class="column-cards" id="col-${status}" ondrop="app.onDrop(event,'${status}')" ondragover="app.onDragOver(event)" ondragleave="app.onDragLeave(event)">${cardsHtml}</div>
      </div>`;
    }).join('');

    this.updateBulkBar();
  },

  // ===== DRAG & DROP (with reorder) =====
  onDragStart(e, taskId) { this.draggedTaskId = taskId; e.target.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; },
  onDragEnd(e) { e.target.classList.remove('dragging'); document.querySelectorAll('.column-cards').forEach(c => c.classList.remove('drag-over')); document.querySelectorAll('.task-card').forEach(c => { c.classList.remove('drop-above','drop-below'); }); this.draggedTaskId = null; },
  onDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); },
  onDragLeave(e) { e.currentTarget.classList.remove('drag-over'); },

  onCardDragOver(e, targetId) {
    e.preventDefault(); e.stopPropagation();
    if (targetId === this.draggedTaskId) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    card.classList.toggle('drop-above', e.clientY < mid);
    card.classList.toggle('drop-below', e.clientY >= mid);
  },
  onCardDragLeave(e) { e.currentTarget.classList.remove('drop-above','drop-below'); },

  onCardDrop(e, targetId, status) {
    e.preventDefault(); e.stopPropagation();
    if (!this.draggedTaskId || this.draggedTaskId === targetId) return;
    const task = this.tasks.find(t => t.id === this.draggedTaskId);
    const target = this.tasks.find(t => t.id === targetId);
    if (!task || !target) return;

    this.pushUndo('Card moved');
    task.status = status;
    // Reorder
    const colTasks = this.tasks.filter(t => t.status === status && t.id !== task.id).sort((a,b) => (a.order||0) - (b.order||0));
    const targetIdx = colTasks.indexOf(target);
    const rect = e.currentTarget.getBoundingClientRect();
    const insertAfter = e.clientY >= rect.top + rect.height / 2;
    const insertIdx = insertAfter ? targetIdx + 1 : targetIdx;
    colTasks.splice(insertIdx, 0, task);
    colTasks.forEach((t, i) => t.order = i);

    this.renderBoard(); this.save();
  },

  onDrop(e, status) {
    e.preventDefault(); e.currentTarget.classList.remove('drag-over');
    if (!this.draggedTaskId) return;
    const task = this.tasks.find(t => t.id === this.draggedTaskId);
    if (task) {
      this.pushUndo('Card moved');
      const wasNotDone = task.status !== 'done';
      task.status = status;
      task.order = this.tasks.filter(t => t.status === status).length;
      this.renderBoard(); this.save();
      if (status === 'done' && wasNotDone) this.celebrate();
    }
  },

  // ===== TIMELINE =====
  renderTimeline() {
    const fProj = document.getElementById('timeline-project-select').value;
    let tasks = this.tasks.filter(t => t.dueDate && this.isRootTask(t));
    if (fProj) tasks = tasks.filter(t => t.projectId === fProj);

    const today = new Date(); today.setHours(0,0,0,0);
    const startDate = new Date(today); startDate.setDate(startDate.getDate() - 7 + this.timelineOffset);
    const days = 28;
    const dates = [];
    for (let i = 0; i < days; i++) { const dd = new Date(startDate); dd.setDate(dd.getDate() + i); dates.push(dd); }

    const isToday = d => d.toDateString() === today.toDateString();
    const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;

    let html = `<div class="timeline-header-row"><div class="timeline-label-col">Task</div><div class="timeline-days">${dates.map(dd => `<div class="timeline-day ${isToday(dd)?'today':''} ${isWeekend(dd)?'weekend':''}"><div>${dd.toLocaleDateString('en',{weekday:'short'})}</div><div style="font-weight:600">${dd.getDate()}</div></div>`).join('')}</div></div>`;

    tasks.forEach(t => {
      const proj = this.projects.find(p => p.id === t.projectId);
      const color = proj?.color || '#94a3b8';
      const ts = t.createdAt ? new Date(t.createdAt) : new Date(t.dueDate);
      const te = new Date(t.dueDate); ts.setHours(0,0,0,0); te.setHours(0,0,0,0);
      const cw = 40;
      const sd = Math.floor((ts - startDate) / 86400000);
      const dur = Math.max(1, Math.floor((te - ts) / 86400000) + 1);
      const left = Math.max(0, sd) * cw;
      const width = Math.min(days - Math.max(0, sd), dur - Math.max(0, -sd)) * cw;

      html += `<div class="timeline-row"><div class="timeline-row-label" onclick="app.openTask('${t.id}')"><span class="project-dot" style="background:${color}"></span>${this.esc(t.title)}</div><div class="timeline-row-cells">${dates.map(dd => `<div class="timeline-cell ${isToday(dd)?'today':''} ${isWeekend(dd)?'weekend':''}"></div>`).join('')}${width > 0 ? `<div class="timeline-bar" style="left:${left}px;width:${width}px;background:${color}" onclick="app.openTask('${t.id}')">${width>60?this.esc(t.title):''}</div>` : ''}</div></div>`;
    });

    if (!tasks.length) html += `<div class="empty-state-rich">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <p>No timeline items</p><p class="empty-state-sub">Add tasks with due dates to see them here</p></div>`;
    document.getElementById('timeline-chart').innerHTML = html;
    // Attach drag handlers to timeline bars (Feature 11)
    document.querySelectorAll('.timeline-bar').forEach(bar => {
      const onclick = bar.getAttribute('onclick');
      const match = onclick?.match(/openTask\('([^']+)'\)/);
      if (match) this.initTimelineDrag(bar, match[1]);
    });
  },

  // ===== ANALYTICS =====
  renderAnalytics() {
    this.drawStatusChart();
    this.drawPriorityChart();
    this.drawBurndownChart();
    this.drawVelocityChart();
    this.drawLabelsChart();
  },

  drawChart(canvasId, type, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.parentElement.clientWidth - 48;
    canvas.width = w * 2; canvas.height = canvas.height * 2;
    canvas.style.width = w + 'px';
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, w, canvas.height);

    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();

    if (type === 'bar') {
      const maxVal = Math.max(...data.values, 1);
      const barW = Math.min(60, (w - 60) / data.values.length - 10);
      const chartH = 160;
      const startX = 40;

      data.values.forEach((v, i) => {
        const x = startX + i * (barW + 10);
        const h = (v / maxVal) * chartH;
        ctx.fillStyle = data.colors[i] || '#8a8a8a';
        ctx.beginPath();
        ctx.roundRect(x, chartH - h + 20, barW, h, 4);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(data.labels[i], x + barW/2, chartH + 36);
        ctx.fillText(v, x + barW/2, chartH - h + 14);
      });
    } else if (type === 'line') {
      const maxVal = Math.max(...data.values, 1);
      const chartH = 160; const chartW = w - 60; const startX = 40; const startY = 20;

      // Grid
      for (let i = 0; i <= 4; i++) {
        const y = startY + (chartH / 4) * i;
        ctx.strokeStyle = borderColor; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(startX + chartW, y); ctx.stroke();
        ctx.fillStyle = textColor; ctx.font = '10px Inter'; ctx.textAlign = 'right';
        ctx.fillText(Math.round(maxVal - (maxVal/4)*i), startX - 6, y + 4);
      }

      // Line
      ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = 2;
      ctx.beginPath();
      data.values.forEach((v, i) => {
        const x = startX + (chartW / (data.values.length - 1)) * i;
        const y = startY + chartH - (v / maxVal) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Fill under
      ctx.lineTo(startX + chartW, startY + chartH);
      ctx.lineTo(startX, startY + chartH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,0.04)'; ctx.fill();

      // Labels
      data.labels.forEach((label, i) => {
        const x = startX + (chartW / (data.values.length - 1)) * i;
        ctx.fillStyle = textColor; ctx.font = '10px Inter'; ctx.textAlign = 'center';
        ctx.fillText(label, x, startY + chartH + 16);
      });

      // Dots
      data.values.forEach((v, i) => {
        const x = startX + (chartW / (data.values.length - 1)) * i;
        const y = startY + chartH - (v / maxVal) * chartH;
        ctx.fillStyle = '#4a4a4a'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI*2); ctx.fill();
      });
    }
  },

  drawStatusChart() {
    const todo = this.tasks.filter(t => t.status === 'todo').length;
    const prog = this.tasks.filter(t => t.status === 'in-progress').length;
    const done = this.tasks.filter(t => t.status === 'done').length;
    this.drawChart('chart-status', 'bar', { values: [todo, prog, done], labels: ['To Do', 'In Progress', 'Done'], colors: ['#b5aa9c', '#c09a5a', '#7a9e7a'] });
  },

  drawPriorityChart() {
    const p0 = this.tasks.filter(t => t.priority === 'p0').length;
    const p1 = this.tasks.filter(t => t.priority === 'p1').length;
    const p2 = this.tasks.filter(t => t.priority === 'p2').length;
    const p3 = this.tasks.filter(t => t.priority === 'p3').length;
    this.drawChart('chart-priority', 'bar', { values: [p0, p1, p2, p3], labels: ['Urgent', 'High', 'Medium', 'Low'], colors: ['#b87a6a', '#c09a5a', '#7a96a8', '#b5aa9c'] });
  },

  drawBurndownChart() {
    const today = new Date(); const vals = []; const labels = [];
    for (let i = 6; i >= 0; i--) {
      const dd = new Date(today); dd.setDate(dd.getDate() - i);
      const dateStr = dd.toISOString().split('T')[0];
      const done = this.tasks.filter(t => t.status === 'done' && t.dueDate && t.dueDate <= dateStr).length;
      vals.push(done);
      labels.push(dd.toLocaleDateString('en', { weekday: 'short' }));
    }
    this.drawChart('chart-burndown', 'line', { values: vals, labels });
  },

  drawVelocityChart() {
    const vals = []; const labels = [];
    for (let w = 3; w >= 0; w--) {
      const end = new Date(); end.setDate(end.getDate() - w * 7);
      const start = new Date(end); start.setDate(start.getDate() - 7);
      const count = this.tasks.filter(t => t.status === 'done' && t.dueDate && new Date(t.dueDate) >= start && new Date(t.dueDate) < end).length;
      vals.push(count);
      labels.push(`Week ${4 - w}`);
    }
    this.drawChart('chart-velocity', 'bar', { values: vals, labels, colors: ['#b0b0b0', '#8a8a8a', '#6a6a6a', '#4a4a4a'] });
  },

  drawLabelsChart() {
    const vals = []; const labels = []; const colors = [];
    this.labels.forEach(l => {
      const count = this.tasks.filter(t => (t.labelIds||[]).includes(l.id)).length;
      if (count > 0) { vals.push(count); labels.push(l.name); colors.push(l.color); }
    });
    if (vals.length) this.drawChart('chart-labels', 'bar', { values: vals, labels, colors });
  },

  // ===== SETTINGS =====
  renderSettings() {
    this.switchSettingsSection(this._settingsSection || 'users');
  },

  switchSettingsSection(section) {
    this._settingsSection = section;
    document.querySelectorAll('.settings-sidenav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.section === section));
    document.querySelectorAll('.settings-pane').forEach(el =>
      el.classList.toggle('active', el.id === `settings-pane-${section}`));
    switch(section) {
      case 'users':      this.renderSettingsUsers(); break;
      case 'labels':     this.renderSettingsLabels(); break;
      case 'account':    this.renderSettingsAccount(); break;
      case 'appearance': this.renderSettingsAppearance(); break;
    }
  },

  renderSettingsUsers() {
    const el = document.getElementById('settings-users-list');
    if (!el) return;
    if (!this.users.length) {
      el.innerHTML = `<div class="settings-empty">No team members yet.<br>Add someone to get started.</div>`;
      return;
    }
    el.innerHTML = this.users.map(u => `
      <div class="settings-user-row">
        <div class="settings-user-info">
          <div class="team-avatar" style="background:${this.safeColor(u.color)}">${this.initials(u.name)}</div>
          <div>
            <div class="settings-user-name">${this.esc(u.name)} ${this.getRoleBadge(u.role)}</div>
            <div class="settings-user-email">${this.esc(u.email || '')}</div>
          </div>
        </div>
        <div class="settings-user-actions">
          ${(u.id === this.currentUserId || this.canManageUser(u.id)) ? `
            <button class="btn-secondary btn-sm" onclick="app.showChangePassword('${u.id}')">Change password</button>
          ` : ''}
          <button class="btn-secondary btn-sm" onclick="app.editUser('${u.id}')">Edit</button>
          ${this.canManageUser(u.id) && u.id !== this.currentUserId ? `
            <button class="btn-danger btn-sm" onclick="app.deleteUser('${u.id}')">Delete</button>
          ` : ''}
        </div>
      </div>`).join('');
  },

  renderSettingsLabels() {
    const el = document.getElementById('settings-labels-list');
    if (!el) return;
    if (!this.labels.length) {
      el.innerHTML = `<div class="settings-empty">No labels yet. Use the button above to create one.</div>`;
      return;
    }
    el.innerHTML = this.labels.map(l => `
      <div class="settings-row">
        <div class="settings-label-info">
          <span class="label-dot" style="background:${this.safeColor(l.color)}; width:10px; height:10px; border-radius:50%; display:inline-block; margin-right:8px;"></span>
          <span>${this.esc(l.name)}</span>
        </div>
        <button class="btn-danger btn-sm" onclick="app.deleteLabel('${l.id}');app.renderSettingsLabels()">Delete</button>
      </div>`).join('');
  },

  renderSettingsAccount() {
    const el = document.getElementById('settings-account-content');
    if (!el) return;
    const u = this.users.find(u => u.id === this.currentUserId);
    if (!u) return;
    el.innerHTML = `
      <div class="settings-account-card">
        <div class="settings-account-avatar" style="background:${this.safeColor(u.color)}">${this.initials(u.name)}</div>
        <div class="settings-account-details">
          <div class="settings-account-name">${this.esc(u.name)} ${this.getRoleBadge(u.role)}</div>
          <div class="settings-user-email">${this.esc(u.email || '')}</div>
        </div>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Profile</div>
          <div class="settings-row-desc">Update your name, email and avatar colour</div>
        </div>
        <button class="btn-secondary btn-sm" onclick="app.editUser('${u.id}')">Edit profile</button>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Password</div>
          <div class="settings-row-desc">Change your login password</div>
        </div>
        <button class="btn-secondary btn-sm" onclick="app.showChangePassword('${u.id}')">Change password</button>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Sign out</div>
          <div class="settings-row-desc">Log out of your account on this device</div>
        </div>
        <button class="btn-danger btn-sm" onclick="app.logout()">Sign out</button>
      </div>`;
  },

  renderSettingsAppearance() {
    const el = document.getElementById('settings-appearance-content');
    if (!el) return;
    el.innerHTML = `
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Dark mode</div>
          <div class="settings-row-desc">Switch between light and dark theme</div>
        </div>
        <label class="toggle">
          <input type="checkbox" ${this.theme === 'dark' ? 'checked' : ''} onchange="app.toggleTheme()">
          <span class="toggle-slider"></span>
        </label>
      </div>`;
  },

  // ===== WORKLOAD =====
  renderWorkload() {
    if (!this.users.length) {
      document.getElementById('workload-chart').innerHTML = `<div class="empty-state-rich"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><p>No team members</p><p class="empty-state-sub">Assign tasks to team members to see workload</p></div>`;
      return;
    }
    document.getElementById('workload-chart').innerHTML = this.users.map(u => {
      const tasks = this.tasks.filter(t => t.assigneeId === u.id);
      const todo = tasks.filter(t => t.status === 'todo').length;
      const prog = tasks.filter(t => t.status === 'in-progress').length;
      const done = tasks.filter(t => t.status === 'done').length;
      const max = Math.max(todo + prog + done, 1);

      return `<div class="workload-row">
        <div class="workload-user"><div class="team-avatar" style="background:${this.safeColor(u.color)}">${this.initials(u.name)}</div><span class="workload-user-name">${this.esc(u.name)}</span></div>
        <div class="workload-bars">
          <div class="workload-bar-row"><span class="workload-bar-label">To Do</span><div class="workload-bar-track"><div class="workload-bar-fill" style="width:${(todo/max)*100}%;background:var(--todo)"></div></div><span class="workload-bar-count">${todo}</span></div>
          <div class="workload-bar-row"><span class="workload-bar-label">In Progress</span><div class="workload-bar-track"><div class="workload-bar-fill" style="width:${(prog/max)*100}%;background:var(--progress)"></div></div><span class="workload-bar-count">${prog}</span></div>
          <div class="workload-bar-row"><span class="workload-bar-label">Done</span><div class="workload-bar-track"><div class="workload-bar-fill" style="width:${(done/max)*100}%;background:var(--done)"></div></div><span class="workload-bar-count">${done}</span></div>
        </div>
      </div>`;
    }).join('');
  },

  // ===== NOTIFICATIONS =====
  renderNotifications() {
    const badge = document.getElementById('notification-badge');
    const unread = this.notifications.filter(n => !n.read).length;
    badge.textContent = unread; badge.style.display = unread > 0 ? 'flex' : 'none';
    const icons = { deadline: '<div class="notif-icon deadline">&#9200;</div>', assign: '<div class="notif-icon assign">&#128100;</div>', comment: '<div class="notif-icon comment">&#128172;</div>' };
    document.getElementById('notification-list').innerHTML = this.notifications.length ? this.notifications.map(n => `
      <div class="notif-item ${n.read?'':'unread'}" onclick="app.readNotification('${n.id}')">
        ${icons[n.type]||icons.assign}<div class="notif-text"><p>${this.esc(n.text)}</p><div class="notif-time">${this.timeAgo(n.timestamp)}</div></div>
      </div>`).join('') : '<div class="empty-state" style="padding:30px"><p>No notifications</p></div>';
  },

  readNotification(id) { const n = this.notifications.find(x => x.id === id); if (n) { n.read = true; this.save(); this.renderNotifications(); this.updateFaviconBadge(); if (n.taskId) this.openTask(n.taskId); } },
  clearNotifications() { this.notifications = []; this.save(); this.renderNotifications(); this.updateFaviconBadge(); },
  addNotification(type, text, taskId) { this.notifications.unshift({ id: this.generateId(), type, text, taskId, read: false, timestamp: new Date().toISOString() }); this.save(); this.renderNotifications(); },
  checkDeadlineNotifications() {
    if (!this.notifPrefs.deadlines) return;
    const tmr = new Date(); tmr.setDate(tmr.getDate()+1); const tmrStr = tmr.toISOString().split('T')[0];
    this.tasks.forEach(t => { if (t.dueDate === tmrStr && t.status !== 'done' && !this.notifications.some(n => n.type==='deadline' && n.taskId===t.id)) this.addNotification('deadline',`Deadline approaching in 24h: "${t.title}"`,t.id); });
  },
  setNotifPref(key, value) {
    this.notifPrefs[key] = value;
    this.save();
  },
  renderNotifPrefs() {
    const p = this.notifPrefs;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
    set('notif-deadline', p.deadlines);
    set('notif-assign',   p.assignments);
    set('notif-comments', p.comments);
    set('notif-email',    p.email);
  },

  // ===== TASK CRUD =====
  showTaskModal(defaultStatus) {
    this.editingTaskId = null;
    document.getElementById('task-modal-title').textContent = 'New Task';
    document.getElementById('modal-task-name').value = '';
    document.getElementById('modal-task-assignee').value = '';
    document.getElementById('modal-task-project').value = '';
    this.populateStatusSelects();
    document.getElementById('modal-task-status').value = defaultStatus || (this.boardColumns[0]?.id || 'todo');
    document.getElementById('modal-task-due').value = '';
    document.getElementById('modal-task-desc').value = '';
    document.getElementById('modal-task-priority').value = '';
    document.getElementById('modal-task-effort').value = '';
    this.renderLabelPicker('modal-task-labels', []);
    this._pendingSubtasks = [];
    this.populateTemplateSelect();
    document.getElementById('task-modal-overlay').classList.add('show');

    // Smart defaults: always default assignee to current user
    document.getElementById('modal-task-assignee').value = this.currentUserId;
    // Auto-select project if in project view
    if (this.currentView === 'project' && this.selectedProjectId) {
      document.getElementById('modal-task-project').value = this.selectedProjectId;
    }
    // Auto-select if only one option available
    if (this.projects.length === 1) document.getElementById('modal-task-project').value = this.projects[0].id;
  },

  closeTaskModal() { document.getElementById('task-modal-overlay').classList.remove('show'); },

  saveTaskFromModal() {
    const name = document.getElementById('modal-task-name').value.trim();
    if (!name) { this.toast('Please enter a task name', 'error'); return; }
    const existingTask = this.editingTaskId ? this.tasks.find(x => x.id === this.editingTaskId) : null;
    const task = {
      id: this.editingTaskId || this.generateId(), title: name,
      description: document.getElementById('modal-task-desc').value,
      status: document.getElementById('modal-task-status').value,
      projectId: document.getElementById('modal-task-project').value,
      assigneeId: document.getElementById('modal-task-assignee').value,
      dueDate: document.getElementById('modal-task-due').value,
      priority: document.getElementById('modal-task-priority').value,
      effort: document.getElementById('modal-task-effort').value,
      labelIds: this.getSelectedLabels('modal-task-labels'),
      blockedBy: [], order: this.tasks.filter(t => t.status === (existingTask?.status || 'todo')).length,
      parentId: existingTask?.parentId || '',
      deliverables: [], attachments: [], comments: [], activityLog: [{ text: 'Task created', timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString().split('T')[0],
    };
    if (this.editingTaskId) {
      const idx = this.tasks.findIndex(t => t.id === this.editingTaskId);
      if (idx >= 0) { const old = this.tasks[idx]; task.deliverables = old.deliverables || []; task.attachments = old.attachments; task.comments = old.comments; task.activityLog = old.activityLog; task.createdAt = old.createdAt; task.order = old.order; task.parentId = old.parentId || ''; this.tasks[idx] = task; }
    } else {
      this.tasks.push(task);
      if (task.assigneeId) { const u = this.users.find(u => u.id === task.assigneeId); this.addNotification('assign', `Task "${task.title}" assigned to ${u?.name||'someone'}`, task.id); }
    }
    // Create pending subtasks from template
    if (this._pendingSubtasks && this._pendingSubtasks.length && !this.editingTaskId) {
      this._pendingSubtasks.forEach((st, i) => {
        this.tasks.push({
          id: this.generateId(), title: st, description: '',
          status: 'todo', projectId: task.projectId, assigneeId: task.assigneeId || '',
          dueDate: '', priority: '', labelIds: [], blockedBy: [],
          order: i, parentId: task.id,
          attachments: [], comments: [],
          activityLog: [{ text: 'Subtask created from template', timestamp: new Date().toISOString() }],
          createdAt: new Date().toISOString().split('T')[0],
        });
      });
      this._pendingSubtasks = [];
    }
    const isNew = !this.editingTaskId;
    const newTaskId = task.id;
    this.save(); this.closeTaskModal(); this.render();
    this.toast(isNew ? 'Task created' : 'Task updated', 'success');
    // QOL: flash highlight on newly created task
    if (isNew) {
      setTimeout(() => {
        const el = document.querySelector(`[data-task-id="${newTaskId}"], [data-id="${newTaskId}"]`);
        if (el) { el.classList.add('just-created'); setTimeout(() => el.classList.remove('just-created'), 1000); }
      }, 50);
    }
  },

  toggleTaskStatus(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    this.pushUndo('Status changed');
    const wasDone = task.status === 'done';
    const newStatus = wasDone ? 'todo' : 'done';
    // Optimistic UI: update immediately
    task.status = newStatus;
    if (!wasDone) {
      // Mark all descendants done too
      this.getAllDescendants(task.id).forEach(d => d.status = 'done');
      // Completion celebration animation
      const checkEl = document.querySelector(`[data-task-id="${taskId}"] .task-check`);
      if (checkEl) { checkEl.classList.add('just-completed'); setTimeout(() => checkEl.classList.remove('just-completed'), 500); }
      this.celebrate();
      // "Up Next" suggestion
      const next = this.suggestNextTask(task);
      if (next) {
        this.toastWithAction('\u2713 Done! Up next: ' + next.title, 'Open', () => this.openTask(next.id));
      }
    }
    this._appendActivity(task, `Status changed to ${task.status}`);
    this.render();
    this.save();
  },

  deleteTask(taskId) {
    this.pushUndo('Task deleted');
    const taskName = this.tasks.find(t => t.id === taskId)?.title || 'Task';
    // Cascade delete all descendants
    const toDelete = new Set([taskId]);
    const addDescendants = (id) => {
      this.tasks.filter(t => t.parentId === id).forEach(c => { toDelete.add(c.id); addDescendants(c.id); });
    };
    addDescendants(taskId);
    this.tasks = this.tasks.filter(t => !toDelete.has(t.id));
    this.tasks.forEach(t => { if (t.blockedBy?.length) t.blockedBy = t.blockedBy.filter(id => !toDelete.has(id)); });
    this.save(); this.render();
    this.toastUndo('Task deleted: ' + taskName, () => this.undo());
  },

  async deleteCurrentTask() {
    if (!this.currentTaskId) return;
    if (!this.canDeleteTask(this.currentTaskId)) {
      this.toast('You do not have permission to delete this task', 'error');
      return;
    }
    if (!await this.confirm('Delete this task and all its subtasks?', 'Delete task', 'Delete')) return;
    this.deleteTask(this.currentTaskId); this.closeTaskPanel(); this.toast('Task deleted', 'success');
  },

  // ===== TASK PANEL =====
  openTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    this.currentTaskId = taskId;

    // Track recently viewed tasks
    this.recentTasks = [taskId, ...this.recentTasks.filter(id => id !== taskId)].slice(0, 5);
    localStorage.setItem('fb_recent_tasks', JSON.stringify(this.recentTasks));

    // Show/hide "Back to parent" link
    const parentLinkEl = document.getElementById('panel-parent-link');
    if (parentLinkEl) {
      if (task.parentId) {
        const parent = this.tasks.find(t => t.id === task.parentId);
        parentLinkEl.classList.remove('hidden');
        parentLinkEl.innerHTML = `<a href="#" onclick="event.preventDefault();app.openTask('${task.parentId}')" class="panel-parent-link-a">&larr; Back to ${this.esc(parent?.title || 'parent')}</a>`;
      } else {
        parentLinkEl.classList.add('hidden');
        parentLinkEl.innerHTML = '';
      }
    }

    document.getElementById('panel-title').value = task.title;
    document.getElementById('panel-assignee').value = task.assigneeId || '';
    document.getElementById('panel-due').value = task.dueDate || '';
    document.getElementById('panel-project').value = task.projectId || '';
    document.getElementById('panel-status').value = task.status;
    document.getElementById('panel-description').value = task.description || '';
    document.getElementById('panel-priority').value = task.priority || '';
    document.getElementById('panel-effort').value = task.effort || '';
    this._setMultiSelect('panel-blocked-by', task.blockedBy || []);

    this.populateSelects();
    this._setMultiSelect('panel-blocked-by', task.blockedBy || []);

    const statusColors = { todo: 'var(--todo)', 'in-progress': 'var(--progress)', done: 'var(--done)' };
    const colObj = this.boardColumns.find(c => c.id === task.status);
    const se = document.getElementById('panel-task-status');
    se.textContent = colObj ? colObj.name : task.status;
    se.style.background = (statusColors[task.status] || 'var(--text-light)') + '20';
    se.style.color = statusColors[task.status] || 'var(--text-light)';

    this.renderLabelPicker('panel-labels', task.labelIds || []);
    this.renderSubtasks(task);
    this.renderDeliverables(task);
    this.renderAttachments(task);
    this.renderComments(task);
    this.renderActivityLog(task);
    this.renderDepsInfo(task);
    this.populatePanelStatusFromColumns();

    // Update context chips and activity timeline
    this.updateContextChips(task);
    this.renderActivityTimeline(task);

    // Sync "More details" section
    document.getElementById('panel-effort-visible').value = task.effort || '';
    this.renderLabelPicker('panel-labels-visible', task.labelIds || []);
    const blockedVisEl = document.getElementById('panel-blocked-visible');
    const blockedHiddenEl = document.getElementById('panel-blocked-by');
    blockedVisEl.innerHTML = blockedHiddenEl.innerHTML;
    this._setMultiSelect('panel-blocked-visible', task.blockedBy || []);

    document.getElementById('task-overlay').classList.add('show');
    document.getElementById('task-panel').classList.add('open');
    this.renderBreadcrumb();
  },

  closeTaskPanel() {
    document.getElementById('task-overlay').classList.remove('show');
    document.getElementById('task-panel').classList.remove('open');
    this.currentTaskId = null;
    this.renderBreadcrumb();
  },

  saveTaskFromPanel(silent) {
    if (!this.currentTaskId) return;
    if (!this.canEditTask(this.currentTaskId)) {
      if (!silent) this.toast('You do not have permission to edit this task', 'error');
      return;
    }
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task) return;

    const oldStatus = task.status;
    task.title = document.getElementById('panel-title').value.trim() || task.title;
    task.assigneeId = document.getElementById('panel-assignee').value;
    task.dueDate = document.getElementById('panel-due').value;
    task.projectId = document.getElementById('panel-project').value;
    task.status = document.getElementById('panel-status').value;
    task.description = document.getElementById('panel-description').value;
    task.priority = document.getElementById('panel-priority').value;
    task.effort = document.getElementById('panel-effort').value;
    task.blockedBy = Array.from(document.getElementById('panel-blocked-by').selectedOptions).map(o => o.value).filter(Boolean);
    task.labelIds = this.getSelectedLabels('panel-labels');
    // parentId is preserved — not editable from panel

    if (oldStatus !== task.status) this._appendActivity(task, `Status changed to ${task.status}`);

    const se = document.getElementById('panel-task-status');
    const statusColors2 = { todo: 'var(--todo)', 'in-progress': 'var(--progress)', done: 'var(--done)' };
    const colObj2 = this.boardColumns.find(c => c.id === task.status);
    se.textContent = colObj2 ? colObj2.name : task.status;
    se.style.background = (statusColors2[task.status] || 'var(--text-light)') + '20';
    se.style.color = statusColors2[task.status] || 'var(--text-light)';

    // Update context chips
    this.updateContextChips(task);

    if (task.status === 'done' && oldStatus !== 'done') this.celebrate();
    this.render(); this.save();
    if (silent) {
      // Show subtle saved indicator
      const indicator = document.getElementById('panel-saved-indicator');
      if (indicator) { indicator.classList.add('show'); clearTimeout(this._savedTimer); this._savedTimer = setTimeout(() => indicator.classList.remove('show'), 1500); }
    } else {
      this.toast('Changes saved', 'success');
    }
  },

  // ===== DEPENDENCIES INFO =====
  renderDepsInfo(task) {
    const sec = document.getElementById('panel-deps-section');
    const info = document.getElementById('panel-deps-info');
    const blockedByTasks = this.getBlockedBy(task);
    const blocking = this.getBlocking(task.id);

    if (!blockedByTasks.length && !blocking.length) { sec.classList.add('hidden'); return; }
    sec.classList.remove('hidden');
    let html = '';
    blockedByTasks.forEach(b => { html += `<div class="dep-item blocked"><span class="dep-icon">&#128683;</span> Blocked by: <strong>${this.esc(b.title)}</strong> (${b.status})</div>`; });
    blocking.forEach(t => { html += `<div class="dep-item blocking"><span class="dep-icon">&#9888;</span> Blocking: <strong>${this.esc(t.title)}</strong></div>`; });
    info.innerHTML = html;
  },

  // ===== ACTIVITY LOG =====
  renderActivityLog(task) {
    const log = (task.activityLog || []).slice().reverse();
    document.getElementById('activity-log').innerHTML = log.length ? log.map(e => `
      <div class="activity-log-item"><span class="log-time">${this.timeAgo(e.timestamp)}</span><span>${this.esc(e.text)}</span></div>
    `).join('') : '<p style="font-size:12px;color:var(--text-light)">No activity yet</p>';
  },

  // ===== NESTED TASK HELPERS =====
  getChildren(taskId) {
    return this.tasks.filter(t => t.parentId === taskId).sort((a,b) => (a.order||0) - (b.order||0));
  },

  getAllDescendants(taskId) {
    const result = [];
    const children = this.getChildren(taskId);
    children.forEach(c => { result.push(c); result.push(...this.getAllDescendants(c.id)); });
    return result;
  },

  getTaskDepth(task) {
    let depth = 0;
    let current = task;
    while (current && current.parentId) {
      depth++;
      current = this.tasks.find(t => t.id === current.parentId);
      if (depth > 5) break;
    }
    return depth;
  },

  isRootTask(task) {
    return !task.parentId;
  },

  getAncestorChain(task) {
    const chain = [];
    let current = task;
    while (current && current.parentId) {
      const parent = this.tasks.find(t => t.id === current.parentId);
      if (parent) { chain.unshift(parent); current = parent; } else break;
    }
    return chain;
  },

  // ===== SUBTASKS (with drag-to-reorder) =====
  getSubtaskInfo(task) {
    const descendants = this.getAllDescendants(task.id);
    const total = descendants.length;
    const done = descendants.filter(d => d.status === 'done').length;
    return { total, done, percent: total > 0 ? Math.round(done/total*100) : 0 };
  },

  renderSubtasks(task) {
    const children = this.getChildren(task.id);
    const info = this.getSubtaskInfo(task);
    const spEl = document.getElementById('subtask-progress');
    if (info.total > 0) { spEl.classList.remove('hidden'); } else { spEl.classList.add('hidden'); }
    document.getElementById('subtask-progress-fill').style.width = info.percent + '%';
    document.getElementById('subtask-progress-text').textContent = info.percent + '%';

    document.getElementById('subtask-list').innerHTML = children.map(st => {
      const assignee = this.users.find(u => u.id === st.assigneeId);
      const childCount = this.getAllDescendants(st.id).length;
      const childDone = this.getAllDescendants(st.id).filter(d => d.status === 'done').length;
      return `<div class="subtask-row" data-id="${st.id}" draggable="true"
        ondragstart="app.onSubDragStart(event,'${st.id}')" ondragend="app.onSubDragEnd(event)"
        ondragover="app.onSubDragOver(event,'${st.id}')" ondrop="app.onSubDrop(event,'${st.id}')">
        <span class="subtask-drag-handle">&#8942;&#8942;</span>
        <div class="subtask-check ${st.status==='done'?'done':''}" onclick="event.stopPropagation();app.toggleSubtask('${st.id}')"></div>
        <span class="subtask-row-title ${st.status==='done'?'completed':''}" onclick="app.openTask('${st.id}')">${this.esc(st.title)}</span>
        <div class="subtask-row-meta">
          ${this.priorityBadge(st.priority)}
          ${childCount > 0 ? `<span class="task-subtask-badge" title="${childDone} of ${childCount} subtasks completed">${childDone}/${childCount}</span>` : ''}
          ${st.dueDate ? `<span class="task-list-due ${this.dueDateClass(st.dueDate)}" title="${this.formatDateAbsolute(st.dueDate)}">${this.formatDate(st.dueDate)}</span>` : ''}
          ${assignee ? `<div class="task-avatar-sm" style="background:${this.safeColor(assignee.color)}" title="${this.esc(assignee.name)}">${this.initials(assignee.name)}</div>` : ''}
        </div>
        <button class="subtask-delete" onclick="event.stopPropagation();app.deleteSubtask('${st.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>`;
    }).join('');
  },

  onSubDragStart(e, stId) { this.draggedSubtaskId = stId; e.target.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', stId); },
  onSubDragEnd(e) { e.target.classList.remove('dragging'); document.querySelectorAll('.subtask-row').forEach(s => s.classList.remove('drop-target')); this.draggedSubtaskId = null; },
  onSubDragOver(e, targetId) { e.preventDefault(); if (targetId !== this.draggedSubtaskId) e.currentTarget.classList.add('drop-target'); },
  onSubDrop(e, targetId) {
    e.preventDefault(); e.currentTarget.classList.remove('drop-target');
    if (!this.draggedSubtaskId || this.draggedSubtaskId === targetId || !this.currentTaskId) return;
    const dragged = this.tasks.find(t => t.id === this.draggedSubtaskId);
    if (!dragged) return;
    // Don't allow dropping onto own descendant
    if (this.getAllDescendants(dragged.id).some(d => d.id === targetId)) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId); if (!task) return;
    // Reparent: move dragged to same parent as target (the current panel task)
    dragged.parentId = task.id;
    const children = this.getChildren(task.id).filter(c => c.id !== dragged.id);
    const targetChild = children.find(c => c.id === targetId);
    if (targetChild) {
      const targetIdx = children.indexOf(targetChild);
      children.splice(targetIdx, 0, dragged);
    } else {
      children.push(dragged);
    }
    children.forEach((c, i) => c.order = i);
    this.save(); this.renderSubtasks(task); this.render();
  },

  addSubtask() {
    if (!this.currentTaskId) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId); if (!task) return;
    const depth = this.getTaskDepth(task);
    if (depth >= 4) { this.toast('Maximum nesting depth (5 levels) reached', 'error'); return; }
    const children = this.getChildren(task.id);
    const newTask = {
      id: this.generateId(), title: 'New subtask', description: '',
      status: 'todo', projectId: task.projectId, assigneeId: task.assigneeId || '',
      dueDate: '', priority: '', labelIds: [], blockedBy: [],
      order: children.length, parentId: task.id,
      attachments: [], comments: [],
      activityLog: [{ text: 'Subtask created', timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.tasks.push(newTask);
    this.save(); this.renderSubtasks(task); this.render();
    const titles = document.querySelectorAll('#subtask-list .subtask-row-title');
    // Focus is not on input anymore since titles are spans; user clicks to open
  },

  toggleSubtask(stId) {
    const st = this.tasks.find(t => t.id === stId); if (!st) return;
    const wasDone = st.status === 'done';
    st.status = wasDone ? 'todo' : 'done';
    // If marking done, mark all descendants done too
    if (!wasDone) {
      this.getAllDescendants(st.id).forEach(d => d.status = 'done');
    }
    this._appendActivity(st, `Status changed to ${st.status}`);
    // Check if all siblings are done -> mark parent done
    if (st.parentId) {
      const parent = this.tasks.find(t => t.id === st.parentId);
      if (parent) {
        const siblings = this.getChildren(parent.id);
        if (siblings.length > 0 && siblings.every(s => s.status === 'done')) {
          parent.status = 'done';
          document.getElementById('panel-status').value = 'done';
          this.celebrate();
        }
        this.save(); this.renderSubtasks(parent); this.render();
        return;
      }
    }
    this.save();
    if (this.currentTaskId) {
      const currentTask = this.tasks.find(t => t.id === this.currentTaskId);
      if (currentTask) this.renderSubtasks(currentTask);
    }
    this.render();
  },

  deleteSubtask(stId) {
    this.pushUndo('Subtask deleted');
    // Cascade delete all descendants
    const toDelete = new Set([stId]);
    const addDescendants = (id) => {
      this.tasks.filter(t => t.parentId === id).forEach(c => { toDelete.add(c.id); addDescendants(c.id); });
    };
    addDescendants(stId);
    this.tasks = this.tasks.filter(t => !toDelete.has(t.id));
    // Clean up blockedBy references
    this.tasks.forEach(t => { if (t.blockedBy?.length) t.blockedBy = t.blockedBy.filter(id => !toDelete.has(id)); });
    this.save();
    if (this.currentTaskId) {
      const currentTask = this.tasks.find(t => t.id === this.currentTaskId);
      if (currentTask) this.renderSubtasks(currentTask);
    }
    this.render();
  },

  // ===== ATTACHMENTS =====
  generateImagePreview(name) {
    // Generate a unique colorful placeholder based on filename
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 40) % 360;
    const sat = 25 + Math.abs((hash >> 8) % 20);
    const light = 75 + Math.abs((hash >> 16) % 15);
    return `background: linear-gradient(135deg, hsl(${hue1},${sat}%,${light}%) 0%, hsl(${hue2},${sat}%,${light - 10}%) 100%)`;
  },

  renderAttachments(task) {
    const attachments = task.attachments || [];
    const imageExts = ['png','jpg','jpeg','gif','webp','svg','bmp'];
    const isImage = (a) => a.type === 'img' || imageExts.some(ext => a.name.toLowerCase().endsWith('.' + ext));
    const images = attachments.filter(isImage);
    const nonImages = attachments.filter(a => !isImage(a));

    let html = '';
    // Image attachments as visual grid with previews
    if (images.length) {
      html += '<div class="attachment-grid">';
      html += images.map((a, idx) => {
        const hasReal = a.dataUrl;
        const gradStyle = this.generateImagePreview(a.name);
        const previewStyle = hasReal ? `background-image:url('${a.dataUrl}');background-size:cover;background-position:center` : gradStyle;
        const placeholderIcon = hasReal ? '' : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
        return `<div class="attachment-item attachment-image" onclick="app.openLightbox('${a.id}')">
          <div class="attachment-preview" style="${previewStyle}">
            ${placeholderIcon}
          </div>
          <div class="attachment-image-info">
            <span class="attachment-name" title="${this.esc(a.name)}">${this.esc(a.name)}</span>
            <span class="attachment-size">${a.size}</span>
          </div>
          <button class="attachment-image-remove" onclick="event.stopPropagation();app.removeAttachment('${a.id}')" title="Remove">&times;</button>
        </div>`;
      }).join('');
      html += '</div>';
    }
    // Non-image attachments as compact list
    if (nonImages.length) {
      html += nonImages.map(a => {
        const extMatch = a.name.match(/\.(\w+)$/);
        const ext = extMatch ? extMatch[1].toUpperCase() : (a.type||'FILE').toUpperCase();
        return `<div class="attachment-item attachment-file">
          <div class="attachment-file-icon">${ext}</div>
          <div class="attachment-file-info">
            <div class="attachment-name">${this.esc(a.name)}</div>
            <div class="attachment-size">${a.size}</div>
          </div>
          <button class="attachment-remove" onclick="event.stopPropagation();app.removeAttachment('${a.id}')" title="Remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>`;
      }).join('');
    }
    document.getElementById('attachment-list').innerHTML = html || '<p style="font-size:12px;color:var(--text-light)">No attachments yet</p>';
  },

  handleFileUpload(e) {
    if (!this.currentTaskId) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId); if (!task) return;
    task.attachments = task.attachments || [];
    const files = Array.from(e.target.files);
    let processed = 0;
    files.forEach(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      let type = 'other';
      if (['pdf'].includes(ext)) type = 'pdf'; else if (['jpg','jpeg','png','gif','svg','webp','bmp'].includes(ext)) type = 'img';
      else if (['doc','docx','txt','md','yml','yaml','json','fig','sketch'].includes(ext)) type = 'doc';
      const attachment = { id: this.generateId(), name: f.name, size: f.size > 1048576 ? (f.size/1048576).toFixed(1)+' MB' : (f.size/1024).toFixed(0)+' KB', type };
      // Read image files as data URLs for preview/lightbox
      if (type === 'img') {
        const reader = new FileReader();
        reader.onload = (ev) => {
          attachment.dataUrl = ev.target.result;
          task.attachments.push(attachment);
          processed++;
          if (processed === files.length) { this.save(); this.renderAttachments(task); this.render(); }
        };
        reader.readAsDataURL(f);
      } else {
        task.attachments.push(attachment);
        processed++;
        if (processed === files.length) { this.save(); this.renderAttachments(task); this.render(); }
      }
    });
    e.target.value = '';
  },

  removeAttachment(aId) {
    if (!this.currentTaskId) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId); if (!task) return;
    task.attachments = task.attachments.filter(a => a.id !== aId); this.save(); this.renderAttachments(task);
  },

  openLightbox(attachmentId) {
    if (!this.currentTaskId) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task) return;
    const imageExts = ['png','jpg','jpeg','gif','webp','svg','bmp'];
    const isImage = (a) => a.type === 'img' || imageExts.some(ext => a.name.toLowerCase().endsWith('.' + ext));
    const images = (task.attachments || []).filter(isImage);
    const currentIdx = images.findIndex(a => a.id === attachmentId);
    if (currentIdx === -1) return;

    this._lightboxImages = images;
    this._lightboxIdx = currentIdx;
    this._renderLightbox();
  },

  _renderLightbox() {
    const images = this._lightboxImages;
    const idx = this._lightboxIdx;
    const a = images[idx];
    if (!a) return;

    let overlay = document.getElementById('lightbox-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'lightbox-overlay';
      overlay.className = 'lightbox-overlay';
      overlay.addEventListener('click', (e) => { if (e.target === overlay) app.closeLightbox(); });
      document.body.appendChild(overlay);
    }

    const hasReal = a.dataUrl;
    const gradStyle = this.generateImagePreview(a.name);
    const imgContent = hasReal
      ? `<img src="${a.dataUrl}" class="lightbox-img" alt="${this.esc(a.name)}">`
      : `<div class="lightbox-placeholder" style="${gradStyle}">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
          <p style="color:rgba(255,255,255,0.7);font-size:14px;margin-top:12px">Preview not available</p>
          <p style="color:rgba(255,255,255,0.5);font-size:12px">Upload an image to see it here</p>
        </div>`;

    const hasPrev = idx > 0;
    const hasNext = idx < images.length - 1;

    overlay.innerHTML = `
      <div class="lightbox-content">
        <div class="lightbox-header">
          <span class="lightbox-filename">${this.esc(a.name)}</span>
          <span class="lightbox-meta">${a.size}${images.length > 1 ? ` · ${idx + 1} of ${images.length}` : ''}</span>
          <button class="lightbox-close" onclick="app.closeLightbox()">&times;</button>
        </div>
        <div class="lightbox-body">
          ${hasPrev ? `<button class="lightbox-nav lightbox-prev" onclick="event.stopPropagation();app.lightboxNav(-1)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>` : ''}
          ${imgContent}
          ${hasNext ? `<button class="lightbox-nav lightbox-next" onclick="event.stopPropagation();app.lightboxNav(1)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>` : ''}
        </div>
      </div>`;
    overlay.classList.add('open');
    // Keyboard nav
    this._lightboxKeyHandler = (e) => {
      if (e.key === 'Escape') this.closeLightbox();
      else if (e.key === 'ArrowLeft' && idx > 0) this.lightboxNav(-1);
      else if (e.key === 'ArrowRight' && idx < images.length - 1) this.lightboxNav(1);
    };
    document.addEventListener('keydown', this._lightboxKeyHandler);
  },

  lightboxNav(dir) {
    this._lightboxIdx += dir;
    this._renderLightbox();
  },

  closeLightbox() {
    const overlay = document.getElementById('lightbox-overlay');
    if (overlay) { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200); }
    if (this._lightboxKeyHandler) {
      document.removeEventListener('keydown', this._lightboxKeyHandler);
      this._lightboxKeyHandler = null;
    }
  },

  // ===== COMMENTS =====
  renderComments(task) {
    const cu = this.getCurrentUser() || this.users[0]; const av = document.getElementById('comment-avatar');
    if (cu) { av.style.background = cu.color; av.textContent = this.initials(cu.name); }
    // Keep comment-list populated for backward compat but hidden
    document.getElementById('comment-list').innerHTML = (task.comments||[]).sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp)).map(c => {
      const u = this.users.find(x => x.id === c.userId);
      return `<div class="comment-item"><div class="comment-avatar" style="background:${u?.color||'#94a3b8'}">${this.initials(u?.name||'?')}</div><div class="comment-body"><div class="comment-header"><span class="comment-author">${this.esc(u?.name||'Unknown')}</span><span class="comment-time">${this.timeAgo(c.timestamp)}</span></div><p class="comment-text">${this.renderMarkdown(c.text)}</p></div></div>`;
    }).join('') || '';
  },

  addComment() {
    if (!this.currentTaskId) return;
    const input = document.getElementById('comment-input'); const text = input.value.trim(); if (!text) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId); if (!task) return;
    task.comments = task.comments || [];
    const commentUser = this.getCurrentUser() || this.users[0];
    task.comments.push({ id: this.generateId(), userId: commentUser?.id || this.currentUserId, text, timestamp: new Date().toISOString() });
    input.value = ''; this.save(); this.renderComments(task); this.renderActivityTimeline(task);
    if (task.assigneeId && task.assigneeId !== commentUser?.id) this.addNotification('comment', `${commentUser?.name} commented on "${task.title}"`, task.id);
    // Notify mentioned users
    const mentions = text.match(/@(\w+(?:\s\w+)?)/g);
    if (mentions) {
      mentions.forEach(m => {
        const name = m.substring(1).toLowerCase();
        const user = this.users.find(u => u.name.toLowerCase().includes(name));
        if (user && user.id !== commentUser?.id) {
          this.addNotification('comment', `${commentUser?.name} mentioned ${user.name} in "${task.title}"`, task.id);
        }
      });
    }
  },

  // ===== PROJECT CRUD =====
  showProjectModal() {
    if (!this.canManageProject()) { this.toast('You do not have permission to manage projects', 'error'); return; }
    this.editingProjectId = null;
    document.getElementById('project-modal-title').textContent = 'New Project';
    document.getElementById('modal-project-name').value = ''; document.getElementById('modal-project-desc').value = '';
    document.getElementById('project-modal-save').textContent = 'Create Project';
    document.querySelectorAll('#color-picker .color-swatch').forEach((s,i) => s.classList.toggle('active', i===0));
    document.getElementById('project-modal-overlay').classList.add('show');
  },

  editProject(id) {
    if (!this.canManageProject()) { this.toast('You do not have permission to manage projects', 'error'); return; }
    const p = this.projects.find(x => x.id === id); if (!p) return;
    this.editingProjectId = id;
    document.getElementById('project-modal-title').textContent = 'Edit Project';
    document.getElementById('modal-project-name').value = p.name; document.getElementById('modal-project-desc').value = p.description||'';
    document.getElementById('project-modal-save').textContent = 'Save Changes';
    document.querySelectorAll('#color-picker .color-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === p.color));
    document.getElementById('project-modal-overlay').classList.add('show');
  },

  closeProjectModal() { document.getElementById('project-modal-overlay').classList.remove('show'); },

  saveProject() {
    const name = document.getElementById('modal-project-name').value.trim(); if (!name) { this.toast('Enter project name','error'); return; }
    const color = document.querySelector('#color-picker .color-swatch.active')?.dataset.color || '#6366f1';
    const desc = document.getElementById('modal-project-desc').value;
    if (this.editingProjectId) { const p = this.projects.find(x => x.id === this.editingProjectId); if (p) { p.name = name; p.color = color; p.description = desc; } }
    else this.projects.push({ id: this.generateId(), name, color, description: desc });
    this.save(); this.closeProjectModal(); this.render();
    this.toast(this.editingProjectId ? 'Project updated' : 'Project created', 'success');
  },

  async deleteProject(id) {
    if (!this.canManageProject()) { this.toast('You do not have permission to manage projects', 'error'); return; }
    if (!await this.confirm('Delete this project? Tasks will be unassigned from it.', 'Delete project', 'Delete')) return;
    this.projects = this.projects.filter(p => p.id !== id);
    this.tasks.forEach(t => { if (t.projectId === id) t.projectId = ''; });
    this.save(); this.render(); this.toast('Project deleted', 'success');
  },

  selectProject(id) { this.selectedProjectId = id; this.switchView('project'); },

  switchFocusTab(tab) {
    document.querySelectorAll('.focus-tab').forEach(t => t.classList.toggle('active', t.dataset.focus === tab));
    document.querySelectorAll('.focus-tab-content').forEach(c => c.classList.toggle('active', c.id === 'focus-' + tab));
  },

  switchMainPanelTab(tabName) {
    // Kept for backward compatibility but no longer used in the panel
    document.querySelectorAll('.panel-main-tab').forEach(t => t.classList.toggle('active', t.dataset.mtab === tabName));
    document.querySelectorAll('.panel-main-tab-content').forEach(c => c.classList.toggle('active', c.id === 'mtab-' + tabName));
  },

  // ===== DEBOUNCE UTILITY =====
  debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
  },

  // ===== AUTO-SAVE =====
  autoSavePanel() {
    if (!this.currentTaskId) return;
    this.saveTaskFromPanel(true);
  },

  // ===== SYNC MORE FIELDS =====
  syncMoreField(type) {
    if (!this.currentTaskId) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task) return;
    if (type === 'effort') {
      const val = document.getElementById('panel-effort-visible').value;
      document.getElementById('panel-effort').value = val;
      task.effort = val;
    } else if (type === 'blocked') {
      const visEl = document.getElementById('panel-blocked-visible');
      const hidEl = document.getElementById('panel-blocked-by');
      // Mirror selection from visible multi-select to hidden one
      Array.from(hidEl.options).forEach((o, i) => { o.selected = visEl.options[i]?.selected || false; });
      task.blockedBy = Array.from(hidEl.selectedOptions).map(o => o.value).filter(Boolean);
    }
    this.save(); this.render();
    const indicator = document.getElementById('panel-saved-indicator');
    if (indicator) { indicator.classList.add('show'); clearTimeout(this._savedTimer); this._savedTimer = setTimeout(() => indicator.classList.remove('show'), 1500); }
  },

  // ===== CONTEXT CHIPS =====
  updateContextChips(task) {
    const statusColors = { 'todo': 'var(--todo)', 'in-progress': 'var(--progress)', 'done': 'var(--done)' };
    const statusNames = {};
    this.boardColumns.forEach(c => { statusNames[c.id] = c.name; });
    document.getElementById('chip-status-dot').style.background = statusColors[task.status] || 'var(--text-light)';
    document.getElementById('chip-status-text').textContent = statusNames[task.status] || task.status;

    // Assignee
    const assignee = this.users.find(u => u.id === task.assigneeId);
    const avatarEl = document.getElementById('chip-assignee-avatar');
    if (assignee) {
      avatarEl.style.background = assignee.color;
      avatarEl.textContent = this.initials(assignee.name);
      avatarEl.style.display = '';
      document.getElementById('chip-assignee-text').textContent = assignee.name.split(' ')[0];
    } else {
      avatarEl.style.display = 'none';
      document.getElementById('chip-assignee-text').textContent = 'Unassigned';
    }

    // Due date
    const dueEl = document.getElementById('chip-due-text');
    const dueChip = document.getElementById('chip-due');
    if (task.dueDate) {
      dueEl.textContent = this.formatDate(task.dueDate);
      const dc = this.dueDateClass(task.dueDate);
      dueChip.className = 'context-chip' + (dc ? ' chip-' + dc : '');
    } else {
      dueEl.textContent = 'No date';
      dueChip.className = 'context-chip chip-muted';
    }

    // Priority
    const priNames = { p0: 'Urgent', p1: 'High', p2: 'Medium', p3: 'Low' };
    const priColors = { p0: '#c0392b', p1: '#e67e22', p2: '#f1c40f', p3: '#95a5a6' };
    document.getElementById('chip-priority-dot').style.background = priColors[task.priority] || 'transparent';
    document.getElementById('chip-priority-text').textContent = priNames[task.priority] || 'No priority';
    document.getElementById('chip-priority').className = 'context-chip' + (task.priority ? '' : ' chip-muted');

    // Project
    const proj = this.projects.find(p => p.id === task.projectId);
    document.getElementById('chip-project-dot').style.background = proj ? proj.color : 'transparent';
    document.getElementById('chip-project-text').textContent = proj ? proj.name : 'No project';
    document.getElementById('chip-project').className = 'context-chip' + (proj ? '' : ' chip-muted');
  },

  cycleChipStatus() {
    if (!this.currentTaskId) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task) return;
    const statuses = this.boardColumns.map(c => c.id);
    const idx = statuses.indexOf(task.status);
    const oldStatus = task.status;
    task.status = statuses[(idx + 1) % statuses.length];
    document.getElementById('panel-status').value = task.status;
    if (oldStatus !== task.status) this._appendActivity(task, `Status changed to ${task.status}`);
    if (task.status === 'done' && oldStatus !== 'done') this.celebrate();
    this.save(); this.updateContextChips(task); this.renderActivityTimeline(task); this.render();
  },

  cycleChipPriority() {
    if (!this.currentTaskId) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task) return;
    const pris = ['', 'p3', 'p2', 'p1', 'p0'];
    const idx = pris.indexOf(task.priority);
    task.priority = pris[(idx + 1) % pris.length];
    document.getElementById('panel-priority').value = task.priority;
    this.save(); this.updateContextChips(task); this.render();
  },

  showChipDropdown(type) {
    const dd = document.getElementById('chip-dropdown');
    const chip = document.getElementById('chip-' + type);
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task) return;

    let html = '';
    if (type === 'assignee') {
      html = this.users.map(u => `<div class="chip-dd-item ${u.id === task.assigneeId ? 'active' : ''}" onclick="app.setChipValue('assignee','${u.id}')">
        <div class="chip-avatar" style="background:${this.safeColor(u.color)}">${this.initials(u.name)}</div> ${this.esc(u.name)}
      </div>`).join('');
      html += `<div class="chip-dd-item ${!task.assigneeId ? 'active' : ''}" onclick="app.setChipValue('assignee','')">Unassigned</div>`;
    } else if (type === 'project') {
      html = this.projects.map(p => `<div class="chip-dd-item ${p.id === task.projectId ? 'active' : ''}" onclick="app.setChipValue('project','${p.id}')">
        <span class="chip-dot" style="background:${p.color}"></span> ${this.esc(p.name)}
      </div>`).join('');
      html += `<div class="chip-dd-item ${!task.projectId ? 'active' : ''}" onclick="app.setChipValue('project','')">No project</div>`;
    } else if (type === 'due') {
      html = `<div style="padding:8px">
        <input type="date" id="chip-date-input" value="${task.dueDate||''}" onchange="app.setChipValue('due',this.value)" class="chip-date-input">
        <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">
          <button class="quickpick-btn" onclick="app.setChipDate('today')">Today</button>
          <button class="quickpick-btn" onclick="app.setChipDate('tomorrow')">Tomorrow</button>
          <button class="quickpick-btn" onclick="app.setChipDate('nextweek')">Next Week</button>
          <button class="quickpick-btn" onclick="app.setChipDate('none')">None</button>
        </div>
      </div>`;
    }

    dd.innerHTML = html;
    const rect = chip.getBoundingClientRect();
    const panelRect = document.querySelector('.panel-main').getBoundingClientRect();
    dd.style.top = (rect.bottom - panelRect.top + 4) + 'px';
    dd.style.left = Math.max(0, rect.left - panelRect.left) + 'px';
    dd.classList.remove('hidden');

    const closeHandler = (e) => {
      if (!dd.contains(e.target) && !chip.contains(e.target)) {
        dd.classList.add('hidden');
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  },

  setChipValue(type, value) {
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task) return;
    if (type === 'assignee') { task.assigneeId = value; document.getElementById('panel-assignee').value = value; }
    else if (type === 'project') { task.projectId = value; document.getElementById('panel-project').value = value; }
    else if (type === 'due') { task.dueDate = value; document.getElementById('panel-due').value = value; }
    document.getElementById('chip-dropdown').classList.add('hidden');
    this.save(); this.updateContextChips(task); this.render();
  },

  setChipDate(preset) {
    const today = new Date(); today.setHours(0,0,0,0);
    let d = '';
    if (preset === 'today') d = today.toISOString().split('T')[0];
    else if (preset === 'tomorrow') { today.setDate(today.getDate()+1); d = today.toISOString().split('T')[0]; }
    else if (preset === 'nextweek') { today.setDate(today.getDate()+7); d = today.toISOString().split('T')[0]; }
    this.setChipValue('due', d);
  },

  // ===== MERGED ACTIVITY TIMELINE =====
  renderActivityTimeline(task) {
    const entries = [];
    (task.comments || []).forEach(c => {
      const user = this.users.find(u => u.id === c.userId);
      entries.push({ type: 'comment', user, text: c.text, time: new Date(c.timestamp), timestamp: c.timestamp });
    });
    (task.activityLog || []).forEach(a => {
      entries.push({ type: 'activity', text: a.text, time: new Date(a.timestamp), timestamp: a.timestamp });
    });
    entries.sort((a, b) => b.time - a.time);

    const html = entries.map(e => {
      if (e.type === 'comment') {
        return `<div class="timeline-entry timeline-comment">
          <div class="timeline-avatar" style="background:${e.user?.color||'var(--text-light)'}">${e.user ? this.initials(e.user.name) : '?'}</div>
          <div class="timeline-body">
            <div class="timeline-header"><strong>${e.user ? this.esc(e.user.name) : 'Unknown'}</strong><span class="timeline-time">${this.timeAgo(e.timestamp)}</span></div>
            <div class="timeline-text">${this.renderMarkdown(this.esc(e.text))}</div>
          </div>
        </div>`;
      } else {
        return `<div class="timeline-entry timeline-activity">
          <div class="timeline-activity-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/></svg></div>
          <span class="timeline-activity-text">${this.esc(e.text)}</span>
          <span class="timeline-time">${this.timeAgo(e.timestamp)}</span>
        </div>`;
      }
    }).join('');

    document.getElementById('activity-timeline').innerHTML = html || '<p style="font-size:12px;color:var(--text-light);padding:4px 0">No activity yet</p>';
  },

  switchProjectView(mode) {
    this.projectViewMode = mode;
    document.querySelectorAll('.project-view-tab').forEach(t => t.classList.toggle('active', t.dataset.pview === mode));
    this.renderProjectView();
  },

  renderProjectView() {
    const proj = this.projects.find(p => p.id === this.selectedProjectId);
    if (!proj) return;
    document.getElementById('project-view-title').textContent = proj.name;
    document.getElementById('page-title').textContent = proj.name;

    const container = document.getElementById('project-view-content');

    if (this.projectViewMode === 'board') {
      // Render board inline in the project view container
      const projTasks = this.tasks.filter(t => this.isRootTask(t) && t.projectId === this.selectedProjectId);
      const dotColors = { 'todo': 'var(--todo)', 'in-progress': 'var(--progress)', 'done': 'var(--done)' };

      container.innerHTML = '<div class="kanban-board" id="project-kanban-board">' + this.boardColumns.map(col => {
        const status = col.id;
        const tasks = projTasks.filter(t => t.status === status).sort((a,b) => (a.order||0) - (b.order||0));
        const dotColor = dotColors[status] || 'var(--text-light)';

        const cardsHtml = tasks.length ? tasks.map(t => {
          const assignee = this.users.find(u => u.id === t.assigneeId);
          const p2 = this.projects.find(p => p.id === t.projectId);
          const si = this.getSubtaskInfo(t);
          const ac = (t.attachments||[]).length;
          const blocked = this.isBlocked(t);
          const labelHtml = (t.labelIds||[]).length ? `<div class="card-labels">${this.renderLabelTags(t.labelIds)}</div>` : '';
          return `<div class="task-card" draggable="true" data-id="${t.id}"
            ondragstart="app.onDragStart(event,'${t.id}')" ondragend="app.onDragEnd(event)"
            onclick="app.openTask('${t.id}')">
            <div class="card-top">
              <span class="card-title ${t.status==='done'?'completed':''}">${this.esc(t.title)}</span>
            </div>
            ${labelHtml}
            ${si.total>0 ? `<div class="card-subtask-bar"><div class="card-subtask-info"><span class="card-subtask-label">${si.done}/${si.total} subtasks</span><span class="card-subtask-label">${si.percent}%</span></div><div class="card-progress-track"><div class="card-progress-fill ${si.percent===100?'complete':''}" style="width:${si.percent}%"></div></div></div>` : ''}
            <div class="card-bottom">
              <div class="card-left">
                ${assignee ? `<div class="card-avatar" style="background:${this.safeColor(assignee.color)}" title="${this.esc(assignee.name)}">${this.initials(assignee.name)}</div>` : ''}
                ${t.dueDate ? `<span class="card-due ${this.dueDateClass(t.dueDate)}" title="${this.formatDateAbsolute(t.dueDate)}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${this.formatDateShort(t.dueDate)}</span>` : ''}
                ${this.priorityBadge(t.priority)}
                ${this.effortBadge(t.effort)}
                ${blocked ? '<span class="blocked-indicator">Blocked</span>' : ''}
              </div>
              <div class="card-right">
                ${ac>0 ? `<span class="card-attachment-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>${ac}</span>` : ''}
              </div>
            </div>
          </div>`;
        }).join('') : '<div class="column-cards-empty">Drag tasks here or click + to add</div>';

        return `<div class="kanban-column" data-status="${status}">
          <div class="column-header">
            <div class="column-title"><span class="column-dot" style="background:${dotColor}"></span>${this.esc(col.name)} <span class="column-count">${tasks.length}</span></div>
            <button class="btn-icon-sm" onclick="app.showTaskModal('${status}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          <div class="column-cards" ondrop="app.onDrop(event,'${status}')" ondragover="app.onDragOver(event)" ondragleave="app.onDragLeave(event)">${cardsHtml}</div>
        </div>`;
      }).join('') + '</div>';
      return;
    }

    if (this.projectViewMode === 'timeline') {
      // Render a simple timeline inline in the project view container
      const projTasks = this.tasks.filter(t => this.isRootTask(t) && t.projectId === this.selectedProjectId && t.dueDate);
      projTasks.sort((a,b) => a.dueDate.localeCompare(b.dueDate));

      if (!projTasks.length) {
        container.innerHTML = '<div class="empty-state-rich"><p>No tasks with due dates in this project</p></div>';
        return;
      }

      const today = new Date(); today.setHours(0,0,0,0);
      const rows = projTasks.map(t => {
        const assignee = this.users.find(u => u.id === t.assigneeId);
        const dueDate = new Date(t.dueDate + 'T00:00:00');
        const diff = Math.round((dueDate - today) / 86400000);
        const barColor = diff < 0 ? 'var(--overdue, #c0392b)' : diff < 2 ? 'var(--soon, #e67e22)' : 'var(--accent)';
        return `<div class="timeline-row" onclick="app.openTask('${t.id}')" style="cursor:pointer">
          <div class="timeline-task-info">
            <span class="timeline-task-name ${t.status==='done'?'completed':''}">${this.esc(t.title)}</span>
            ${assignee ? `<div class="task-avatar-sm" style="background:${this.safeColor(assignee.color)}">${this.initials(assignee.name)}</div>` : ''}
          </div>
          <div class="timeline-bar-area">
            <span class="task-list-due ${this.dueDateClass(t.dueDate)}" title="${this.formatDateAbsolute(t.dueDate)}">${this.formatDate(t.dueDate)}</span>
            ${this.priorityBadge(t.priority)}
          </div>
        </div>`;
      }).join('');

      container.innerHTML = `<div class="project-timeline">${rows}</div>`;
      return;
    }

    // List mode (default)
    let rootTasks = this.tasks.filter(t => this.isRootTask(t) && t.projectId === this.selectedProjectId);
    const sortPref = this.sortPref || 'status';
    if (sortPref === 'status') rootTasks.sort((a,b) => { const o = {'in-progress':0,todo:1,done:2}; return (o[a.status]??1) - (o[b.status]??1); });
    else if (sortPref === 'due') rootTasks.sort((a,b) => { if (!a.dueDate && !b.dueDate) return 0; if (!a.dueDate) return 1; if (!b.dueDate) return -1; return a.dueDate.localeCompare(b.dueDate); });
    else if (sortPref === 'priority') rootTasks.sort((a,b) => { const o = {p0:0,p1:1,p2:2,p3:3,'':4}; return (o[a.priority]??4) - (o[b.priority]??4); });
    else if (sortPref === 'alpha') rootTasks.sort((a,b) => a.title.localeCompare(b.title));
    else if (sortPref === 'created') rootTasks.sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));

    const renderTaskRow = (t, level, parentTask) => {
      const assignee = this.users.find(u => u.id === t.assigneeId);
      const proj2 = this.projects.find(p => p.id === t.projectId);
      const si = this.getSubtaskInfo(t);
      const ac = (t.attachments||[]).length;
      const children = this.getChildren(t.id);
      const hasChildren = children.length > 0;
      const isCollapsed = !this.expandedTasks.includes(t.id);
      const indent = level * 24 + 12;

      const showPriority = level > 0 && parentTask ? (t.priority && t.priority !== parentTask.priority) : !!t.priority;
      const showProject = level > 0 && parentTask ? (proj2 && t.projectId !== parentTask.projectId) : !!proj2;
      const showEffort = !!(t.effort);
      const filteredLabelIds = level > 0 && parentTask ? (t.labelIds||[]).filter(lid => !(parentTask.labelIds||[]).includes(lid)) : (t.labelIds||[]);
      const hasMeta = showPriority || showProject || t.dueDate || filteredLabelIds.length || showEffort;

      let html = `<div class="task-list-item" data-task-id="${t.id}" data-level="${level}" onclick="app.openTask('${t.id}')">
        <div class="task-list-row" style="padding-left:${indent}px">
          ${hasChildren ? `<button class="task-tree-toggle ${isCollapsed?'collapsed':''}" title="Expand/Collapse subtasks" onclick="event.stopPropagation();app.toggleTreeCollapse('${t.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>` : '<span class="task-tree-spacer"></span>'}
          <div class="task-list-info-wrap">
            <div class="task-check ${t.status==='done'?'done':''}" onclick="event.stopPropagation();app.toggleTaskStatus('${t.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="task-list-info"><span class="task-list-name ${t.status==='done'?'completed':''}">${this.esc(t.title)}</span></div>
          </div>
          <div class="task-list-right">
            ${si.total>0 ? `<span class="task-subtask-badge" title="${si.done} of ${si.total} subtasks completed">${si.done}/${si.total}</span>` : ''}
            ${ac>0 ? '<span class="task-attachment-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span>' : ''}
            ${assignee ? `<div class="task-avatar-sm" style="background:${this.safeColor(assignee.color)}" title="${this.esc(assignee.name)}">${this.initials(assignee.name)}</div>` : ''}
          </div>
        </div>
        ${hasMeta ? `<div class="task-list-meta" style="padding-left:${indent + 20 + 16 + 18 + 24}px">
            ${showPriority ? this.priorityBadge(t.priority) : ''}
            ${showProject && proj2 ? `<span class="task-list-project" style="background:${this.safeColor(proj2.color)}20;color:${this.safeColor(proj2.color)}">${this.esc(proj2.name)}</span>` : ''}
            ${t.dueDate ? `<span class="task-list-due ${this.dueDateClass(t.dueDate)}" title="${this.formatDateAbsolute(t.dueDate)}">${this.formatDate(t.dueDate)}</span>` : ''}
            ${t.dueDate && this.dueDateClass(t.dueDate) === 'overdue' && t.status !== 'done' ? `<button class="rescue-btn" onclick="event.stopPropagation();app.rescueTask('${t.id}')" title="Reschedule to today">\u2192 Today</button>` : ''}
            ${showEffort ? this.effortBadge(t.effort) : ''}
            ${this.renderLabelTags(filteredLabelIds)}
          </div>` : ''}
      </div>`;

      if (hasChildren && !isCollapsed) {
        children.forEach(c => { html += renderTaskRow(c, level + 1, t); });
      }
      return html;
    };

    container.innerHTML = rootTasks.length
      ? '<div class="task-list-view">' + rootTasks.map(t => renderTaskRow(t, 0, null)).join('') + '</div>'
      : `<div class="empty-state-rich">
          <p>This project is waiting for its first task</p>
          <button class="btn-primary" onclick="app.showTaskModal()">Add a task</button>
        </div>`;
  },

  // ===== USER CRUD =====
  showUserModal() {
    this.editingUserId = null;
    document.getElementById('user-modal-title').textContent = 'Add Team Member';
    document.getElementById('modal-user-name').value = ''; document.getElementById('modal-user-email').value = '';
    document.getElementById('modal-user-role').value = 'member';
    document.getElementById('user-modal-save').textContent = 'Add Member';
    document.querySelectorAll('#user-color-picker .color-swatch').forEach((s,i) => s.classList.toggle('active', i===0));
    document.getElementById('user-modal-overlay').classList.add('show');
  },

  editUser(id) {
    const u = this.users.find(x => x.id === id); if (!u) return;
    this.editingUserId = id;
    document.getElementById('user-modal-title').textContent = 'Edit Member';
    document.getElementById('modal-user-name').value = u.name; document.getElementById('modal-user-email').value = u.email;
    document.getElementById('modal-user-role').value = u.role;
    document.getElementById('user-modal-save').textContent = 'Save Changes';
    document.querySelectorAll('#user-color-picker .color-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === u.color));
    document.getElementById('user-modal-overlay').classList.add('show');
  },

  closeUserModal() { document.getElementById('user-modal-overlay').classList.remove('show'); },

  async saveUser() {
    const name = document.getElementById('modal-user-name').value.trim();
    const email = document.getElementById('modal-user-email').value.trim();
    if (!name) { this.toast('Enter a name', 'error'); return; }
    if (!email) { this.toast('Enter an email', 'error'); return; }
    const color = document.querySelector('#user-color-picker .color-swatch.active')?.dataset.color || '#6366f1';
    const role = document.getElementById('modal-user-role').value;
    if (this.editingUserId) {
      const u = this.users.find(x => x.id === this.editingUserId);
      if (u) { u.name = name; u.email = email; u.role = role; u.color = color; }
      this.save(); this.closeUserModal(); this.render();
      if (this.currentView === 'settings') this.renderSettingsUsers();
      this.toast('Member updated', 'success');
    } else {
      // Generate a random temporary password for the new PocketBase user
      const tempPass = Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-6).toUpperCase() + '1!';
      try {
        const record = await pb.collection('users').create({ name, email, role, color, password: tempPass, passwordConfirm: tempPass });
        this.users.push({ id: record.id, name, email, role, color });
        this.save(); this.closeUserModal(); this.render();
        if (this.currentView === 'settings') this.renderSettingsUsers();
        this.showTempPwModal(email, tempPass);
      } catch(e) {
        this.toast('Failed to create member: ' + (e.message || 'unknown error'), 'error');
      }
    }
  },

  // ===== CONFIRMATION MODAL (replaces confirm()) =====
  // Usage: if (await this.confirm('Delete this item?')) { ... }
  confirm(message, title = 'Are you sure?', okLabel = 'Confirm', okClass = 'btn-danger') {
    return new Promise(resolve => {
      this._confirmResolve = (result) => {
        document.getElementById('confirm-modal-overlay')?.classList.remove('show');
        this._confirmResolve = null;
        resolve(result);
      };
      const overlay = document.getElementById('confirm-modal-overlay');
      if (!overlay) { resolve(window.confirm(message)); return; } // graceful fallback
      document.getElementById('confirm-modal-title').textContent = title;
      document.getElementById('confirm-modal-message').textContent = message;
      const okBtn = document.getElementById('confirm-modal-ok');
      okBtn.textContent = okLabel;
      okBtn.className = `${okClass}`;
      overlay.classList.add('show');
    });
  },
  _confirmResolve: null,

  showTempPwModal(email, password) {
    this._tempPwEmail = email;
    this._tempPwPassword = password;
    document.getElementById('temp-pw-email').textContent = email;
    document.getElementById('temp-pw-value').textContent = password;
    document.getElementById('temp-pw-modal-overlay').classList.add('show');
  },
  closeTempPwModal() {
    document.getElementById('temp-pw-modal-overlay')?.classList.remove('show');
    this._tempPwEmail = null;
    this._tempPwPassword = null;
  },
  copyTempField(field) {
    const text = field === 'email' ? this._tempPwEmail : this._tempPwPassword;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => this.toast('Copied to clipboard'));
  },

  async deleteUser(id) {
    if (this.users.length <= 1) { this.toast('Cannot remove last member', 'error'); return; }
    if (!await this.confirm('Remove this member? Their tasks will be unassigned.', 'Remove member', 'Remove')) return;
    try {
      await pb.collection('users').delete(id);
    } catch(e) {
      this.toast('Failed to remove member from server: ' + (e.message || 'unknown error'), 'error');
      console.warn('PB delete user:', e.message);
      return;
    }
    this.users = this.users.filter(u => u.id !== id);
    this.tasks.forEach(t => { if (t.assigneeId === id) t.assigneeId = ''; });
    this.save(); this.render(); this.toast('Member removed', 'success');
  },

  // ===== QUICK ADD (NLP) =====
  quickAdd(text) {
    if (!text.trim()) return;
    let title = text, assigneeId = this.currentUserId, projectId = '', priority = '', dueDate = '';
    const labelIds = [];

    // Extract priority (natural language + p0-p3)
    if (/\b(urgent|critical)\b/i.test(title)) { priority = 'p0'; title = title.replace(/\b(urgent|critical)\b/i, ''); }
    else if (/\bhigh\s*(pri|priority)?\b/i.test(title)) { priority = 'p1'; title = title.replace(/\bhigh\s*(pri|priority)?\b/i, ''); }
    else if (/\bmedium\s*(pri|priority)?\b/i.test(title)) { priority = 'p2'; title = title.replace(/\bmedium\s*(pri|priority)?\b/i, ''); }
    else if (/\blow\s*(pri|priority)?\b/i.test(title)) { priority = 'p3'; title = title.replace(/\blow\s*(pri|priority)?\b/i, ''); }
    else {
      const prioMatch = title.match(/\b(p[0-3])\b/i);
      if (prioMatch) { priority = prioMatch[1].toLowerCase(); title = title.replace(/\bp[0-3]\b/i, ''); }
    }

    // Extract project @mention (match against existing project names)
    const projMatch = title.match(/@([\w\s]+?)(?=\s+(?:by|due|for|urgent|high|low|medium|assign|$)|\s*$)/i);
    if (projMatch) {
      const pName = projMatch[1].trim().toLowerCase();
      const proj = this.projects.find(p => p.name.toLowerCase().includes(pName));
      if (proj) { projectId = proj.id; title = title.replace(/@[\w\s]+?(?=\s+(?:by|due|for|urgent|high|low|medium|assign|$)|\s*$)/i, ''); }
    }

    // Parse #project (legacy syntax)
    if (!projectId) {
      const hashMatch = title.match(/#([\w-]+)/);
      if (hashMatch) {
        const pname = hashMatch[1].toLowerCase().replace(/-/g, ' ');
        const proj = this.projects.find(p => p.name.toLowerCase().includes(pname));
        if (proj) { projectId = proj.id; title = title.replace(/#[\w-]+/, ''); }
      }
    }

    // Extract assignee "for Name" or "assign to Name"
    const assignMatch = title.match(/\b(?:for|assign\s+to)\s+(\w+)\b/i);
    if (assignMatch) {
      const aName = assignMatch[1].toLowerCase();
      const user = this.users.find(u => u.name.toLowerCase().split(' ')[0] === aName);
      if (user) { assigneeId = user.id; title = title.replace(/\b(?:for|assign\s+to)\s+\w+\b/i, ''); }
    }

    // Parse @name (legacy: assign to user)
    if (assigneeId === this.currentUserId) {
      const atMatch = title.match(/@(\w+)/);
      if (atMatch && !projectId) {
        const name = atMatch[1].toLowerCase();
        const user = this.users.find(u => u.name.toLowerCase().includes(name));
        if (user) { assigneeId = user.id; title = title.replace(/@\w+/, ''); }
      }
    }

    // Extract due date (natural language)
    const today = new Date(); today.setHours(0,0,0,0);
    if (/\b(by |due )?(today)\b/i.test(title)) { dueDate = today.toISOString().split('T')[0]; title = title.replace(/\b(by |due )?(today)\b/i, ''); }
    else if (/\b(by |due )?(tomorrow)\b/i.test(title)) { const d = new Date(today); d.setDate(d.getDate()+1); dueDate = d.toISOString().split('T')[0]; title = title.replace(/\b(by |due )?(tomorrow)\b/i, ''); }
    else if (/\b(by |due )?(next week)\b/i.test(title)) { const d = new Date(today); d.setDate(d.getDate()+7); dueDate = d.toISOString().split('T')[0]; title = title.replace(/\b(by |due )?(next week)\b/i, ''); }
    else if (/\b(by |due )?(friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/i.test(title)) {
      const dayMatch = title.match(/\b(by |due )?(friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/i);
      const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const targetDay = dayNames.indexOf(dayMatch[2].toLowerCase());
      const d = new Date(today);
      const diff = (targetDay - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      dueDate = d.toISOString().split('T')[0];
      title = title.replace(/\b(by |due )?(friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/i, '');
    }
    else if (/\b(by |due )\s*(\w+ \d{1,2})\b/i.test(title)) {
      const dateMatch = title.match(/\b(by |due )\s*(\w+ \d{1,2})\b/i);
      const parsed = new Date(dateMatch[2] + ' ' + new Date().getFullYear());
      if (!isNaN(parsed)) { dueDate = parsed.toISOString().split('T')[0]; title = title.replace(/\b(by |due )\s*\w+ \d{1,2}\b/i, ''); }
    }
    else {
      const dueMatch = title.match(/due\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}-\d{2}-\d{2})/i);
      if (dueMatch) {
        const val = dueMatch[1].toLowerCase();
        const now = new Date();
        if (val === 'today') dueDate = now.toISOString().split('T')[0];
        else if (val === 'tomorrow') { now.setDate(now.getDate()+1); dueDate = now.toISOString().split('T')[0]; }
        else if (/^\d{4}/.test(val)) dueDate = val;
        else {
          const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
          const target = days.indexOf(val);
          if (target >= 0) { const diff2 = (target - now.getDay() + 7) % 7 || 7; now.setDate(now.getDate()+diff2); dueDate = now.toISOString().split('T')[0]; }
        }
        title = title.replace(/due\s+\S+/i, '');
      }
    }

    // Parse labels (words matching label names)
    this.labels.forEach(l => {
      const re = new RegExp('\\b' + l.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(title)) { labelIds.push(l.id); title = title.replace(re, '').trim(); }
    });

    title = title.replace(/\s+/g, ' ').trim();
    if (!title) { this.toast('Please enter a task title'); return; }

    // Auto-select project if in project view
    if (!projectId && this.currentView === 'project' && this.selectedProjectId) {
      projectId = this.selectedProjectId;
    }
    // Auto-select single project if none parsed
    if (!projectId && this.projects.length === 1) projectId = this.projects[0].id;

    this.tasks.push({
      id: this.generateId(), title, description: '', status: 'todo', projectId, assigneeId, dueDate, priority,
      labelIds, blockedBy: [], order: this.tasks.filter(t => t.status === 'todo').length,
      parentId: '', deliverables: [], attachments: [], comments: [],
      activityLog: [{ text: 'Task created via quick add', timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString().split('T')[0]
    });

    this.save(); this.render();
    this.toast(`Task "${title}" created`, 'success');
  },

  // ===== BULK IMPORT =====
  showBulkImport() {
    const sel = document.getElementById('bulk-import-project');
    sel.innerHTML = '<option value="">No project</option>' + this.projects.map(p => `<option value="${p.id}">${this.esc(p.name)}</option>`).join('');
    if (this.projects.length === 1) sel.value = this.projects[0].id;
    document.getElementById('bulk-import-text').value = '';
    document.getElementById('bulk-import-overlay').classList.add('show');
    setTimeout(() => document.getElementById('bulk-import-text').focus(), 100);
  },

  closeBulkImport() { document.getElementById('bulk-import-overlay').classList.remove('show'); },

  executeBulkImport() {
    const text = document.getElementById('bulk-import-text').value;
    const projectId = document.getElementById('bulk-import-project').value;
    if (!text.trim()) { this.toast('Paste some tasks first', 'error'); return; }

    const lines = text.split('\n').filter(l => l.trim());
    if (!lines.length) { this.toast('No tasks found', 'error'); return; }

    // Parse indentation to determine nesting level
    const parsed = lines.map(line => {
      // Strip markdown list markers: -, *, numbers
      const raw = line;
      // Count leading whitespace (tabs=2 spaces each)
      const expanded = raw.replace(/\t/g, '  ');
      const leadingSpaces = expanded.match(/^(\s*)/)[1].length;
      // Remove list markers
      let title = expanded.trim().replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
      // Remove markdown checkbox markers
      title = title.replace(/^\[[ x]\]\s*/i, '').trim();
      if (!title) return null;
      return { title, indent: Math.floor(leadingSpaces / 2) };
    }).filter(Boolean);

    if (!parsed.length) { this.toast('No valid tasks found', 'error'); return; }

    // Normalize: make sure first item is at level 0
    const minIndent = Math.min(...parsed.map(p => p.indent));
    parsed.forEach(p => p.indent = Math.min(p.indent - minIndent, 4)); // cap at 5 levels (0-4)

    // Build tree by tracking parent stack
    const parentStack = []; // { id, level }
    let created = 0;

    parsed.forEach(item => {
      // Pop parent stack until we find a parent at lower level
      while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= item.indent) {
        parentStack.pop();
      }

      const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].id : '';
      const siblings = this.tasks.filter(t => (t.parentId || '') === parentId);

      const task = {
        id: this.generateId(),
        title: item.title, description: '', status: 'todo',
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
    this.toast(`Imported ${created} tasks`, 'success');
  },

  // ===== BULK ACTIONS =====
  toggleSelect(taskId) {
    if (this.selectedTasks.includes(taskId)) (this.selectedTasks = this.selectedTasks.filter(_i=>_i!==(taskId)));
    else (this.selectedTasks.includes(taskId)||this.selectedTasks.push(taskId));
    this.renderMyTasks();
  },

  clearSelection() { (this.selectedTasks = []); if (this.currentView === 'my-tasks') this.renderMyTasks(); else if (this.currentView === 'board') this.renderBoard(); this.updateBulkBar(); },

  updateBulkBar() {
    const bar = document.getElementById('bulk-bar');
    const show = this.selectedTasks.length > 0;
    bar.classList.toggle('show', show);
    document.getElementById('bulk-count-num').textContent = this.selectedTasks.length;
  },

  bulkMove(status) {
    this.pushUndo('Bulk move');
    const count = this.selectedTasks.length;
    this.selectedTasks.forEach(id => {
      const t = this.tasks.find(x => x.id === id);
      if (t) { t.status = status; this._appendActivity(t, `Bulk moved to ${status}`); }
    });
    if (status === 'done') this.celebrate();
    this.clearSelection(); this.render(); this.save();
    this.toast(`Moved ${count || 'tasks'} to ${status}`,'success');
  },

  showBulkAssign() {
    const name = prompt('Enter team member name:');
    if (!name) return;
    const user = this.users.find(u => u.name.toLowerCase().includes(name.toLowerCase()));
    if (!user) { this.toast('User not found','error'); return; }
    this.selectedTasks.forEach(id => { const t = this.tasks.find(x => x.id === id); if (t) t.assigneeId = user.id; });
    this.save(); this.clearSelection(); this.render();
    this.toast(`Assigned to ${user.name}`,'success');
  },

  async bulkDelete() {
    if (!await this.confirm(`Delete ${this.selectedTasks.length} selected tasks and their subtasks?`, 'Delete tasks', 'Delete')) return;
    this.pushUndo('Bulk delete');
    // Also delete descendants of selected tasks
    const toDelete = [...this.selectedTasks];
    const addDescendants = (id) => {
      this.tasks.filter(t => t.parentId === id).forEach(c => { toDelete.add(c.id); addDescendants(c.id); });
    };
    this.selectedTasks.forEach(id => addDescendants(id));
    this.tasks = this.tasks.filter(t => !toDelete.has(t.id));
    this.tasks.forEach(t => { if (t.blockedBy?.length) t.blockedBy = t.blockedBy.filter(id => !toDelete.has(id)); });
    this.clearSelection(); this.render(); this.save();
    this.toastUndo('Tasks deleted', () => this.undo());
  },

  // ===== COMMAND PALETTE =====
  openCommandPalette() {
    document.getElementById('cmd-overlay').classList.add('show');
    const input = document.getElementById('cmd-input');
    input.value = ''; input.focus();
    this.cmdSelectedIndex = 0;
    this.updateCommandResults();
  },

  closeCommandPalette() { document.getElementById('cmd-overlay').classList.remove('show'); },

  updateCommandResults() {
    const q = document.getElementById('cmd-input').value.toLowerCase();
    let results = [];

    // Actions
    const actions = [
      { title: 'New Task', desc: 'Create a new task', action: () => { this.closeCommandPalette(); this.showTaskModal(); } },
      { title: 'Toggle Dark Mode', desc: 'Switch between light and dark', action: () => { this.closeCommandPalette(); this.toggleTheme(); } },
      { title: 'Go to Board', desc: 'Switch to board view', action: () => { this.closeCommandPalette(); this.switchView('board'); } },
      { title: 'Go to Timeline', desc: 'Switch to timeline view', action: () => { this.closeCommandPalette(); this.switchView('timeline'); } },
      { title: 'Go to Analytics', desc: 'View analytics', action: () => { this.closeCommandPalette(); this.switchView('analytics'); } },
      { title: 'Go to Workload', desc: 'View team workload', action: () => { this.closeCommandPalette(); this.switchView('workload'); } },
      { title: 'Manage Labels', desc: 'Add or remove labels', action: () => { this.closeCommandPalette(); this.showLabelModal(); } },
      { title: 'New Project', desc: 'Create a new project', action: () => { this.closeCommandPalette(); this.showProjectModal(); } },
    ];

    // Tasks
    const taskResults = this.tasks.filter(t => !q || t.title.toLowerCase().includes(q)).slice(0,8).map(t => ({
      title: t.title, desc: this.projects.find(p => p.id === t.projectId)?.name || '', type: 'task',
      action: () => { this.closeCommandPalette(); this.openTask(t.id); }
    }));

    // Projects
    const projResults = this.projects.filter(p => !q || p.name.toLowerCase().includes(q)).map(p => ({
      title: p.name, desc: 'Project', type: 'project',
      action: () => { this.closeCommandPalette(); this.selectProject(p.id); }
    }));

    // Users
    const userResults = this.users.filter(u => !q || u.name.toLowerCase().includes(q)).map(u => ({
      title: u.name, desc: u.role, type: 'user', action: () => { this.closeCommandPalette(); }
    }));

    const actionResults = actions.filter(a => !q || a.title.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)).map(a => ({ ...a, type: 'action' }));

    results = [...actionResults, ...taskResults, ...projResults, ...userResults].slice(0, 12);
    this._cmdResults = results;
    this.cmdSelectedIndex = Math.min(this.cmdSelectedIndex, results.length - 1);

    const icons = { task: '<div class="cmd-item-icon task">T</div>', project: '<div class="cmd-item-icon project">P</div>', action: '<div class="cmd-item-icon action">&#9889;</div>', user: '<div class="cmd-item-icon user">U</div>' };

    document.getElementById('cmd-results').innerHTML = results.length ? results.map((r, i) => `
      <div class="cmd-item ${i === this.cmdSelectedIndex ? 'active' : ''}" onmouseenter="app.cmdSelectedIndex=${i};app.highlightCmd()" onclick="app._cmdResults[${i}].action()">
        ${icons[r.type]||icons.action}
        <div class="cmd-item-info"><div class="cmd-item-title">${this.esc(r.title)}</div>${r.desc ? `<div class="cmd-item-desc">${this.esc(r.desc)}</div>` : ''}</div>
      </div>`).join('') : '<div class="empty-state" style="padding:30px"><p>No results</p></div>';
  },

  cmdNavigate(dir) {
    this.cmdSelectedIndex = Math.max(0, Math.min((this._cmdResults||[]).length - 1, this.cmdSelectedIndex + dir));
    this.highlightCmd();
  },

  highlightCmd() {
    document.querySelectorAll('.cmd-item').forEach((el, i) => el.classList.toggle('active', i === this.cmdSelectedIndex));
    const active = document.querySelector('.cmd-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  },

  cmdSelect() {
    if (this._cmdResults && this._cmdResults[this.cmdSelectedIndex]) this._cmdResults[this.cmdSelectedIndex].action();
  },

  // ===== CELEBRATION (Confetti) =====
  celebrate() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#6366f1','#f59e0b','#22c55e','#f43f5e','#3b82f6','#a855f7','#14b8a6'];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05;
        p.rot += p.rotV;
        if (frame > 60) p.opacity -= 0.015;
        if (p.opacity <= 0) return;
        alive = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        ctx.restore();
      });

      frame++;
      if (alive && frame < 180) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    animate();
  },

  toast(msg, type = '') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; setTimeout(() => t.remove(), 400); }, 3000);
  },

  toastUndo(msg, undoFn) {
    const c = document.getElementById('undo-toast-container');
    const t = document.createElement('div'); t.className = 'undo-toast';
    t.innerHTML = `<span>${this.esc(msg)}</span><button class="undo-btn">Undo</button>`;
    const btn = t.querySelector('.undo-btn');
    btn.addEventListener('click', () => { undoFn(); t.remove(); });
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; setTimeout(() => t.remove(), 400); }, 5000);
  },

  toastWithAction(msg, btnText, action) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast toast-with-action';
    t.innerHTML = `<span>${msg}</span><button class="toast-action-btn">${btnText}</button>`;
    t.querySelector('.toast-action-btn').addEventListener('click', (e) => { action(); t.remove(); });
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; setTimeout(() => t.remove(), 400); }, 5000);
  },

  suggestNextTask(completedTask) {
    // Check sibling subtasks first
    if (completedTask.parentId) {
      const siblings = this.getChildren(completedTask.parentId).filter(t => t.id !== completedTask.id && t.status !== 'done');
      if (siblings.length) return siblings[0];
    }
    // Otherwise suggest highest priority due soonest
    const candidates = this.tasks.filter(t => t.assigneeId === this.currentUserId && t.status !== 'done' && t.id !== completedTask.id);
    candidates.sort((a, b) => {
      const pOrd = { p0: 0, p1: 1, p2: 2, p3: 3, '': 4 };
      if ((pOrd[a.priority] ?? 4) !== (pOrd[b.priority] ?? 4)) return (pOrd[a.priority] ?? 4) - (pOrd[b.priority] ?? 4);
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      return 1;
    });
    return candidates[0] || null;
  },

  rescueTask(taskId) {
    const t = this.tasks.find(x => x.id === taskId);
    if (!t) return;
    t.dueDate = new Date().toISOString().split('T')[0];
    this.save(); this.render();
    this.toast('Rescheduled to today');
  },

  // ===== FEATURE 1: UNDO/REDO =====
  pushUndo(label) {
    // Store snapshot of tasks before mutation
    this.undoStack = [{ label, tasks: JSON.parse(JSON.stringify(this.tasks)) }];
  },

  undo() {
    if (!this.undoStack.length) { this.toast('Nothing to undo'); return; }
    const snap = this.undoStack.pop();
    this.tasks = snap.tasks;
    this.save();
    this.render();
    this.toast('Undone: ' + snap.label, 'success');
  },

  // ===== FEATURE 2: INLINE EDITING =====
  startInlineEdit(event, taskId) {
    event.stopPropagation();
    const span = event.target;
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-list-name-input';
    input.value = task.title;
    span.replaceWith(input);
    input.focus();
    input.select();
    const finish = (save) => {
      if (save) {
        const val = input.value.trim();
        if (val) task.title = val;
        this.save();
      }
      this.renderMyTasks();
    };
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
  },

  // ===== FEATURE 6: QUICK DATE PICKS =====
  setQuickDate(inputId, value) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const d = new Date();
    if (value === 'today') input.value = d.toISOString().split('T')[0];
    else if (value === 'tomorrow') { d.setDate(d.getDate() + 1); input.value = d.toISOString().split('T')[0]; }
    else if (value === 'nextweek') { d.setDate(d.getDate() + (8 - d.getDay()) % 7 || 7); input.value = d.toISOString().split('T')[0]; }
    else if (value === 'none') input.value = '';
    // Trigger change for panel auto-save
    input.dispatchEvent(new Event('change'));
  },

  // ===== FEATURE 7: SORTING =====
  loadSortPref() {
    this.sortPref = localStorage.getItem('fb_sort') || 'status';
    const sel = document.getElementById('sort-select');
    if (sel) sel.value = this.sortPref;
  },
  saveSortPref() {
    localStorage.setItem('fb_sort', this.sortPref);
  },

  // ===== FEATURE 8: BREADCRUMB =====
  renderBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    let html = '';
    const titles = { home: 'Home', 'my-tasks': 'My Tasks', board: 'Board', timeline: 'Timeline', analytics: 'Analytics', workload: 'Workload', project: 'Project' };
    // Check active project filter
    let projName = '';
    if (this.currentView === 'project') {
      const p = this.projects.find(x => x.id === this.selectedProjectId);
      if (p) projName = p.name;
    } else if (this.currentView === 'my-tasks') {
      const fProj = document.getElementById('filter-project')?.value;
      if (fProj) { const p = this.projects.find(x => x.id === fProj); if (p) projName = p.name; }
    } else if (this.currentView === 'board') {
      const fProj = document.getElementById('board-project-select')?.value;
      if (fProj) { const p = this.projects.find(x => x.id === fProj); if (p) projName = p.name; }
    }
    if (projName) {
      html = `<a onclick="app.switchView('${this.currentView}')">${titles[this.currentView]}</a><span class="breadcrumb-sep">\u203A</span><span>${this.esc(projName)}</span>`;
    }
    // Panel open with child task
    if (this.currentTaskId) {
      const task = this.tasks.find(t => t.id === this.currentTaskId);
      if (task && task.parentId) {
        const parent = this.tasks.find(t => t.id === task.parentId);
        if (parent) {
          html = `<span>Task</span><span class="breadcrumb-sep">\u203A</span><a onclick="app.openTask('${parent.id}')">${this.esc(parent.title)}</a><span class="breadcrumb-sep">\u203A</span><span>${this.esc(task.title)}</span>`;
        }
      }
    }
    bc.innerHTML = html;
  },

  // ===== FEATURE 9: NAV BADGES =====
  renderNavBadges() {
    const taskBadge = document.getElementById('nav-badge-tasks');
    const boardBadge = document.getElementById('nav-badge-board');
    if (taskBadge) {
      const count = this.tasks.filter(t => t.status !== 'done' && this.isRootTask(t)).length;
      taskBadge.textContent = count;
      taskBadge.classList.toggle('visible', count > 0);
    }
    if (boardBadge) {
      const count = this.tasks.filter(t => t.status === 'in-progress' && this.isRootTask(t)).length;
      boardBadge.textContent = count;
      boardBadge.classList.toggle('visible', count > 0);
    }
  },

  // ===== FEATURE 11: TIMELINE DRAG =====
  initTimelineDrag(barEl, taskId) {
    // This is called from renderTimeline for each bar
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    let tooltip = null;
    const showTooltip = (text, x, y) => {
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'timeline-drag-tooltip';
        document.body.appendChild(tooltip);
      }
      tooltip.textContent = text;
      tooltip.style.left = x + 'px';
      tooltip.style.top = (y - 30) + 'px';
    };
    const hideTooltip = () => { if (tooltip) { tooltip.remove(); tooltip = null; } };

    // Right edge for resize
    const rightEdge = document.createElement('div');
    rightEdge.className = 'timeline-bar-edge right';
    barEl.appendChild(rightEdge);

    rightEdge.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = barEl.offsetWidth;
      const cellW = 40;
      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const newWidth = Math.max(cellW, startWidth + dx);
        barEl.style.width = newWidth + 'px';
        const daysDelta = Math.round((newWidth - startWidth) / cellW);
        const nd = new Date(task.dueDate + 'T00:00:00');
        nd.setDate(nd.getDate() + daysDelta);
        showTooltip(nd.toLocaleDateString('en', {month:'short',day:'numeric'}), ev.clientX, ev.clientY);
      };
      const onUp = (ev) => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        hideTooltip();
        const dx = ev.clientX - startX;
        const daysDelta = Math.round(dx / cellW);
        if (daysDelta !== 0) {
          const nd = new Date(task.dueDate + 'T00:00:00');
          nd.setDate(nd.getDate() + daysDelta);
          task.dueDate = nd.toISOString().split('T')[0];
          this.save();
          this.renderTimeline();
        }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Whole bar drag for moving
    barEl.addEventListener('mousedown', (e) => {
      if (e.target === rightEdge) return;
      e.preventDefault();
      const startX = e.clientX;
      const startLeft = parseInt(barEl.style.left) || 0;
      const cellW = 40;
      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        barEl.style.left = (startLeft + dx) + 'px';
        const daysDelta = Math.round(dx / cellW);
        const nd = new Date(task.dueDate + 'T00:00:00');
        nd.setDate(nd.getDate() + daysDelta);
        showTooltip(nd.toLocaleDateString('en', {month:'short',day:'numeric'}), ev.clientX, ev.clientY);
      };
      const onUp = (ev) => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        hideTooltip();
        const dx = ev.clientX - startX;
        const daysDelta = Math.round(dx / cellW);
        if (daysDelta !== 0) {
          const nd = new Date(task.dueDate + 'T00:00:00');
          nd.setDate(nd.getDate() + daysDelta);
          task.dueDate = nd.toISOString().split('T')[0];
          if (task.createdAt) {
            const nc = new Date(task.createdAt + 'T00:00:00');
            nc.setDate(nc.getDate() + daysDelta);
            task.createdAt = nc.toISOString().split('T')[0];
          }
          this.save();
          this.renderTimeline();
        }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  },

  // ===== FEATURE 12: BOARD MULTI-SELECT =====
  handleBoardCardClick(event, taskId) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      if (this.selectedTasks.includes(taskId)) (this.selectedTasks = this.selectedTasks.filter(_i=>_i!==(taskId)));
      else (this.selectedTasks.includes(taskId)||this.selectedTasks.push(taskId));
      this.renderBoard();
      this.updateBulkBar();
      return;
    }
    if (event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      // Select range within same column
      const card = event.currentTarget;
      const col = card.closest('.column-cards');
      if (col) {
        const cards = Array.from(col.querySelectorAll('.task-card'));
        const ids = cards.map(c => c.dataset.id);
        const clickedIdx = ids.indexOf(taskId);
        // Find last selected in this column
        let lastIdx = -1;
        ids.forEach((id, i) => { if (this.selectedTasks.includes(id)) lastIdx = i; });
        if (lastIdx >= 0) {
          const from = Math.min(lastIdx, clickedIdx);
          const to = Math.max(lastIdx, clickedIdx);
          for (let i = from; i <= to; i++) (this.selectedTasks.includes(ids[i])||this.selectedTasks.push(ids[i]));
        } else {
          (this.selectedTasks.includes(taskId)||this.selectedTasks.push(taskId));
        }
      }
      this.renderBoard();
      this.updateBulkBar();
      return;
    }
    this.openTask(taskId);
  },

  // ===== FEATURE 13: @MENTIONS =====
  _mentionQuery: '',
  _mentionStart: -1,
  _mentionIdx: 0,

  handleMentionInput(e) {
    const textarea = e.target;
    const val = textarea.value;
    const pos = textarea.selectionStart;
    // Find @ before cursor
    const before = val.substring(0, pos);
    const atIdx = before.lastIndexOf('@');
    if (atIdx >= 0 && (atIdx === 0 || before[atIdx - 1] === ' ' || before[atIdx - 1] === '\n')) {
      const query = before.substring(atIdx + 1);
      if (!query.includes(' ') && query.length < 30) {
        this._mentionQuery = query.toLowerCase();
        this._mentionStart = atIdx;
        this._mentionIdx = 0;
        this.showMentions(textarea);
        return;
      }
    }
    this.hideMentions();
  },

  handleMentionKeydown(e) {
    const dd = document.getElementById('mentions-dropdown');
    if (!dd.classList.contains('show')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this._mentionIdx++; this.highlightMention(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); this._mentionIdx = Math.max(0, this._mentionIdx - 1); this.highlightMention(); }
    if (e.key === 'Enter' || e.key === 'Tab') {
      const active = dd.querySelector('.mention-item.active');
      if (active) { e.preventDefault(); this.insertMention(active.dataset.name); }
    }
    if (e.key === 'Escape') { this.hideMentions(); }
  },

  showMentions(textarea) {
    const dd = document.getElementById('mentions-dropdown');
    const filtered = this.users.filter(u => u.name.toLowerCase().includes(this._mentionQuery));
    if (!filtered.length) { this.hideMentions(); return; }
    this._mentionIdx = Math.min(this._mentionIdx, filtered.length - 1);
    dd.innerHTML = filtered.map((u, i) => `<div class="mention-item ${i === this._mentionIdx ? 'active' : ''}" data-name="${this.esc(u.name)}" onclick="app.insertMention('${this.esc(u.name)}')"><div class="team-avatar" style="background:${this.safeColor(u.color)};width:22px;height:22px;font-size:9px">${this.initials(u.name)}</div>${this.esc(u.name)}</div>`).join('');
    // Position near textarea
    const rect = textarea.getBoundingClientRect();
    dd.style.left = rect.left + 'px';
    dd.style.top = (rect.top - dd.offsetHeight - 4) + 'px';
    dd.classList.add('show');
    // If dropdown goes off top, put it below
    if (parseInt(dd.style.top) < 0) dd.style.top = (rect.bottom + 4) + 'px';
  },

  highlightMention() {
    const items = document.querySelectorAll('#mentions-dropdown .mention-item');
    this._mentionIdx = Math.max(0, Math.min(this._mentionIdx, items.length - 1));
    items.forEach((el, i) => el.classList.toggle('active', i === this._mentionIdx));
  },

  insertMention(name) {
    const textarea = document.getElementById('comment-input');
    const val = textarea.value;
    const before = val.substring(0, this._mentionStart);
    const after = val.substring(textarea.selectionStart);
    textarea.value = before + '@' + name + ' ' + after;
    textarea.focus();
    const newPos = before.length + name.length + 2;
    textarea.setSelectionRange(newPos, newPos);
    this.hideMentions();
  },

  hideMentions() {
    document.getElementById('mentions-dropdown')?.classList.remove('show');
  },

  // ===== FEATURE 15: TASK TEMPLATES =====
  builtinTemplates: [
    { name: 'Bug Report', priority: 'p0', labelNames: ['Bug'], subtasks: ['Reproduce', 'Fix', 'Test', 'Deploy'] },
    { name: 'Feature Request', priority: 'p2', labelNames: ['Feature'], subtasks: ['Design', 'Implement', 'Review', 'Test'] },
    { name: 'Sprint Planning', priority: '', labelNames: [], subtasks: ['Review backlog', 'Estimate', 'Assign', 'Set goals'] },
    { name: 'Release Checklist', priority: '', labelNames: [], subtasks: ['Code freeze', 'QA', 'Staging deploy', 'Prod deploy', 'Monitor'] },
  ],

  loadTemplates() {
    try { this.templates = JSON.parse(localStorage.getItem('fb_templates') || '[]'); } catch { this.templates = []; }
  },
  saveTemplates() { localStorage.setItem('fb_templates', JSON.stringify(this.templates)); this._syncSettings(); },

  populateTemplateSelect() {
    const sel = document.getElementById('template-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Use Template...</option>';
    // Built-in
    this.builtinTemplates.forEach((t, i) => {
      sel.innerHTML += `<option value="builtin_${i}">${this.esc(t.name)}</option>`;
    });
    // Custom
    if (this.templates.length) {
      sel.innerHTML += '<option disabled>── Custom ──</option>';
      this.templates.forEach((t, i) => {
        sel.innerHTML += `<option value="custom_${i}">${this.esc(t.name)}</option>`;
      });
    }
  },

  applyTemplate(val) {
    if (!val) return;
    let tmpl = null;
    if (val.startsWith('builtin_')) {
      tmpl = this.builtinTemplates[parseInt(val.split('_')[1])];
    } else if (val.startsWith('custom_')) {
      tmpl = this.templates[parseInt(val.split('_')[1])];
    }
    if (!tmpl) return;
    document.getElementById('modal-task-name').value = tmpl.name || '';
    document.getElementById('modal-task-priority').value = tmpl.priority || '';
    document.getElementById('modal-task-desc').value = tmpl.description || '';
    // Select matching labels
    if (tmpl.labelNames && tmpl.labelNames.length) {
      tmpl.labelNames.forEach(lname => {
        const label = this.labels.find(l => l.name.toLowerCase() === lname.toLowerCase());
        if (label) {
          const chip = document.querySelector(`#modal-task-labels [data-id="${label.id}"]`);
          if (chip) chip.classList.add('selected');
        }
      });
    }
    // Store subtask names to create after saving
    this._pendingSubtasks = tmpl.subtasks || [];
    document.getElementById('template-select').value = '';
    this.toast('Template applied', 'success');
  },

  saveAsTemplate() {
    const name = document.getElementById('modal-task-name').value.trim();
    if (!name) { this.toast('Enter a task name first', 'error'); return; }
    const priority = document.getElementById('modal-task-priority').value;
    const description = document.getElementById('modal-task-desc').value;
    const labelIds = this.getSelectedLabels('modal-task-labels');
    const labelNames = labelIds.map(id => this.labels.find(l => l.id === id)?.name).filter(Boolean);
    this.templates.push({ name, priority, description, labelNames, subtasks: [] });
    this.saveTemplates();
    this.toast('Template saved', 'success');
  },

  // ===== FEATURE 17: FAVICON BADGE =====
  updateFaviconBadge() {
    const unread = this.notifications.filter(n => !n.read).length;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    // Draw base icon
    ctx.fillStyle = '#2c2418';
    ctx.beginPath();
    ctx.roundRect(0, 0, 32, 32, 6);
    ctx.fill();
    ctx.strokeStyle = '#fffefa';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(9, 16);
    ctx.lineTo(13, 20);
    ctx.lineTo(23, 10);
    ctx.stroke();
    // Draw notification dot
    if (unread > 0) {
      ctx.fillStyle = '#c0886a';
      ctx.beginPath();
      ctx.arc(26, 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(unread > 9 ? '9+' : unread.toString(), 26, 7);
    }
    link.href = canvas.toDataURL();
  },

  // ===== FEATURE 18: CONTEXT MENU =====
  showContextMenu(e, type, id) {
    const menu = document.getElementById('context-menu');
    let html = '';
    if (type === 'task') {
      const task = this.tasks.find(t => t.id === id);
      if (!task) return;
      html = `
        <div class="context-menu-item" onclick="app.openTask('${id}');app.hideContextMenu()">Edit</div>
        <div class="context-menu-sub">
          <div class="context-menu-item">Change Status</div>
          <div class="context-menu-sub-items">
            ${this.boardColumns.map(c => `<div class="context-menu-item" onclick="app.ctxSetStatus('${id}','${c.id}')">${this.esc(c.name)}</div>`).join('')}
          </div>
        </div>
        <div class="context-menu-sub">
          <div class="context-menu-item">Set Priority</div>
          <div class="context-menu-sub-items">
            <div class="context-menu-item" onclick="app.ctxSetPriority('${id}','p0')">Urgent</div>
            <div class="context-menu-item" onclick="app.ctxSetPriority('${id}','p1')">High</div>
            <div class="context-menu-item" onclick="app.ctxSetPriority('${id}','p2')">Medium</div>
            <div class="context-menu-item" onclick="app.ctxSetPriority('${id}','p3')">Low</div>
          </div>
        </div>
        <div class="context-menu-sub">
          <div class="context-menu-item">Assign to</div>
          <div class="context-menu-sub-items">
            ${this.users.map(u => `<div class="context-menu-item" onclick="app.ctxAssign('${id}','${u.id}')">${this.esc(u.name)}</div>`).join('')}
          </div>
        </div>
        <div class="context-menu-sep"></div>
        <div class="context-menu-item danger" onclick="app.deleteTask('${id}');app.hideContextMenu()">Delete</div>`;
    } else if (type === 'project') {
      html = `
        <div class="context-menu-item" onclick="app.editProject('${id}');app.hideContextMenu()">Edit</div>
        <div class="context-menu-item danger" onclick="app.deleteProject('${id}');app.hideContextMenu()">Delete</div>`;
    }
    menu.innerHTML = html;
    // Position intelligently
    let x = e.clientX, y = e.clientY;
    menu.classList.add('show');
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    if (x + mw > window.innerWidth) x = window.innerWidth - mw - 8;
    if (y + mh > window.innerHeight) y = window.innerHeight - mh - 8;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    // Flip submenus if near right edge
    if (x + mw + 150 > window.innerWidth) {
      menu.querySelectorAll('.context-menu-sub-items').forEach(s => s.classList.add('flip-left'));
    }
  },

  hideContextMenu() {
    document.getElementById('context-menu')?.classList.remove('show');
  },

  ctxSetStatus(taskId, status) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      this.pushUndo('Status changed');
      task.status = status;
      this._appendActivity(task, `Status changed to ${status}`);
      if (status === 'done') this.celebrate();
      this.render(); this.save();
    }
    this.hideContextMenu();
  },

  ctxSetPriority(taskId, priority) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) { task.priority = priority; this.save(); this.render(); }
    this.hideContextMenu();
  },

  ctxAssign(taskId, userId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) { task.assigneeId = userId; this.save(); this.render(); }
    this.hideContextMenu();
  },

  // ===== FEATURE 3: EMPTY STATES (analytics/workload) =====
  // Analytics & Workload empty states handled inline in their render methods

  // ===== DELIVERABLES =====
  renderDeliverables(task) {
    const deliverables = task.deliverables || [];
    document.getElementById('deliverable-list').innerHTML = deliverables.length ? deliverables.map(d => {
      const icon = d.type === 'link'
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
      return `<div class="deliverable-item">
        <span class="deliverable-icon">${icon}</span>
        <a href="${this.esc(d.url)}" target="_blank" rel="noopener">${this.esc(d.name)}</a>
        <button class="btn-icon btn-sm" onclick="app.removeDeliverable('${d.id}')" style="width:20px;height:20px;color:var(--text-light)">&times;</button>
      </div>`;
    }).join('') : '<p style="font-size:12px;color:var(--text-light)">No deliverables</p>';
  },

  addDeliverable() {
    if (!this.currentTaskId) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task) return;
    const name = prompt('Deliverable name:');
    if (!name) return;
    const url = prompt('URL or file path:', 'https://');
    if (!url) return;
    task.deliverables = task.deliverables || [];
    const type = url.startsWith('http') ? 'link' : 'file';
    task.deliverables.push({ id: this.generateId(), name, url, type });
    this.save();
    this.renderDeliverables(task);
  },

  removeDeliverable(id) {
    if (!this.currentTaskId) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task) return;
    task.deliverables = (task.deliverables || []).filter(d => d.id !== id);
    this.save();
    this.renderDeliverables(task);
  },

  // ===== BOARD COLUMN MANAGEMENT =====
  saveBoardColumns() {
    localStorage.setItem('fb_board_columns', JSON.stringify(this.boardColumns));
    this._syncSettings();
  },

  showColumnManager() {
    const overlay = document.getElementById('column-manager-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('show');
    this.renderColumnManager();
  },

  closeColumnManager() {
    const overlay = document.getElementById('column-manager-overlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('show');
  },

  renderColumnManager() {
    const body = document.getElementById('column-manager-body');
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
    // Check if tasks exist with this status
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

  // ===== USER ROLES & PERMISSIONS =====
  getCurrentUser() {
    return this.users.find(u => u.id === this.currentUserId);
  },

  canManageUser(targetUserId) {
    const current = this.getCurrentUser();
    const target = this.users.find(u => u.id === targetUserId);
    if (!current || !target) return false;
    if (current.role === 'admin') return target.role !== 'admin';
    if (current.role === 'user') return target.role === 'collaborator';
    return false;
  },

  canEditTask(taskId) {
    const current = this.getCurrentUser();
    if (!current) return false;
    if (current.role === 'admin' || current.role === 'user') return true;
    // Collaborators can only edit tasks assigned to them
    const task = this.tasks.find(t => t.id === taskId);
    return task && task.assigneeId === this.currentUserId;
  },

  canDeleteTask(taskId) {
    const current = this.getCurrentUser();
    if (!current) return false;
    return current.role === 'admin' || current.role === 'user';
  },

  canManageProject() {
    const current = this.getCurrentUser();
    return current && (current.role === 'admin' || current.role === 'user');
  },

  getVisibleUsers(projectId) {
    if (!projectId) return this.users;
    const projectTaskUserIds = new Set(this.tasks.filter(t => t.projectId === projectId).map(t => t.assigneeId).filter(Boolean));
    projectTaskUserIds.add(this.currentUserId);
    return this.users.filter(u => projectTaskUserIds.has(u.id));
  },

  getRoleBadge(role) {
    if (role === 'admin') return '<span class="role-badge admin">Admin</span>';
    if (role === 'collaborator') return '<span class="role-badge collaborator">Collab</span>';
    return '';
  },

  // ===== MICRO-INTERACTIONS =====
  initMicroInteractions() {
    // Ripple effect on buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-primary, .btn-secondary, .nav-item');
      if (!btn) return;
      btn.classList.add('ripple-effect');
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--ripple-x', (e.clientX - rect.left) + 'px');
      btn.style.setProperty('--ripple-y', (e.clientY - rect.top) + 'px');
      btn.classList.remove('rippling');
      void btn.offsetWidth; // trigger reflow
      btn.classList.add('rippling');
      setTimeout(() => btn.classList.remove('rippling'), 500);
    });

    // Smooth number counter for stat cards
    this._observeStatCards();
  },

  _observeStatCards() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.target.classList?.contains('stat-value')) {
          const el = m.target;
          const target = parseInt(el.textContent);
          if (isNaN(target) || el._animating) return;
          el._animating = true;
          const start = parseInt(el._prevVal) || 0;
          const diff = target - start;
          if (diff === 0) { el._animating = false; return; }
          const duration = 400;
          const startTime = performance.now();
          const step = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            el.textContent = Math.round(start + diff * ease);
            if (progress < 1) requestAnimationFrame(step);
            else { el.textContent = target; el._prevVal = target; el._animating = false; }
          };
          el.textContent = start;
          requestAnimationFrame(step);
        }
      });
    });
    // Observe stat values when they appear
    const tryObserve = () => {
      document.querySelectorAll('.stat-value').forEach(el => {
        if (!el._observed) {
          el._observed = true;
          el._prevVal = el.textContent;
          observer.observe(el, { childList: true, characterData: true, subtree: true });
        }
      });
    };
    tryObserve();
    // Re-observe on render
    const origRender = this.renderHome.bind(this);
    this.renderHome = (...args) => { origRender(...args); setTimeout(tryObserve, 10); };
  },
  }
})
