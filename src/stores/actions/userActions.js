import { pb } from '../../pb.js'

export const userActions = {
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
}
