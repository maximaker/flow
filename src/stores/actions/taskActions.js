export const taskActions = {
  // ===== TASK MODAL HELPERS =====
  toggleMoreOptions() {
    const body = document.getElementById('more-options-body');
    const chevron = document.getElementById('more-options-chevron');
    const toggle = document.getElementById('more-options-toggle');
    if (!body) return;
    const isOpen = body.classList.toggle('open');
    if (chevron) chevron.style.transform = isOpen ? 'rotate(180deg)' : '';
    if (toggle) toggle.classList.toggle('open', isOpen);
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
    // Reset more-options to collapsed state
    const moreBody = document.getElementById('more-options-body');
    const moreChevron = document.getElementById('more-options-chevron');
    const moreToggle = document.getElementById('more-options-toggle');
    if (moreBody) { moreBody.classList.remove('open'); }
    if (moreChevron) moreChevron.style.transform = '';
    if (moreToggle) moreToggle.classList.remove('open');
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
    // Reset description editor to preview mode (hide editor, show rendered preview)
    document.getElementById('desc-editor')?.classList.add('hidden');
    document.getElementById('desc-preview')?.classList.remove('hidden');
    this.renderDescriptionPreview(task);
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

  // ===== DESCRIPTION MARKDOWN EDITOR =====

  /** Render the description preview pane from the current task's markdown */
  renderDescriptionPreview(task) {
    const preview = document.getElementById('desc-preview');
    if (!preview) return;
    const md = (task && task.description) ? task.description.trim() : '';
    if (md) {
      preview.innerHTML = this.renderDescriptionMd(md);
      preview.classList.remove('empty');
    } else {
      preview.innerHTML = '<span class="desc-placeholder">Add a description… <em>supports **bold**, - lists, - [ ] checklists</em></span>';
      preview.classList.add('empty');
    }
  },

  /** Switch description section to edit mode */
  editDescription() {
    const preview  = document.getElementById('desc-preview');
    const editor   = document.getElementById('desc-editor');
    const textarea = document.getElementById('panel-description');
    if (!preview || !editor || !textarea) return;
    preview.classList.add('hidden');
    editor.classList.remove('hidden');
    textarea.focus();
    // Put cursor at end
    const len = textarea.value.length;
    textarea.setSelectionRange(len, len);
  },

  /** Switch back to preview mode and save silently */
  blurDescription() {
    const preview = document.getElementById('desc-preview');
    const editor  = document.getElementById('desc-editor');
    if (!preview || !editor) return;
    editor.classList.add('hidden');
    preview.classList.remove('hidden');
    // Persist
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (task) {
      const textarea = document.getElementById('panel-description');
      task.description = textarea ? textarea.value : task.description;
      this.renderDescriptionPreview(task);
      this.save();
    }
  },

  /** Auto-save + refresh preview while typing (debounced 600ms) */
  onDescInput() {
    clearTimeout(this._descSaveTimer);
    this._descSaveTimer = setTimeout(() => {
      const task = this.tasks.find(t => t.id === this.currentTaskId);
      if (!task) return;
      const textarea = document.getElementById('panel-description');
      if (textarea) task.description = textarea.value;
      this.save();
    }, 600);
  },

  /** Smart keyboard handling inside the description textarea */
  descKeydown(event) {
    const ta = event.target;
    // Escape → done
    if (event.key === 'Escape') { event.preventDefault(); this.blurDescription(); return; }
    // Ctrl/Cmd+B → bold
    if ((event.ctrlKey || event.metaKey) && event.key === 'b') { event.preventDefault(); this.descInsert('**', '**'); return; }
    // Ctrl/Cmd+I → italic
    if ((event.ctrlKey || event.metaKey) && event.key === 'i') { event.preventDefault(); this.descInsert('*', '*'); return; }
    // Enter → continue list/checklist on the current line
    if (event.key === 'Enter') {
      const { selectionStart } = ta;
      const before = ta.value.slice(0, selectionStart);
      const lines = before.split('\n');
      const currentLine = lines[lines.length - 1];
      // Checklist continuation
      const chkMatch = currentLine.match(/^([-*] \[[ x]\] )(.*)/);
      if (chkMatch) {
        if (!chkMatch[2].trim()) { // empty item → exit list
          event.preventDefault();
          const del = chkMatch[0].length;
          ta.value = ta.value.slice(0, selectionStart - del) + '\n' + ta.value.slice(selectionStart);
          ta.selectionStart = ta.selectionEnd = selectionStart - del + 1;
        } else {
          event.preventDefault();
          const ins = '\n- [ ] ';
          ta.value = before + ins + ta.value.slice(selectionStart);
          ta.selectionStart = ta.selectionEnd = selectionStart + ins.length;
        }
        return;
      }
      // Bullet list continuation
      const ulMatch = currentLine.match(/^([-*] )(.*)/);
      if (ulMatch) {
        if (!ulMatch[2].trim()) { // empty item → exit
          event.preventDefault();
          const del = ulMatch[0].length;
          ta.value = ta.value.slice(0, selectionStart - del) + '\n' + ta.value.slice(selectionStart);
          ta.selectionStart = ta.selectionEnd = selectionStart - del + 1;
        } else {
          event.preventDefault();
          const ins = '\n- ';
          ta.value = before + ins + ta.value.slice(selectionStart);
          ta.selectionStart = ta.selectionEnd = selectionStart + ins.length;
        }
        return;
      }
      // Ordered list continuation
      const olMatch = currentLine.match(/^(\d+)\. (.*)/);
      if (olMatch) {
        if (!olMatch[2].trim()) { // empty → exit
          event.preventDefault();
          const del = olMatch[0].length;
          ta.value = ta.value.slice(0, selectionStart - del) + '\n' + ta.value.slice(selectionStart);
          ta.selectionStart = ta.selectionEnd = selectionStart - del + 1;
        } else {
          event.preventDefault();
          const next = parseInt(olMatch[1], 10) + 1;
          const ins = `\n${next}. `;
          ta.value = before + ins + ta.value.slice(selectionStart);
          ta.selectionStart = ta.selectionEnd = selectionStart + ins.length;
        }
      }
    }
  },

  /** Insert inline markdown wrapper around current selection (or at cursor) */
  descInsert(before, after) {
    const ta = document.getElementById('panel-description');
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const selected = ta.value.slice(start, end);
    const replacement = before + (selected || 'text') + after;
    ta.value = ta.value.slice(0, start) + replacement + ta.value.slice(end);
    // Select the inner text so users can type over the placeholder
    const innerStart = start + before.length;
    const innerEnd   = innerStart + (selected || 'text').length;
    ta.setSelectionRange(innerStart, innerEnd);
    ta.focus();
  },

  /** Insert a line prefix (for lists/checklists) at the start of the current line */
  descInsertLine(prefix) {
    const ta = document.getElementById('panel-description');
    if (!ta) return;
    const start = ta.selectionStart;
    const before = ta.value.slice(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const needsNewline = lineStart < before.length; // non-empty line → start fresh
    const ins = (needsNewline ? '\n' : '') + prefix;
    ta.value = ta.value.slice(0, start) + ins + ta.value.slice(start);
    ta.selectionStart = ta.selectionEnd = start + ins.length;
    ta.focus();
  },

  /**
   * Toggle a checklist checkbox at the given line index.
   * Called by onclick inside the rendered preview.
   */
  toggleDescCheck(lineIndex) {
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task || !task.description) return;
    const lines = task.description.split('\n');
    const line = lines[lineIndex];
    if (!line) return;
    // Toggle [ ] ↔ [x]
    if (/^[-*] \[ \] /.test(line)) {
      lines[lineIndex] = line.replace(/^([-*] )\[ \] /, '$1[x] ');
    } else if (/^[-*] \[x\] /i.test(line)) {
      lines[lineIndex] = line.replace(/^([-*] )\[x\] /i, '$1[ ] ');
    } else return;
    task.description = lines.join('\n');
    // Sync textarea value if editor happens to be open
    const ta = document.getElementById('panel-description');
    if (ta) ta.value = task.description;
    this.renderDescriptionPreview(task);
    this.save();
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
    // Keep only the 100 most recent comments to prevent unbounded growth
    if (task.comments.length > 100) task.comments = task.comments.slice(-100);
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

  // ===== CONTEXT CHIP INTERACTIONS =====
  cycleChipStatus() {
    if (!this.currentTaskId) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task) return;
    const statuses = this.boardColumns.map(c => c.id);
    const idx = statuses.indexOf(task.status);
    const oldStatus = task.status;
    task.status = statuses[(idx + 1) % statuses.length];
    const panelStatus = document.getElementById('panel-status');
    if (panelStatus) panelStatus.value = task.status;
    task.activityLog = task.activityLog || [];
    if (oldStatus !== task.status) task.activityLog.push({ text: `Status changed to ${task.status}`, timestamp: new Date().toISOString() });
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
    const panelPriority = document.getElementById('panel-priority');
    if (panelPriority) panelPriority.value = task.priority;
    this.save(); this.updateContextChips(task); this.render();
  },

  showChipDropdown(type) {
    const dd = document.getElementById('chip-dropdown');
    const chip = document.getElementById('chip-' + type);
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task || !dd || !chip) return;

    let html = '';
    if (type === 'assignee') {
      html = this.users.map(u => `<div class="chip-dd-item ${u.id === task.assigneeId ? 'active' : ''}" onclick="app.setChipValue('assignee','${u.id}')"><div class="chip-avatar" style="background:${u.color}">${this.initials(u.name)}</div> ${this.esc(u.name)}</div>`).join('');
      html += `<div class="chip-dd-item ${!task.assigneeId ? 'active' : ''}" onclick="app.setChipValue('assignee','')">Unassigned</div>`;
    } else if (type === 'project') {
      html = this.projects.map(p => `<div class="chip-dd-item ${p.id === task.projectId ? 'active' : ''}" onclick="app.setChipValue('project','${p.id}')"><span class="chip-dot" style="background:${p.color}"></span> ${this.esc(p.name)}</div>`).join('');
      html += `<div class="chip-dd-item ${!task.projectId ? 'active' : ''}" onclick="app.setChipValue('project','')">No project</div>`;
    } else if (type === 'due') {
      html = `<div style="padding:8px"><input type="date" id="chip-date-input" value="${task.dueDate||''}" onchange="app.setChipValue('due',this.value)" class="chip-date-input"><div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap"><button class="quickpick-btn" onclick="app.setChipDate('today')">Today</button><button class="quickpick-btn" onclick="app.setChipDate('tomorrow')">Tomorrow</button><button class="quickpick-btn" onclick="app.setChipDate('nextweek')">Next Week</button><button class="quickpick-btn" onclick="app.setChipDate('none')">None</button></div></div>`;
    }

    dd.innerHTML = html;
    const rect = chip.getBoundingClientRect();
    const panelMain = document.querySelector('.panel-main');
    const panelRect = panelMain ? panelMain.getBoundingClientRect() : { top: 0, left: 0 };
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
    if (type === 'assignee') { task.assigneeId = value; const el = document.getElementById('panel-assignee'); if (el) el.value = value; }
    else if (type === 'project') { task.projectId = value; const el = document.getElementById('panel-project'); if (el) el.value = value; }
    else if (type === 'due') { task.dueDate = value; const el = document.getElementById('panel-due'); if (el) el.value = value; }
    document.getElementById('chip-dropdown')?.classList.add('hidden');
    this.save(); this.updateContextChips(task); this.render();
  },

  setChipDate(preset) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let d = '';
    if (preset === 'today') d = today.toISOString().split('T')[0];
    else if (preset === 'tomorrow') { today.setDate(today.getDate() + 1); d = today.toISOString().split('T')[0]; }
    else if (preset === 'nextweek') { today.setDate(today.getDate() + 7); d = today.toISOString().split('T')[0]; }
    this.setChipValue('due', d);
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

  // ===== PANEL UI HELPERS =====
  switchFocusTab(tab) {
    document.querySelectorAll('.focus-tab').forEach(t => t.classList.toggle('active', t.dataset.focus === tab));
    document.querySelectorAll('.focus-tab-content').forEach(c => c.classList.toggle('active', c.id === 'focus-' + tab));
  },

  switchMainPanelTab(tabName) {
    // Kept for backward compatibility but no longer used in the panel
    document.querySelectorAll('.panel-main-tab').forEach(t => t.classList.toggle('active', t.dataset.mtab === tabName));
    document.querySelectorAll('.panel-main-tab-content').forEach(c => c.classList.toggle('active', c.id === 'mtab-' + tabName));
  },

  // ===== RESCUE / INLINE EDIT / QUICK DATE =====
  rescueTask(taskId) {
    const t = this.tasks.find(x => x.id === taskId);
    if (!t) return;
    t.dueDate = new Date().toISOString().split('T')[0];
    this.save(); this.render();
    this.toast('Rescheduled to today');
  },

  startInlineEdit(event, taskId) {
    event.stopPropagation();
    const span = event.target;
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'task-list-name-input'; input.value = task.title;
    span.replaceWith(input); input.focus(); input.select();
    const finish = (save) => {
      if (save) { const val = input.value.trim(); if (val) task.title = val; this.save(); }
      this.renderMyTasks();
    };
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
  },

  setQuickDate(inputId, value) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (value === 'today') input.value = d.toISOString().split('T')[0];
    else if (value === 'tomorrow') { d.setDate(d.getDate() + 1); input.value = d.toISOString().split('T')[0]; }
    else if (value === 'nextweek') { d.setDate(d.getDate() + 7); input.value = d.toISOString().split('T')[0]; }
    else if (value === 'none') input.value = '';
    input.dispatchEvent(new Event('change'));
  },

  // ===== BOARD CARD CLICK (multi-select) =====
  handleBoardCardClick(event, taskId) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault(); event.stopPropagation();
      if (this.selectedTasks.includes(taskId)) this.selectedTasks = this.selectedTasks.filter(id => id !== taskId);
      else this.selectedTasks.push(taskId);
      this.renderBoard(); this.updateBulkBar(); return;
    }
    if (event.shiftKey) {
      event.preventDefault(); event.stopPropagation();
      const col = event.currentTarget?.closest('.column-cards');
      if (col) {
        const ids = Array.from(col.querySelectorAll('.task-card')).map(c => c.dataset.id);
        const clickedIdx = ids.indexOf(taskId);
        let lastIdx = -1;
        ids.forEach((id, i) => { if (this.selectedTasks.includes(id)) lastIdx = i; });
        const from = Math.min(lastIdx >= 0 ? lastIdx : clickedIdx, clickedIdx);
        const to = Math.max(lastIdx >= 0 ? lastIdx : clickedIdx, clickedIdx);
        for (let i = from; i <= to; i++) { if (!this.selectedTasks.includes(ids[i])) this.selectedTasks.push(ids[i]); }
      } else if (!this.selectedTasks.includes(taskId)) this.selectedTasks.push(taskId);
      this.renderBoard(); this.updateBulkBar(); return;
    }
    this.openTask(taskId);
  },

  // ===== UNDO =====
  pushUndo(label) {
    this.undoStack.push({ label, tasks: JSON.parse(JSON.stringify(this.tasks)) });
    // Keep at most 20 snapshots to avoid runaway memory usage
    if (this.undoStack.length > 20) this.undoStack.shift();
  },

  undo() {
    if (!this.undoStack.length) { this.toast('Nothing to undo'); return; }
    const snap = this.undoStack.pop();
    this.tasks = snap.tasks;
    this.save(); this.render();
    this.toast('Undone: ' + snap.label, 'success');
  },

  // ===== SUGGEST NEXT TASK =====
  suggestNextTask(completedTask) {
    if (completedTask.parentId) {
      const siblings = this.getChildren(completedTask.parentId).filter(t => t.id !== completedTask.id && t.status !== 'done');
      if (siblings.length) return siblings[0];
    }
    const candidates = this.tasks.filter(t => t.assigneeId === this.currentUserId && t.status !== 'done' && t.id !== completedTask.id);
    candidates.sort((a, b) => {
      const pOrd = { p0: 0, p1: 1, p2: 2, p3: 3, '': 4 };
      if ((pOrd[a.priority] ?? 4) !== (pOrd[b.priority] ?? 4)) return (pOrd[a.priority] ?? 4) - (pOrd[b.priority] ?? 4);
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1; return 1;
    });
    return candidates[0] || null;
  },

  // ===== TASK TEMPLATES =====
  builtinTemplates: [
    { name: 'Bug Report',        priority: 'p0', labelNames: ['Bug'],     subtasks: ['Reproduce', 'Fix', 'Test', 'Deploy'] },
    { name: 'Feature Request',   priority: 'p2', labelNames: ['Feature'], subtasks: ['Design', 'Implement', 'Review', 'Test'] },
    { name: 'Sprint Planning',   priority: '',   labelNames: [],           subtasks: ['Review backlog', 'Estimate', 'Assign', 'Set goals'] },
    { name: 'Release Checklist', priority: '',   labelNames: [],           subtasks: ['Code freeze', 'QA', 'Staging deploy', 'Prod deploy', 'Monitor'] },
  ],

  saveTemplates() {
    localStorage.setItem('fb_templates', JSON.stringify(this.templates));
    if (this._syncSettings) this._syncSettings();
  },

  populateTemplateSelect() {
    const sel = document.getElementById('template-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Use Template...</option>';
    this.builtinTemplates.forEach((t, i) => { sel.innerHTML += `<option value="builtin_${i}">${this.esc(t.name)}</option>`; });
    if (this.templates.length) {
      sel.innerHTML += '<option disabled>── Custom ──</option>';
      this.templates.forEach((t, i) => { sel.innerHTML += `<option value="custom_${i}">${this.esc(t.name)}</option>`; });
    }
  },

  applyTemplate(val) {
    if (!val) return;
    let tmpl = null;
    if (val.startsWith('builtin_')) tmpl = this.builtinTemplates[parseInt(val.split('_')[1])];
    else if (val.startsWith('custom_')) tmpl = this.templates[parseInt(val.split('_')[1])];
    if (!tmpl) return;
    const nameEl = document.getElementById('modal-task-name');
    if (nameEl) nameEl.value = tmpl.name || '';
    const prioEl = document.getElementById('modal-task-priority');
    if (prioEl) prioEl.value = tmpl.priority || '';
    const descEl = document.getElementById('modal-task-desc');
    if (descEl) descEl.value = tmpl.description || '';
    if (tmpl.labelNames?.length) {
      tmpl.labelNames.forEach(lname => {
        const label = this.labels.find(l => l.name.toLowerCase() === lname.toLowerCase());
        if (label) { const chip = document.querySelector(`#modal-task-labels [data-id="${label.id}"]`); if (chip) chip.classList.add('selected'); }
      });
    }
    this._pendingSubtasks = tmpl.subtasks || [];
    const tplSel = document.getElementById('template-select');
    if (tplSel) tplSel.value = '';
    this.toast('Template applied', 'success');
  },

  saveAsTemplate() {
    const nameEl = document.getElementById('modal-task-name');
    const name = nameEl?.value.trim();
    if (!name) { this.toast('Enter a task name first', 'error'); return; }
    const priority = document.getElementById('modal-task-priority')?.value || '';
    const description = document.getElementById('modal-task-desc')?.value || '';
    const labelIds = this.getSelectedLabels ? this.getSelectedLabels('modal-task-labels') : [];
    const labelNames = labelIds.map(id => this.labels.find(l => l.id === id)?.name).filter(Boolean);
    this.templates.push({ name, priority, description, labelNames, subtasks: [] });
    this.saveTemplates();
    this.toast('Template saved', 'success');
  },

  // ===== QUICK ADD =====
  quickAdd(text) {
    if (!text.trim()) return;
    let title = text, assigneeId = this.currentUserId, projectId = '', priority = '', dueDate = '';
    const labelIds = [];

    // Extract priority
    if (/\b(urgent|critical)\b/i.test(title)) { priority = 'p0'; title = title.replace(/\b(urgent|critical)\b/i, ''); }
    else if (/\bhigh\s*(pri|priority)?\b/i.test(title)) { priority = 'p1'; title = title.replace(/\bhigh\s*(pri|priority)?\b/i, ''); }
    else if (/\bmedium\s*(pri|priority)?\b/i.test(title)) { priority = 'p2'; title = title.replace(/\bmedium\s*(pri|priority)?\b/i, ''); }
    else if (/\blow\s*(pri|priority)?\b/i.test(title)) { priority = 'p3'; title = title.replace(/\blow\s*(pri|priority)?\b/i, ''); }
    else { const prioMatch = title.match(/\b(p[0-3])\b/i); if (prioMatch) { priority = prioMatch[1].toLowerCase(); title = title.replace(/\bp[0-3]\b/i, ''); } }

    // Extract project @mention
    const projMatch = title.match(/@([\w\s]+?)(?=\s+(?:by|due|for|urgent|high|low|medium|assign|$)|\s*$)/i);
    if (projMatch) { const pName = projMatch[1].trim().toLowerCase(); const proj = this.projects.find(p => p.name.toLowerCase().includes(pName)); if (proj) { projectId = proj.id; title = title.replace(/@[\w\s]+?(?=\s+(?:by|due|for|urgent|high|low|medium|assign|$)|\s*$)/i, ''); } }
    if (!projectId) { const hashMatch = title.match(/#([\w-]+)/); if (hashMatch) { const pname = hashMatch[1].toLowerCase().replace(/-/g, ' '); const proj = this.projects.find(p => p.name.toLowerCase().includes(pname)); if (proj) { projectId = proj.id; title = title.replace(/#[\w-]+/, ''); } } }

    // Extract assignee
    const assignMatch = title.match(/\b(?:for|assign\s+to)\s+(\w+)\b/i);
    if (assignMatch) { const aName = assignMatch[1].toLowerCase(); const user = this.users.find(u => u.name.toLowerCase().split(' ')[0] === aName); if (user) { assigneeId = user.id; title = title.replace(/\b(?:for|assign\s+to)\s+\w+\b/i, ''); } }

    // Extract due date
    const today = new Date(); today.setHours(0,0,0,0);
    if (/\b(by |due )?(today)\b/i.test(title)) { dueDate = today.toISOString().split('T')[0]; title = title.replace(/\b(by |due )?(today)\b/i, ''); }
    else if (/\b(by |due )?(tomorrow)\b/i.test(title)) { const d = new Date(today); d.setDate(d.getDate()+1); dueDate = d.toISOString().split('T')[0]; title = title.replace(/\b(by |due )?(tomorrow)\b/i, ''); }
    else if (/\b(by |due )?(next week)\b/i.test(title)) { const d = new Date(today); d.setDate(d.getDate()+7); dueDate = d.toISOString().split('T')[0]; title = title.replace(/\b(by |due )?(next week)\b/i, ''); }
    else { const dueMatch = title.match(/due\s+(today|tomorrow|\d{4}-\d{2}-\d{2})/i); if (dueMatch) { const val = dueMatch[1].toLowerCase(); const now = new Date(); if (val === 'today') dueDate = now.toISOString().split('T')[0]; else if (val === 'tomorrow') { now.setDate(now.getDate()+1); dueDate = now.toISOString().split('T')[0]; } else dueDate = val; title = title.replace(/due\s+\S+/i, ''); } }

    // Parse labels
    this.labels.forEach(l => { const re = new RegExp('\\b' + l.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'); if (re.test(title)) { labelIds.push(l.id); title = title.replace(re, '').trim(); } });

    title = title.replace(/\s+/g, ' ').trim();
    if (!title) { this.toast('Please enter a task title'); return; }

    if (!projectId && this.currentView === 'project' && this.selectedProjectId) projectId = this.selectedProjectId;
    if (!projectId && this.projects.length === 1) projectId = this.projects[0].id;

    this.tasks.push({ id: this.generateId(), title, description: '', status: 'todo', projectId, assigneeId, dueDate, priority, labelIds, blockedBy: [], order: this.tasks.filter(t => t.status === 'todo').length, parentId: '', deliverables: [], attachments: [], comments: [], activityLog: [{ text: 'Task created via quick add', timestamp: new Date().toISOString() }], createdAt: new Date().toISOString().split('T')[0] });
    this.save(); this.render();
    this.toast(`Task "${title}" created`, 'success');
  },

  // ===== ADHD HELPERS =====

  startTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    // Prefer a column whose id/name suggests "in progress"; fall back to second column
    const progressCol = this.boardColumns.find(c =>
      /progress|doing|active|started/i.test(c.id + c.name)
    ) || this.boardColumns[1] || this.boardColumns[0];
    if (!progressCol || task.status === progressCol.id) return;
    this.pushUndo('Task started');
    task.status = progressCol.id;
    this.save();
    this.render();
    this.toast(`▶ Started — focus on: ${task.title}`);
  },

  snoozeTask(taskId, when) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    this.pushUndo('Task snoozed');
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (when === 'tomorrow') d.setDate(d.getDate() + 1);
    else if (when === 'week')  d.setDate(d.getDate() + 7);
    task.dueDate = d.toISOString().split('T')[0];
    this.save();
    this.renderMyTasks();
    const label = when === 'tomorrow' ? 'tomorrow' : 'next week';
    this.toast(`Snoozed — back on your list ${label}`);
  },
}
