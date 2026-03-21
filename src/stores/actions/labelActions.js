export const labelActions = {
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
}
