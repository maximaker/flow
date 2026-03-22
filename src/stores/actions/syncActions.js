import { pb } from '../../pb.js'

export const syncActions = {
  // ===== PERSISTENCE =====
  async loadData() {
    try {
      const [users, projects, tasks, notifications, labels] = await Promise.all([
        pb.collection('users').getFullList({ sort: 'name' }),
        pb.collection('projects').getFullList({ sort: 'name' }),
        pb.collection('tasks').getFullList({ sort: 'order' }),
        pb.collection('notifications').getFullList({ sort: '-timestamp' }),
        pb.collection('labels').getFullList({ sort: 'name' }),
      ]);
      this.users = users.map(r => ({ id: r.id, name: r.name, email: r.email, role: r.role || 'user', color: r.color || '#7a7a7a' }));
      this.projects = projects.map(r => ({ id: r.id, name: r.name, color: r.color, description: r.description }));
      this.tasks = tasks.map(r => ({
        id: r.id, title: r.title, description: r.description || '', status: r.status || 'todo',
        projectId: r.projectId || '', assigneeId: r.assigneeId || '', dueDate: r.dueDate || '',
        priority: r.priority || '', labelIds: r.labelIds || [],
        blockedBy: Array.isArray(r.blockedBy) ? r.blockedBy : (r.blockedBy ? [r.blockedBy] : []),
        order: r.order || 0, parentId: r.parentId || '', effort: r.effort || '',
        deliverables: r.deliverables || [], attachments: r.attachments || [],
        comments: r.comments || [], activityLog: r.activityLog || [],
        createdAt: r.createdAt || r.created?.split(' ')[0] || '',
      }));
      this.notifications = notifications.map(r => ({ id: r.id, type: r.type, text: r.text, taskId: r.taskId, read: r.read, timestamp: r.timestamp }));
      this.labels = labels.map(r => ({ id: r.id, name: r.name, color: r.color }));
      this.theme = localStorage.getItem('fb_theme') || 'light';
      this._pbSnapshot = this._snapshot();
      try {
        const settings = await pb.collection('settings').getOne('global');
        if (settings.boardColumns) this._pbBoardColumns = JSON.parse(settings.boardColumns);
        if (settings.templates) this._pbTemplates = JSON.parse(settings.templates);
      } catch (e) { /* settings collection not yet created */ }
    } catch (e) {
      console.warn('PocketBase load failed, falling back to localStorage:', e);
      try {
        this.users = JSON.parse(localStorage.getItem('fb_users') || '[]');
        this.projects = JSON.parse(localStorage.getItem('fb_projects') || '[]');
        this.tasks = JSON.parse(localStorage.getItem('fb_tasks') || '[]');
        this.notifications = JSON.parse(localStorage.getItem('fb_notifications') || '[]');
        this.labels = JSON.parse(localStorage.getItem('fb_labels') || '[]');
        this.theme = localStorage.getItem('fb_theme') || 'light';
      } catch { this.users = []; this.projects = []; this.tasks = []; this.notifications = []; this.labels = []; }
      this._pbSnapshot = this._snapshot();
    }
  },

  migrateOldSubtasks() {
    const newTasks = [];
    this.tasks.forEach(t => {
      if (t.parentId === undefined) t.parentId = '';
      if (t.subtasks && t.subtasks.length > 0) {
        t.subtasks.forEach((st, i) => {
          if (!this.tasks.find(x => x.id === st.id) && !newTasks.find(x => x.id === st.id)) {
            newTasks.push({
              id: st.id, title: st.title, description: '', status: st.done ? 'done' : (t.status === 'done' ? 'done' : 'todo'),
              projectId: t.projectId || '', assigneeId: t.assigneeId || '', dueDate: '', priority: '',
              labelIds: [], blockedBy: [], order: i, parentId: t.id,
              attachments: [], comments: [], activityLog: [],
              createdAt: t.createdAt || new Date().toISOString().split('T')[0],
            });
          }
        });
        delete t.subtasks;
      }
    });
    if (newTasks.length > 0) { this.tasks.push(...newTasks); this.save(); }
  },

  save() {
    localStorage.setItem('fb_users', JSON.stringify(this.users));
    localStorage.setItem('fb_projects', JSON.stringify(this.projects));
    localStorage.setItem('fb_tasks', JSON.stringify(this.tasks));
    localStorage.setItem('fb_notifications', JSON.stringify(this.notifications));
    localStorage.setItem('fb_labels', JSON.stringify(this.labels));
    localStorage.setItem('fb_theme', this.theme);
    localStorage.setItem('fb_notif_prefs', JSON.stringify(this.notifPrefs));
    if (this.tourCompleted) localStorage.setItem('fb_tour_completed', '1');
    this._schedulePbSync();
  },

  _snapshot() {
    return {
      users: JSON.stringify(this.users),
      projects: JSON.stringify(this.projects),
      tasks: JSON.stringify(this.tasks),
      notifications: JSON.stringify(this.notifications),
      labels: JSON.stringify(this.labels),
    };
  },

  _schedulePbSync() {
    if (this._pbSyncTimer) clearTimeout(this._pbSyncTimer);
    this._pbSyncTimer = setTimeout(() => this._syncToPb(), 800);
  },

  _setSyncStatus(status, errorMsg = null) {
    this._syncStatus = status;
    this._syncError = errorMsg;
    const el = document.getElementById('sync-status');
    if (!el) return;
    if (status === 'syncing') {
      el.className = 'sync-status syncing';
      el.textContent = 'Syncing…';
      el.style.display = '';
    } else if (status === 'error') {
      el.className = 'sync-status error';
      el.title = errorMsg || 'Sync failed';
      el.textContent = 'Sync error';
      el.style.display = '';
    } else if (status === 'offline') {
      el.className = 'sync-status offline';
      el.textContent = 'Offline — changes saved locally';
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  },

  _isAuthError(e) {
    return e?.status === 401 || e?.status === 403 ||
      String(e?.message).includes('401') || String(e?.message).includes('not authenticated');
  },

  async _syncToPb() {
    if (!pb.authStore.isValid) return;
    this._syncing = true;
    this._setSyncStatus('syncing');
    let hadError = false;
    try {
      const snap = this._pbSnapshot || {};
      const collections = [
        { name: 'projects', data: this.projects, toRecord: r => ({ name: r.name, color: r.color, description: r.description }) },
        { name: 'labels',   data: this.labels,   toRecord: r => ({ name: r.name, color: r.color }) },
        {
          name: 'tasks', data: this.tasks,
          toRecord: r => ({
            title: r.title, description: r.description, status: r.status,
            projectId: r.projectId, assigneeId: r.assigneeId, dueDate: r.dueDate,
            priority: r.priority, labelIds: r.labelIds, blockedBy: r.blockedBy,
            parentId: r.parentId, order: r.order, effort: r.effort,
            deliverables: r.deliverables, attachments: r.attachments,
            comments: r.comments, activityLog: r.activityLog, createdAt: r.createdAt,
          }),
        },
        {
          name: 'notifications', data: this.notifications,
          toRecord: r => ({ type: r.type, text: r.text, taskId: r.taskId, userId: this.currentUserId, read: r.read, timestamp: r.timestamp }),
        },
      ];
      for (const col of collections) {
        const prev = JSON.parse(snap[col.name] || '[]');
        const curr = col.data;
        for (const item of curr) {
          const was = prev.find(p => p.id === item.id);
          if (!was) {
            try { await pb.collection(col.name).create({ id: item.id, ...col.toRecord(item) }); }
            catch (e) {
              if (this._isAuthError(e)) { this._handleSessionExpired(); return; }
              hadError = true; console.warn(`PB create ${col.name}:`, e.message);
            }
          } else if (JSON.stringify(item) !== JSON.stringify(was)) {
            try { await pb.collection(col.name).update(item.id, col.toRecord(item)); }
            catch (e) {
              if (this._isAuthError(e)) { this._handleSessionExpired(); return; }
              hadError = true; console.warn(`PB update ${col.name}:`, e.message);
            }
          }
        }
        for (const item of prev) {
          if (!curr.find(c => c.id === item.id)) {
            try { await pb.collection(col.name).delete(item.id); }
            catch (e) {
              if (this._isAuthError(e)) { this._handleSessionExpired(); return; }
              hadError = true; console.warn(`PB delete ${col.name}:`, e.message);
            }
          }
        }
      }
      const prevUsers = JSON.parse(snap.users || '[]');
      for (const user of this.users) {
        const was = prevUsers.find(p => p.id === user.id);
        if (was && JSON.stringify(user) !== JSON.stringify(was)) {
          try { await pb.collection('users').update(user.id, { name: user.name, email: user.email, role: user.role, color: user.color }); }
          catch (e) {
            if (this._isAuthError(e)) { this._handleSessionExpired(); return; }
            hadError = true; console.warn('PB update user:', e.message);
          }
        }
      }
      this._pbSnapshot = this._snapshot();
      this._setSyncStatus(hadError ? 'error' : 'idle', hadError ? 'Some changes failed to sync' : null);
    } catch (e) {
      const isOffline = !navigator.onLine || e?.message?.includes('Failed to fetch') || e?.message?.includes('NetworkError');
      this._setSyncStatus(isOffline ? 'offline' : 'error', e?.message);
      console.warn('PB sync failed:', e.message);
    } finally {
      this._syncing = false;
    }
  },

  async _syncSettings() {
    if (!pb.authStore.isValid) return;
    const data = { boardColumns: JSON.stringify(this.boardColumns), templates: JSON.stringify(this.templates) };
    try {
      await pb.collection('settings').update('global', data);
    } catch (e) {
      try { await pb.collection('settings').create({ id: 'global', ...data }); } catch {}
    }
  },

  // ===== REAL-TIME SUBSCRIPTIONS =====
  async _subscribeToRealtime() {
    const collections = [
      { name: 'users',         store: 'users',         map: r => ({ id: r.id, name: r.name, email: r.email, role: r.role || 'user', color: r.color || '#7a7a7a' }) },
      { name: 'projects',      store: 'projects',      map: r => ({ id: r.id, name: r.name, color: r.color, description: r.description }) },
      {
        name: 'tasks', store: 'tasks',
        map: r => ({
          id: r.id, title: r.title, description: r.description || '', status: r.status || 'todo',
          projectId: r.projectId || '', assigneeId: r.assigneeId || '', dueDate: r.dueDate || '',
          priority: r.priority || '', labelIds: r.labelIds || [],
          blockedBy: Array.isArray(r.blockedBy) ? r.blockedBy : (r.blockedBy ? [r.blockedBy] : []),
          order: r.order || 0, parentId: r.parentId || '', effort: r.effort || '',
          deliverables: r.deliverables || [], attachments: r.attachments || [],
          comments: r.comments || [], activityLog: r.activityLog || [],
          createdAt: r.createdAt || r.created?.split(' ')[0] || '',
        }),
      },
      { name: 'labels',        store: 'labels',        map: r => ({ id: r.id, name: r.name, color: r.color }) },
      { name: 'notifications', store: 'notifications', map: r => ({ id: r.id, type: r.type, text: r.text, taskId: r.taskId, read: r.read, timestamp: r.timestamp }) },
    ];
    for (const col of collections) {
      try {
        const unsub = await pb.collection(col.name).subscribe('*', (e) => {
          if (this._syncing) return;
          const arr = this[col.store];
          const mapped = col.map(e.record);
          if (e.action === 'create') {
            if (!arr.find(x => x.id === mapped.id)) arr.push(mapped);
          } else if (e.action === 'update') {
            const idx = arr.findIndex(x => x.id === mapped.id);
            if (idx !== -1) arr[idx] = mapped; else arr.push(mapped);
          } else if (e.action === 'delete') {
            const idx = arr.findIndex(x => x.id === e.record.id);
            if (idx !== -1) arr.splice(idx, 1);
          }
          this._pbSnapshot = this._snapshot();
          localStorage.setItem(`fb_${col.store}`, JSON.stringify(this[col.store]));
          this.render();
          this.updateFaviconBadge();
        });
        this._pbSubs.push(unsub);
      } catch (e) {
        console.warn(`Real-time subscription failed for ${col.name}:`, e);
      }
    }
  },

  // ===== SEED DATA =====
  seedData() {
    const ids = {};
    const g = (key) => { ids[key] = this.generateId(); return ids[key]; };
    const u1=g('u1'), u2=g('u2'), u3=g('u3'), u4=g('u4');
    const p1=g('p1'), p2=g('p2'), p3=g('p3');
    const l1=g('l1'), l2=g('l2'), l3=g('l3'), l4=g('l4'), l5=g('l5');
    const t1=g('t1'), t2=g('t2'), t3=g('t3'), t4=g('t4'),
          t5=g('t5'), t6=g('t6'), t7=g('t7'), t8=g('t8');
    const st1=g('st1'),st2=g('st2'),st3=g('st3'),st4=g('st4'),
          st5=g('st5'),st6=g('st6'),st7=g('st7'),
          st8=g('st8'),st9=g('st9'),
          st10=g('st10'),st11=g('st11'),st12=g('st12'),
          st13=g('st13'),st14=g('st14'),st15=g('st15'),
          st16=g('st16'),st17=g('st17'),st18=g('st18'),
          st19=g('st19'),st20=g('st20'),st21=g('st21');

    const today = new Date();
    const d = (offset) => { const dt = new Date(today); dt.setDate(dt.getDate() + offset); return dt.toISOString().split('T')[0]; };
    const sub = (task, title, status, order, parent) => ({
      id: task, title, description: '', status, projectId: p1, assigneeId: u1,
      dueDate: '', priority: '', labelIds: [], blockedBy: [], order, parentId: parent,
      attachments: [], comments: [], activityLog: [], createdAt: d(-5),
    });

    this.users = [
      { id: u1, name: 'Sarah Chen',      email: 'sarah@flow.io',  role: 'admin',        color: '#7a7a7a' },
      { id: u2, name: 'Marcus Johnson',  email: 'marcus@flow.io', role: 'user',         color: '#8a9a7a' },
      { id: u3, name: 'Emily Rodriguez', email: 'emily@flow.io',  role: 'user',         color: '#b08a7a' },
      { id: u4, name: 'Alex Kim',        email: 'alex@flow.io',   role: 'collaborator', color: '#9a8a6a' },
    ];
    this.projects = [
      { id: p1, name: 'Website Redesign', color: '#7a7a7a', description: 'Complete overhaul of the marketing website' },
      { id: p2, name: 'Mobile App v2',    color: '#8a9a7a', description: 'Version 2 of the mobile application' },
      { id: p3, name: 'API Migration',    color: '#c4993a', description: 'Migrate REST API to GraphQL' },
    ];
    this.labels = [
      { id: l1, name: 'Bug',     color: '#b87a6a' },
      { id: l2, name: 'Feature', color: '#7a96a8' },
      { id: l3, name: 'Design',  color: '#a08a9a' },
      { id: l4, name: 'Urgent',  color: '#c09a5a' },
      { id: l5, name: 'Backend', color: '#7a9e7a' },
    ];
    this.tasks = [
      { id: t1, title: 'Design homepage mockups', description: 'Create high-fidelity mockups for the new homepage layout',
        status: 'in-progress', projectId: p1, assigneeId: u1, dueDate: d(2), priority: 'p1', labelIds: [l3],
        blockedBy: [], order: 0, parentId: '', effort: 'medium',
        deliverables: [{ id: this.generateId(), name: 'Homepage Mockup v1', url: 'https://figma.com/file/example', type: 'link' }],
        attachments: [{ id: this.generateId(), name: 'homepage-v1.fig', size: '2.4 MB', type: 'doc' }, { id: this.generateId(), name: 'brand-colors.png', size: '340 KB', type: 'img' }],
        comments: [
          { id: this.generateId(), userId: u2, text: 'Looking great! Can we explore a darker variant too?', timestamp: new Date(today - 86400000).toISOString() },
          { id: this.generateId(), userId: u1, text: "Sure, I'll add a dark mode mockup by tomorrow.", timestamp: new Date(today - 43200000).toISOString() },
        ],
        activityLog: [{ text: 'Task created', timestamp: d(-5) }, { text: 'Status changed to In Progress', timestamp: d(-3) }],
        createdAt: d(-5) },
      { ...sub(st1, 'Wireframe layout',        'done',        0, t1), assigneeId: u1 },
      { ...sub(st2, 'Color palette selection', 'done',        1, t1), assigneeId: u1 },
      { ...sub(st3, 'High-fidelity design',    'in-progress', 2, t1), assigneeId: u1 },
      { ...sub(st4, 'Responsive variants',     'todo',        3, t1), assigneeId: u1 },
      { id: t2, title: 'Implement authentication flow', description: 'Build login, signup, and password reset flows',
        status: 'todo', projectId: p1, assigneeId: u2, dueDate: d(5), priority: 'p0', labelIds: [l2, l5],
        blockedBy: [t1], order: 0, parentId: '', effort: 'large',
        attachments: [], comments: [], activityLog: [], createdAt: d(-3) },
      { ...sub(st5, 'Login page',     'todo', 0, t2), projectId: p1, assigneeId: u2, createdAt: d(-3) },
      { ...sub(st6, 'Signup page',    'todo', 1, t2), projectId: p1, assigneeId: u2, createdAt: d(-3) },
      { ...sub(st7, 'Password reset', 'todo', 2, t2), projectId: p1, assigneeId: u2, createdAt: d(-3) },
      { id: t3, title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated testing and deployment',
        status: 'done', projectId: p1, assigneeId: u4, dueDate: d(-1), priority: 'p2', labelIds: [l5],
        blockedBy: [], order: 0, parentId: '',
        attachments: [{ id: this.generateId(), name: 'pipeline-config.yml', size: '1.2 KB', type: 'doc' }],
        comments: [], activityLog: [], createdAt: d(-7) },
      { ...sub(st8, 'Configure test runner', 'done', 0, t3), projectId: p1, assigneeId: u4, createdAt: d(-7) },
      { ...sub(st9, 'Set up staging deploy', 'done', 1, t3), projectId: p1, assigneeId: u4, createdAt: d(-7) },
      { id: t4, title: 'User onboarding screens', description: 'Design and implement the onboarding flow for new users',
        status: 'in-progress', projectId: p2, assigneeId: u3, dueDate: d(1), priority: 'p1', labelIds: [l3, l2],
        blockedBy: [], order: 1, parentId: '', attachments: [],
        comments: [{ id: this.generateId(), userId: u1, text: "Let's keep this under 4 screens max.", timestamp: new Date(today - 172800000).toISOString() }],
        activityLog: [], createdAt: d(-4) },
      { ...sub(st10, 'Welcome screen',      'done', 0, t4), projectId: p2, assigneeId: u3, createdAt: d(-4) },
      { ...sub(st11, 'Feature tour',        'todo', 1, t4), projectId: p2, assigneeId: u3, createdAt: d(-4) },
      { ...sub(st12, 'Permission requests', 'todo', 2, t4), projectId: p2, assigneeId: u3, createdAt: d(-4) },
      { id: t5, title: 'API endpoint documentation', description: 'Document all REST endpoints before migration',
        status: 'todo', projectId: p3, assigneeId: u2, dueDate: d(7), priority: 'p2', labelIds: [],
        blockedBy: [], order: 1, parentId: '', attachments: [], comments: [], activityLog: [], createdAt: d(-2) },
      { id: t6, title: 'Push notification service', description: 'Implement push notifications for iOS and Android',
        status: 'todo', projectId: p2, assigneeId: u4, dueDate: d(10), priority: 'p1', labelIds: [l2, l5],
        blockedBy: [t4], order: 2, parentId: '', attachments: [], comments: [], activityLog: [], createdAt: d(-1) },
      { ...sub(st13, 'iOS integration',     'todo', 0, t6), projectId: p2, assigneeId: u4, createdAt: d(-1) },
      { ...sub(st14, 'Android integration', 'todo', 1, t6), projectId: p2, assigneeId: u4, createdAt: d(-1) },
      { ...sub(st15, 'Backend service',     'todo', 2, t6), projectId: p2, assigneeId: u4, createdAt: d(-1) },
      { id: t7, title: 'Database schema migration', description: 'Migrate from MySQL to PostgreSQL',
        status: 'in-progress', projectId: p3, assigneeId: u1, dueDate: d(3), priority: 'p0', labelIds: [l5, l4],
        blockedBy: [], order: 2, parentId: '', effort: 'xl',
        attachments: [{ id: this.generateId(), name: 'migration-plan.pdf', size: '890 KB', type: 'pdf' }],
        comments: [], activityLog: [], createdAt: d(-6) },
      { ...sub(st16, 'Schema mapping',        'done', 0, t7), projectId: p3, assigneeId: u1, createdAt: d(-6) },
      { ...sub(st17, 'Data migration script', 'todo', 1, t7), projectId: p3, assigneeId: u1, createdAt: d(-6) },
      { ...sub(st18, 'Testing',               'todo', 2, t7), projectId: p3, assigneeId: u1, createdAt: d(-6) },
      { id: t8, title: 'Performance audit', description: 'Run Lighthouse and optimize critical paths',
        status: 'done', projectId: p1, assigneeId: u3, dueDate: d(-3), priority: 'p3', labelIds: [],
        blockedBy: [], order: 1, parentId: '', attachments: [], comments: [], activityLog: [], createdAt: d(-10) },
      { ...sub(st19, 'Run Lighthouse',      'done', 0, t8), projectId: p1, assigneeId: u3, createdAt: d(-10) },
      { ...sub(st20, 'Optimize images',     'done', 1, t8), projectId: p1, assigneeId: u3, createdAt: d(-10) },
      { ...sub(st21, 'Fix render-blocking', 'done', 2, t8), projectId: p1, assigneeId: u3, createdAt: d(-10) },
    ];
    this.notifications = [
      { id: this.generateId(), type: 'deadline', text: 'Deadline approaching: "User onboarding screens" is due tomorrow', taskId: t4, read: false, timestamp: new Date().toISOString() },
      { id: this.generateId(), type: 'assign',   text: 'You were assigned to "Design homepage mockups"',               taskId: t1, read: false, timestamp: new Date(today - 3600000).toISOString() },
      { id: this.generateId(), type: 'comment',  text: 'Marcus commented on "Design homepage mockups"',               taskId: t1, read: true,  timestamp: new Date(today - 86400000).toISOString() },
    ];
    this.save();
  },
}
