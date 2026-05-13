export const projectActions = {
  // ===== PROJECT CRUD =====
  // Internal: bind icon-picker swatch clicks once. Lazy because the modal
  // markup is in AppShell.vue and may not exist on first showProjectModal()
  // call before mount.
  _ensureIconPickerBound() {
    if (this._iconPickerBound) return;
    const picker = document.getElementById('icon-picker');
    if (!picker) return;
    picker.addEventListener('click', (e) => {
      const sw = e.target.closest('.icon-swatch');
      if (!sw) return;
      picker.querySelectorAll('.icon-swatch').forEach(s => s.classList.toggle('active', s === sw));
    });
    this._iconPickerBound = true;
  },

  // Repopulate the project-manager <select> from the current users list.
  // First option is always "No manager" (empty value).
  _populateProjectManagerSelect(currentManagerId = '') {
    const sel = document.getElementById('modal-project-manager');
    if (!sel) return;
    sel.innerHTML = '<option value="">No manager</option>'
      + this.users.map(u => `<option value="${u.id}">${this.esc(u.name)}</option>`).join('');
    sel.value = currentManagerId || '';
  },

  showProjectModal() {
    if (!this.canManageProject()) { this.toast('You do not have permission to manage projects', 'error'); return; }
    this.editingProjectId = null;
    document.getElementById('project-modal-title').textContent = 'New Project';
    document.getElementById('modal-project-name').value = '';
    document.getElementById('modal-project-desc').value = '';
    document.getElementById('project-modal-save').textContent = 'Create Project';
    document.querySelectorAll('#color-picker .color-swatch').forEach((s,i) => s.classList.toggle('active', i===0));
    document.querySelectorAll('#icon-picker .icon-swatch').forEach((s,i) => s.classList.toggle('active', i===0));
    this._ensureIconPickerBound();
    this._populateProjectManagerSelect('');
    document.getElementById('project-modal-overlay').classList.add('show');
  },

  editProject(id) {
    if (!this.canManageProject()) { this.toast('You do not have permission to manage projects', 'error'); return; }
    const p = this.projects.find(x => x.id === id); if (!p) return;
    this.editingProjectId = id;
    document.getElementById('project-modal-title').textContent = 'Edit Project';
    document.getElementById('modal-project-name').value = p.name;
    document.getElementById('modal-project-desc').value = p.description||'';
    document.getElementById('project-modal-save').textContent = 'Save Changes';
    document.querySelectorAll('#color-picker .color-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === p.color));
    document.querySelectorAll('#icon-picker .icon-swatch').forEach(s => s.classList.toggle('active', s.dataset.icon === (p.icon || '')));
    this._ensureIconPickerBound();
    this._populateProjectManagerSelect(p.managerId || '');
    document.getElementById('project-modal-overlay').classList.add('show');
  },

  closeProjectModal() { document.getElementById('project-modal-overlay').classList.remove('show'); },

  saveProject() {
    const name = document.getElementById('modal-project-name').value.trim(); if (!name) { this.toast('Enter project name','error'); return; }
    const color = document.querySelector('#color-picker .color-swatch.active')?.dataset.color || '#6366f1';
    const icon  = document.querySelector('#icon-picker .icon-swatch.active')?.dataset.icon || '';
    const managerId = document.getElementById('modal-project-manager')?.value || '';
    const desc = document.getElementById('modal-project-desc').value;
    if (this.editingProjectId) {
      const p = this.projects.find(x => x.id === this.editingProjectId);
      if (p) { p.name = name; p.color = color; p.icon = icon; p.managerId = managerId; p.description = desc; }
    } else {
      this.projects.push({ id: this.generateId(), name, color, icon, managerId, description: desc });
    }
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
}
