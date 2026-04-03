import { nextTick } from 'vue'
import { pb } from '../../pb.js'

export const authActions = {
  async init() {
    this.theme = localStorage.getItem('fb_theme') || 'light';
    this.applyTheme();
    if (pb.authStore.isValid && pb.authStore.model) {
      this.currentUserId = pb.authStore.model.id;
      await this.startApp();
    } else {
      pb.authStore.clear();
      this.showLoginScreen();
    }
  },

  showLoginScreen() { /* handled by Vue */ },

  async startApp() {
    if (this.appStarted) return; // guard against double-init
    await this.loadData();
    if (!this.users.length) this.seedData();
    this.migrateOldSubtasks();
    this.boardColumns = this._pbBoardColumns ||
      JSON.parse(localStorage.getItem('fb_board_columns') || 'null') ||
      [{ id: 'todo', name: 'To Do' }, { id: 'in-progress', name: 'In Progress' }, { id: 'done', name: 'Done' }];
    this.appStarted = true;
    this.recentTasks = JSON.parse(localStorage.getItem('fb_recent_tasks') || '[]');
    this.loadTreeState();
    this.loadSortPref();
    try { const p = JSON.parse(localStorage.getItem('fb_notif_prefs')); if (p) this.notifPrefs = { ...this.notifPrefs, ...p }; } catch {}
    if (this._pbTemplates) { this.templates = this._pbTemplates; } else { this.loadTemplates(); }
    this.applyTheme();
    this.checkDeadlineNotifications();
    // Restore tour completion flag
    try { const tc = localStorage.getItem('fb_tour_completed'); if (tc) this.tourCompleted = true; } catch {}
    await nextTick();
    this.render();
    this.updateFaviconBadge();
    this._subscribeToRealtime();
    this._setupCrossTabSync();
    // Auto-start tour for first-time users
    if (!this.tourCompleted) setTimeout(() => this.startTour(), 800);
  },

  async login(emailArg, passwordArg) {
    const email = (emailArg || document.getElementById('login-email')?.value || '').trim();
    const password = passwordArg || document.getElementById('login-password')?.value || '';
    this.loginError = false;
    if (!email || !password) { this.loginError = true; return; }
    try {
      await pb.collection('users').authWithPassword(email, password);
      this.currentUserId = pb.authStore.model.id;
      this.loginError = false;
    } catch (e) {
      this.loginError = true;
      const pwEl = document.getElementById('login-password');
      if (pwEl) { pwEl.classList.add('shake'); setTimeout(() => pwEl.classList.remove('shake'), 500); }
      return;
    }
    await this.startApp();
  },

  async changePassword(userId, newPassword, oldPassword) {
    if (userId === this.currentUserId || this.canManageUser(userId)) {
      try {
        const payload = { password: newPassword, passwordConfirm: newPassword };
        if (userId === this.currentUserId && oldPassword) payload.oldPassword = oldPassword;
        await pb.collection('users').update(userId, payload);
        this.toast('Password updated');
      } catch (e) {
        this.toast('Failed to update password', 'error');
      }
    } else {
      this.toast('Permission denied', 'error');
    }
  },

  _handleSessionExpired() {
    this.toast('Your session has expired. Please sign in again.', 'error')
    setTimeout(() => this.logout(), 1500)
  },

  logout() {
    pb.authStore.clear();
    this.users = []; this.projects = []; this.tasks = [];
    this.notifications = []; this.labels = [];
    this.currentUserId = null;
    this.currentView = 'home';
    this.selectedProjectId = null;
    this.currentTaskId = null;
    this.undoStack = [];
    this.recentTasks = [];
    this.expandedTasks = [];
    this._pbSnapshot = {};
    if (this._pbSyncTimer) { clearTimeout(this._pbSyncTimer); this._pbSyncTimer = null; }
    if (this._savedTimer) { clearTimeout(this._savedTimer); this._savedTimer = null; }
    if (this._descSaveTimer) { clearTimeout(this._descSaveTimer); this._descSaveTimer = null; }
    this._pbSubs.forEach(fn => { try { fn(); } catch {} });
    this._pbSubs = [];
    // Clean up document-level event listeners registered in bindEvents()
    if (this._boundEventCleanups) {
      this._boundEventCleanups.forEach(fn => { try { fn(); } catch {} });
      this._boundEventCleanups = [];
    }
    this._syncing = false;
    this._storageWarnShown = false;
    this.appStarted = false;
  },
}
