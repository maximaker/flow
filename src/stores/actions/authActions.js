import { nextTick } from 'vue'
import { pb } from '../../pb.js'

export const authActions = {
  async init() {
    this.theme = localStorage.getItem('fb_theme') || 'light';
    this.applyTheme();

    // Defense-in-depth on the PocketBase auth token. The SDK stores the
    // token + model JSON in localStorage; if anything tampers with that
    // store (XSS, another tab corruption, a stale schema from an old
    // deploy), `isValid` may still return true because it's a local
    // expiry check, not a server check. We re-validate against the server
    // exactly once at boot: if the refresh fails, we clear the local
    // state and force a fresh login.
    if (pb.authStore.isValid && pb.authStore.model) {
      try {
        // authRefresh hits /api/collections/users/auth-refresh — issues a
        // new token if the current one is valid, throws otherwise.
        await pb.collection('users').authRefresh();
        this.currentUserId = pb.authStore.model.id;
        await this.startApp();
      } catch (e) {
        // Token rejected by server. Could be tampered, expired, revoked,
        // user deleted, or a network/server outage. We clear local auth
        // either way — a brief offline-with-good-token blip will require
        // a re-login, which is the safe default.
        // eslint-disable-next-line no-console
        console.warn('[Flow] Auth refresh failed — clearing token and showing login', e?.message);
        pb.authStore.clear();
        this.currentUserId = null;
        this.showLoginScreen();
      }
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
    // LoginScreen.vue v-binds these args; the DOM-id fallback was a relic
    // from before the Vue migration and silently masked missing-arg bugs.
    const email = (emailArg || '').trim();
    const password = passwordArg || '';
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
    if (!(userId === this.currentUserId || this.canManageUser(userId))) {
      this.toast('Permission denied', 'error');
      return false;
    }
    try {
      const payload = { password: newPassword, passwordConfirm: newPassword };
      if (userId === this.currentUserId && oldPassword) payload.oldPassword = oldPassword;
      await pb.collection('users').update(userId, payload);
      this.toast('Password updated');
      return true;
    } catch (e) {
      // Distinguish failure modes so the user knows what to retry.
      // PocketBase returns 400 for validation errors (e.g. wrong oldPassword),
      // 401/403 for auth, anything else is treated as a transient network/server fault.
      const status = e?.status;
      const data = e?.data?.data || {};
      if (status === 400 && data.oldPassword) {
        this.toast('Current password is incorrect', 'error');
      } else if (status === 400 && data.password) {
        this.toast(data.password.message || 'New password is too weak', 'error');
      } else if (status === 401 || status === 403) {
        this.toast('Your session expired — please sign in again', 'error');
      } else if (!navigator.onLine || /Failed to fetch|NetworkError/i.test(e?.message || '')) {
        this.toast('Network error — password not changed', 'error');
      } else {
        this.toast('Failed to update password', 'error');
      }
      return false;
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
