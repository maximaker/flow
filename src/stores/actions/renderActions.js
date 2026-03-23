export const renderActions = {
  // ===== HOME =====
  renderHome() {
    // ── First-run state: no tasks and no projects yet ──
    const homeDashboard = document.querySelector('.home-dashboard');
    const firstRunEl = document.getElementById('first-run-guide');
    if (this.tasks.length === 0 && this.projects.length === 0) {
      if (homeDashboard) homeDashboard.style.display = 'none';
      if (firstRunEl) firstRunEl.style.display = 'flex';
      return;
    }
    if (homeDashboard) homeDashboard.style.display = '';
    if (firstRunEl) firstRunEl.style.display = 'none';

    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const greetTimeEl = document.getElementById('greeting-time');
    if (greetTimeEl) greetTimeEl.textContent = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const curUser = this.getCurrentUser();
    const greetNameEl = document.getElementById('greeting-name');
    if (greetNameEl) greetNameEl.textContent = curUser?.name?.split(' ')[0] || 'User';

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
    if (hasAnyFocus && focusEl) {
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

      // Determine status-dot class from column position
      const colIdx = this.boardColumns.findIndex(c => c.id === t.status);
      const colClass = colIdx === this.boardColumns.length - 1
        ? 'col-done'
        : colIdx > 0
          ? 'col-progress'
          : 'col-todo';

      // For subtasks (level > 0), hide meta that matches parent
      const showPriority = level > 0 && parentTask ? (t.priority && t.priority !== parentTask.priority) : !!t.priority;
      const showProject = level > 0 && parentTask ? (proj && t.projectId !== parentTask.projectId) : !!proj;
      const showEffort = !!(t.effort);
      const filteredLabelIds = level > 0 && parentTask ? (t.labelIds||[]).filter(lid => !(parentTask.labelIds||[]).includes(lid)) : (t.labelIds||[]);

      const hasMeta = showPriority || showProject || t.dueDate || blocked || filteredLabelIds.length || showEffort;
      const isOverdue = t.dueDate && this.dueDateClass(t.dueDate) === 'overdue' && t.status !== 'done' && colIdx !== this.boardColumns.length - 1;

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
            <div class="task-check ${colClass}" onclick="event.stopPropagation();app.toggleTaskStatus('${t.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="task-list-info">
              <span class="task-list-name ${colClass === 'col-done' ? 'completed' : ''}" ondblclick="event.stopPropagation();app.startInlineEdit(event,'${t.id}')">${this.esc(t.title)}</span>
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
            ${isOverdue ? `<button class="rescue-btn" onclick="event.stopPropagation();app.rescueTask('${t.id}')" title="Move to today">Reschedule?</button>` : ''}
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

    const isFiltered = search || fProj || fStatus || fPriority || fLabel || fAssignee;
    const emptyFiltered = `<div class="empty-state-rich">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p>No tasks match your search</p>
        <p class="empty-state-sub">Try different keywords or remove a filter.</p>
        <button class="btn-secondary" onclick="app.clearFilters()">Clear filters</button>
      </div>`;
    const emptyDefault = `<div class="empty-state-rich">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
        <p>Your task list is clear — nice work!</p>
        <p class="empty-state-sub">Ready to plan something new?</p>
        <button class="btn-primary" onclick="app.showTaskModal()">Create your first task</button>
      </div>`;

    if (!rootTasks.length) {
      document.getElementById('my-tasks-list').innerHTML = isFiltered ? emptyFiltered : emptyDefault;
    } else if (sortPref === 'status' && !fStatus) {
      // Group tasks into column-based sections for clear mental model
      const seen = new Set();
      let sectionsHtml = '';
      this.boardColumns.forEach((col, colIdx) => {
        const sectionTasks = rootTasks.filter(t => t.status === col.id);
        if (!sectionTasks.length) return;
        sectionTasks.forEach(t => seen.add(t.id));
        const dotClass = colIdx === this.boardColumns.length - 1 ? 'col-done' : colIdx === 0 ? 'col-todo' : 'col-progress';
        sectionsHtml += `<div class="task-status-section">
          <div class="task-status-section-header">
            <span class="task-status-dot ${dotClass}"></span>
            <span class="task-status-section-name">${this.esc(col.name)}</span>
            <span class="task-status-section-count">${sectionTasks.length}</span>
          </div>
          ${sectionTasks.map(t => renderTaskRow(t, 0)).join('')}
        </div>`;
      });
      // Catch any tasks with an unknown status (shouldn't happen, but defensive)
      const orphans = rootTasks.filter(t => !seen.has(t.id));
      if (orphans.length) {
        sectionsHtml += `<div class="task-status-section">
          <div class="task-status-section-header">
            <span class="task-status-dot col-todo"></span>
            <span class="task-status-section-name">Other</span>
            <span class="task-status-section-count">${orphans.length}</span>
          </div>
          ${orphans.map(t => renderTaskRow(t, 0)).join('')}
        </div>`;
      }
      document.getElementById('my-tasks-list').innerHTML = sectionsHtml;
    } else {
      document.getElementById('my-tasks-list').innerHTML = rootTasks.map(t => renderTaskRow(t, 0)).join('');
    }

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

  loadSortPref() {
    try {
      const saved = localStorage.getItem('fb_sort_pref');
      if (saved) this.sortPref = saved;
    } catch { /* ignore */ }
  },

  saveSortPref() {
    try {
      localStorage.setItem('fb_sort_pref', this.sortPref || 'status');
    } catch { /* ignore */ }
  },

  loadTemplates() {
    try {
      const saved = JSON.parse(localStorage.getItem('fb_templates') || 'null');
      if (Array.isArray(saved)) this.templates = saved;
    } catch { this.templates = []; }
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
      }).join('') : `<div class="column-cards-empty">Nothing here yet<br><span style="font-size:11px;opacity:0.7">Drag a card in, or use +</span></div>`;

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
    if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'flex' : 'none'; }
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
        }).join('') : `<div class="column-cards-empty">Nothing here yet<br><span style="font-size:11px;opacity:0.7">Drag a card in, or use +</span></div>`;

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
    // Guard: only create one observer and wrap renderHome once across all calls
    if (this._statObserver) {
      this._statObserverTryObserve?.();
      return;
    }

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

    this._statObserver = observer;

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
    this._statObserverTryObserve = tryObserve;

    tryObserve();
    // Re-observe on render — wrap renderHome ONCE
    const origRender = this.renderHome.bind(this);
    this.renderHome = (...args) => { origRender(...args); setTimeout(tryObserve, 10); };
  },

  // ===== NAV BADGES =====
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

  // ===== BREADCRUMB =====
  renderBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    let html = '';
    const titles = { home: 'Home', 'my-tasks': 'My Tasks', board: 'Board', timeline: 'Timeline', analytics: 'Analytics', workload: 'Workload', project: 'Project' };
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

  // ===== TIMELINE DRAG =====
  initTimelineDrag(barEl, taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    let tooltip = null;
    const showTooltip = (text, x, y) => {
      if (!tooltip) { tooltip = document.createElement('div'); tooltip.className = 'timeline-drag-tooltip'; document.body.appendChild(tooltip); }
      tooltip.textContent = text; tooltip.style.left = x + 'px'; tooltip.style.top = (y - 30) + 'px';
    };
    const hideTooltip = () => { if (tooltip) { tooltip.remove(); tooltip = null; } };

    const rightEdge = document.createElement('div');
    rightEdge.className = 'timeline-bar-edge right';
    barEl.appendChild(rightEdge);

    rightEdge.addEventListener('mousedown', (e) => {
      e.stopPropagation(); e.preventDefault();
      const startX = e.clientX; const startWidth = barEl.offsetWidth; const cellW = 40;
      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const newWidth = Math.max(cellW, startWidth + dx);
        barEl.style.width = newWidth + 'px';
        const daysDelta = Math.round((newWidth - startWidth) / cellW);
        const nd = new Date(task.dueDate + 'T00:00:00'); nd.setDate(nd.getDate() + daysDelta);
        showTooltip(nd.toLocaleDateString('en', {month:'short',day:'numeric'}), ev.clientX, ev.clientY);
      };
      const onUp = (ev) => {
        document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); hideTooltip();
        const dx = ev.clientX - startX; const daysDelta = Math.round(dx / cellW);
        if (daysDelta !== 0) {
          const nd = new Date(task.dueDate + 'T00:00:00'); nd.setDate(nd.getDate() + daysDelta);
          task.dueDate = nd.toISOString().split('T')[0]; this.save(); this.renderTimeline();
        }
      };
      document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    });

    barEl.addEventListener('mousedown', (e) => {
      if (e.target === rightEdge) return;
      e.preventDefault();
      const startX = e.clientX; const startLeft = parseInt(barEl.style.left) || 0; const cellW = 40;
      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        barEl.style.left = (startLeft + dx) + 'px';
        const daysDelta = Math.round(dx / cellW);
        const nd = new Date(task.dueDate + 'T00:00:00'); nd.setDate(nd.getDate() + daysDelta);
        showTooltip(nd.toLocaleDateString('en', {month:'short',day:'numeric'}), ev.clientX, ev.clientY);
      };
      const onUp = (ev) => {
        document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); hideTooltip();
        const dx = ev.clientX - startX; const daysDelta = Math.round(dx / cellW);
        if (daysDelta !== 0) {
          const nd = new Date(task.dueDate + 'T00:00:00'); nd.setDate(nd.getDate() + daysDelta);
          task.dueDate = nd.toISOString().split('T')[0];
          if (task.createdAt) { const nc = new Date(task.createdAt + 'T00:00:00'); nc.setDate(nc.getDate() + daysDelta); task.createdAt = nc.toISOString().split('T')[0]; }
          this.save(); this.renderTimeline();
        }
      };
      document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    });
  },

  // ===== CELEBRATE (confetti) =====
  celebrate() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const particles = [];
    const colors = ['#6366f1','#f59e0b','#22c55e','#f43f5e','#3b82f6','#a855f7','#14b8a6'];
    for (let i = 0; i < 120; i++) {
      particles.push({ x: Math.random()*canvas.width, y: -20 - Math.random()*200, w: 6+Math.random()*6, h: 4+Math.random()*4, color: colors[Math.floor(Math.random()*colors.length)], vx: (Math.random()-0.5)*4, vy: 2+Math.random()*4, rot: Math.random()*360, rotV: (Math.random()-0.5)*10, opacity: 1 });
    }
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.rotV;
        if (frame > 60) p.opacity -= 0.015;
        if (p.opacity <= 0) return;
        alive = true;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180); ctx.globalAlpha = Math.max(0, p.opacity); ctx.fillStyle = p.color;
        ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); ctx.restore();
      });
      frame++;
      if (alive && frame < 180) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    animate();
  },

  // ===== FAVICON BADGE =====
  updateFaviconBadge() {
    const unread = this.notifications.filter(n => !n.read).length;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2c2418'; ctx.beginPath(); ctx.roundRect(0, 0, 32, 32, 6); ctx.fill();
    ctx.strokeStyle = '#fffefa'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(9, 16); ctx.lineTo(13, 20); ctx.lineTo(23, 10); ctx.stroke();
    if (unread > 0) {
      ctx.fillStyle = '#c0886a'; ctx.beginPath(); ctx.arc(26, 6, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(unread > 9 ? '9+' : unread.toString(), 26, 7);
    }
    link.href = canvas.toDataURL();
  },

  // ===== CONTEXT MENU =====
  showContextMenu(e, type, id) {
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    let html = '';
    if (type === 'task') {
      const task = this.tasks.find(t => t.id === id);
      if (!task) return;
      html = `
        <div class="context-menu-item" onclick="app.openTask('${id}');app.hideContextMenu()">Edit</div>
        <div class="context-menu-sub"><div class="context-menu-item">Change Status</div><div class="context-menu-sub-items">${this.boardColumns.map(c => `<div class="context-menu-item" onclick="app.ctxSetStatus('${id}','${c.id}')">${this.esc(c.name)}</div>`).join('')}</div></div>
        <div class="context-menu-sub"><div class="context-menu-item">Set Priority</div><div class="context-menu-sub-items"><div class="context-menu-item" onclick="app.ctxSetPriority('${id}','p0')">Urgent</div><div class="context-menu-item" onclick="app.ctxSetPriority('${id}','p1')">High</div><div class="context-menu-item" onclick="app.ctxSetPriority('${id}','p2')">Medium</div><div class="context-menu-item" onclick="app.ctxSetPriority('${id}','p3')">Low</div></div></div>
        <div class="context-menu-sub"><div class="context-menu-item">Assign to</div><div class="context-menu-sub-items">${this.users.map(u => `<div class="context-menu-item" onclick="app.ctxAssign('${id}','${u.id}')">${this.esc(u.name)}</div>`).join('')}</div></div>
        <div class="context-menu-sep"></div>
        <div class="context-menu-item danger" onclick="app.deleteTask('${id}');app.hideContextMenu()">Delete</div>`;
    } else if (type === 'project') {
      html = `<div class="context-menu-item" onclick="app.editProject('${id}');app.hideContextMenu()">Edit</div><div class="context-menu-item danger" onclick="app.deleteProject('${id}');app.hideContextMenu()">Delete</div>`;
    }
    menu.innerHTML = html;
    let x = e.clientX, y = e.clientY;
    menu.classList.add('show');
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    if (x + mw > window.innerWidth) x = window.innerWidth - mw - 8;
    if (y + mh > window.innerHeight) y = window.innerHeight - mh - 8;
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
    if (x + mw + 150 > window.innerWidth) menu.querySelectorAll('.context-menu-sub-items').forEach(s => s.classList.add('flip-left'));
  },

  hideContextMenu() {
    document.getElementById('context-menu')?.classList.remove('show');
  },

  ctxSetStatus(taskId, status) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) { this.pushUndo('Status changed'); task.status = status; this._appendActivity(task, `Status changed to ${status}`); if (status === 'done') this.celebrate(); this.render(); this.save(); }
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

  // ===== @MENTIONS =====
  _mentionQuery: '',
  _mentionStart: -1,
  _mentionIdx: 0,

  handleMentionInput(e) {
    const textarea = e.target;
    const val = textarea.value;
    const pos = textarea.selectionStart;
    const before = val.substring(0, pos);
    const atIdx = before.lastIndexOf('@');
    if (atIdx >= 0 && (atIdx === 0 || before[atIdx - 1] === ' ' || before[atIdx - 1] === '\n')) {
      const query = before.substring(atIdx + 1);
      if (!query.includes(' ') && query.length < 30) {
        this._mentionQuery = query.toLowerCase(); this._mentionStart = atIdx; this._mentionIdx = 0;
        this.showMentions(textarea); return;
      }
    }
    this.hideMentions();
  },

  handleMentionKeydown(e) {
    const dd = document.getElementById('mentions-dropdown');
    if (!dd?.classList.contains('show')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this._mentionIdx++; this.highlightMention(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); this._mentionIdx = Math.max(0, this._mentionIdx - 1); this.highlightMention(); }
    if (e.key === 'Enter' || e.key === 'Tab') { const active = dd.querySelector('.mention-item.active'); if (active) { e.preventDefault(); this.insertMention(active.dataset.name); } }
    if (e.key === 'Escape') this.hideMentions();
  },

  showMentions(textarea) {
    const dd = document.getElementById('mentions-dropdown');
    if (!dd) return;
    const filtered = this.users.filter(u => u.name.toLowerCase().includes(this._mentionQuery));
    if (!filtered.length) { this.hideMentions(); return; }
    this._mentionIdx = Math.min(this._mentionIdx, filtered.length - 1);
    dd.innerHTML = filtered.map((u, i) => `<div class="mention-item ${i === this._mentionIdx ? 'active' : ''}" data-name="${this.esc(u.name)}" onclick="app.insertMention('${this.esc(u.name)}')"><div class="team-avatar" style="background:${this.safeColor(u.color)};width:22px;height:22px;font-size:9px">${this.initials(u.name)}</div>${this.esc(u.name)}</div>`).join('');
    const rect = textarea.getBoundingClientRect();
    dd.style.left = rect.left + 'px'; dd.style.top = (rect.top - dd.offsetHeight - 4) + 'px';
    dd.classList.add('show');
    if (parseInt(dd.style.top) < 0) dd.style.top = (rect.bottom + 4) + 'px';
  },

  highlightMention() {
    const items = document.querySelectorAll('#mentions-dropdown .mention-item');
    this._mentionIdx = Math.max(0, Math.min(this._mentionIdx, items.length - 1));
    items.forEach((el, i) => el.classList.toggle('active', i === this._mentionIdx));
  },

  insertMention(name) {
    const textarea = document.getElementById('comment-input');
    if (!textarea) return;
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

  // ===== DELIVERABLES =====
  renderDeliverables(task) {
    const el = document.getElementById('deliverable-list');
    if (!el) return;
    const deliverables = task.deliverables || [];
    el.innerHTML = deliverables.length ? deliverables.map(d => {
      const icon = d.type === 'link'
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
      return `<div class="deliverable-item"><span class="deliverable-icon">${icon}</span><a href="${this.esc(d.url)}" target="_blank" rel="noopener">${this.esc(d.name)}</a><button class="btn-icon btn-sm" onclick="app.removeDeliverable('${d.id}')" style="width:20px;height:20px;color:var(--text-light)">&times;</button></div>`;
    }).join('') : '<p style="font-size:12px;color:var(--text-light)">No deliverables</p>';
  },

  addDeliverable() {
    if (!this.currentTaskId) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task) return;
    const name = prompt('Deliverable name:'); if (!name) return;
    const url = prompt('URL or file path:', 'https://'); if (!url) return;
    task.deliverables = task.deliverables || [];
    task.deliverables.push({ id: this.generateId(), name, url, type: url.startsWith('http') ? 'link' : 'file' });
    this.save(); this.renderDeliverables(task);
  },

  removeDeliverable(id) {
    if (!this.currentTaskId) return;
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task) return;
    task.deliverables = (task.deliverables || []).filter(d => d.id !== id);
    this.save(); this.renderDeliverables(task);
  },
}
