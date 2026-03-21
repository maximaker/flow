<template>
  <div id="app" :data-theme="store.theme">
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand sidebar-logo">
        <div class="brand-icon">
          <svg class="flow-logo" width="32" height="32" viewBox="0 0 32 32">
            <defs>
              <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:var(--accent);stop-opacity:1" />
                <stop offset="100%" style="stop-color:var(--accent);stop-opacity:0.8" />
              </linearGradient>
            </defs>
            <path class="flow-path" d="M6 8 C10 8, 12 6, 16 6 C20 6, 22 10, 26 10 M6 16 C10 16, 12 14, 16 14 C20 14, 22 18, 26 18 M6 24 C10 24, 12 22, 16 22 C20 22, 22 26, 26 26"
              fill="none" stroke="url(#flow-grad)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="brand-name">Flow</span>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <a href="#" class="nav-item" data-view="home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Home</span>
          </a>
          <a href="#" class="nav-item" data-view="my-tasks">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span>My Tasks</span>
            <span class="nav-badge" id="nav-badge-tasks"></span>
          </a>
        </div>

        <div class="nav-section">
          <div class="nav-section-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="nav-section-toggle">
              <svg class="accordion-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              <span>Views</span>
            </div>
          </div>
          <div class="accordion-body">
            <a href="#" class="nav-item" data-view="board">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              <span>Board</span>
              <span class="nav-badge" id="nav-badge-board"></span>
            </a>
            <a href="#" class="nav-item" data-view="timeline">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              <span>Timeline</span>
            </a>
          </div>
        </div>

        <div class="nav-section">
          <div class="nav-section-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="nav-section-toggle">
              <svg class="accordion-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              <span>Projects</span>
            </div>
            <button class="btn-icon-sm" onclick="event.stopPropagation();app.showProjectModal()" title="Add Project">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          <div id="project-list" class="project-list accordion-body"></div>
        </div>

        <div class="nav-section">
          <div class="nav-section-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="nav-section-toggle">
              <svg class="accordion-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              <span>Insights</span>
            </div>
          </div>
          <div class="accordion-body">
            <a href="#" class="nav-item" data-view="analytics">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <span>Analytics</span>
            </a>
            <a href="#" class="nav-item" data-view="workload">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Workload</span>
            </a>
          </div>
        </div>

      </nav>

      <div class="sidebar-footer">
        <a href="#" class="nav-item settings-nav-link" data-view="settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>Settings</span>
        </a>
        <div class="sidebar-footer-row">
          <div class="current-user" id="current-user"></div>
          <button class="btn-icon-sm theme-toggle" id="theme-toggle" title="Toggle dark mode">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" id="theme-icon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Top Bar -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="btn-icon" id="sidebar-toggle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h1 class="page-title" id="page-title">Home</h1>
          <nav class="breadcrumb" id="breadcrumb"></nav>
        </div>
        <div class="topbar-right">
          <div class="quick-add-box" id="quick-add-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <input type="text" placeholder="Type a task and press Enter..." id="quick-add-input">
          </div>
          <div class="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search tasks..." id="search-input">
          </div>
          <div class="notification-wrapper">
            <button class="btn-icon notification-btn" id="notification-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span class="notification-badge" id="notification-badge">0</span>
            </button>
            <div class="notification-dropdown" id="notification-dropdown">
              <div class="notif-header">
                <h3>Notifications</h3>
                <button class="btn-text" onclick="app.clearNotifications()">Clear all</button>
              </div>
              <div class="notif-tabs">
                <button class="notif-tab active" data-tab="in-app">In-app</button>
                <button class="notif-tab" data-tab="settings">Settings</button>
              </div>
              <div class="notif-content" id="notif-in-app">
                <div id="notification-list" class="notification-list"></div>
              </div>
              <div class="notif-content hidden" id="notif-settings">
                <div class="notif-setting">
                  <div><p class="notif-setting-title">Deadline reminders</p><p class="notif-setting-desc">Get notified 24h before deadlines</p></div>
                  <label class="toggle"><input type="checkbox" id="notif-deadline" onchange="app.setNotifPref('deadlines', this.checked)"><span class="toggle-slider"></span></label>
                </div>
                <div class="notif-setting">
                  <div><p class="notif-setting-title">Task assignments</p><p class="notif-setting-desc">When a task is assigned to you</p></div>
                  <label class="toggle"><input type="checkbox" id="notif-assign" onchange="app.setNotifPref('assignments', this.checked)"><span class="toggle-slider"></span></label>
                </div>
                <div class="notif-setting">
                  <div><p class="notif-setting-title">Comments</p><p class="notif-setting-desc">New comments on your tasks</p></div>
                  <label class="toggle"><input type="checkbox" id="notif-comments" onchange="app.setNotifPref('comments', this.checked)"><span class="toggle-slider"></span></label>
                </div>
                <div class="notif-setting">
                  <div><p class="notif-setting-title">Email notifications</p><p class="notif-setting-desc">Send digest emails daily</p></div>
                  <label class="toggle"><input type="checkbox" id="notif-email" onchange="app.setNotifPref('email', this.checked)"><span class="toggle-slider"></span></label>
                </div>
              </div>
            </div>
          </div>
          <div class="kbd-hint" onclick="app.openCommandPalette()">
            <kbd>Ctrl</kbd><kbd>K</kbd>
          </div>
        </div>
      </header>

      <!-- Bulk Actions Bar -->
      <div class="bulk-bar" id="bulk-bar">
        <span class="bulk-count"><span id="bulk-count-num">0</span> selected</span>
        <button class="btn-secondary btn-sm" onclick="app.bulkMove('todo')">Move to To Do</button>
        <button class="btn-secondary btn-sm" onclick="app.bulkMove('in-progress')">Move to In Progress</button>
        <button class="btn-secondary btn-sm" onclick="app.bulkMove('done')">Move to Done</button>
        <button class="btn-secondary btn-sm" onclick="app.showBulkAssign()">Assign</button>
        <button class="btn-danger btn-sm" onclick="app.bulkDelete()">Delete</button>
        <button class="btn-icon" onclick="app.clearSelection()" title="Clear selection">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Views -->
      <div class="content-area" id="content-area">
        <!-- Home View -->
        <div class="view active" id="view-home">
          <!-- First-run guide: shown only when there are no tasks and no projects -->
          <div id="first-run-guide" class="first-run-guide" style="display:none">
            <div class="first-run-inner">
              <div class="first-run-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <h2 class="first-run-title">Welcome — let's get you set up</h2>
              <p class="first-run-sub">You're just a few clicks away from having your team's work in one place.</p>
              <div class="first-run-steps">
                <div class="first-run-step" onclick="app.showProjectModal()">
                  <div class="first-run-step-num">1</div>
                  <div class="first-run-step-body">
                    <strong>Create a project</strong>
                    <span>Group your tasks under a project — like "Website Redesign" or "Q3 Goals".</span>
                  </div>
                  <svg class="first-run-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </div>
                <div class="first-run-step" onclick="app.showTaskModal()">
                  <div class="first-run-step-num">2</div>
                  <div class="first-run-step-body">
                    <strong>Add your first task</strong>
                    <span>What's the first thing that needs to get done? Add it here.</span>
                  </div>
                  <svg class="first-run-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </div>
                <div class="first-run-step" onclick="app.switchView('settings')">
                  <div class="first-run-step-num">3</div>
                  <div class="first-run-step-body">
                    <strong>Invite your team</strong>
                    <span>Add teammates so you can assign tasks and track who's doing what.</span>
                  </div>
                  <svg class="first-run-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Regular dashboard: hidden until there's at least one task or project -->
          <div class="home-dashboard">
            <div class="today-focus-card hidden" id="today-focus">
              <div class="focus-header">
                <div class="focus-tabs">
                  <button class="focus-tab active" data-focus="today" onclick="app.switchFocusTab('today')">Today</button>
                  <button class="focus-tab" data-focus="week" onclick="app.switchFocusTab('week')">This Week</button>
                </div>
              </div>
              <div class="focus-tab-content active" id="focus-today">
                <div id="today-focus-list" class="today-focus-list"></div>
              </div>
              <div class="focus-tab-content" id="focus-week">
                <div id="week-focus-list" class="today-focus-list"></div>
              </div>
            </div>
            <div class="home-grid">
              <div class="home-card welcome-card">
                <h2>Good <span id="greeting-time">morning</span>, <span id="greeting-name">User</span></h2>
                <p class="subtitle">Here's what's happening with your projects today.</p>
                <div class="home-stats" id="home-stats"></div>
              </div>
              <div class="home-card">
                <h3>Upcoming Deadlines</h3>
                <div id="upcoming-deadlines" class="upcoming-list"></div>
              </div>
              <div class="home-card">
                <h3>Recent Activity</h3>
                <div id="recent-activity" class="activity-list"></div>
              </div>
              <div class="home-card">
                <h3>My Tasks Overview</h3>
                <div id="my-tasks-overview" class="tasks-overview"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- My Tasks View -->
        <div class="view" id="view-my-tasks">
          <div class="my-tasks-header">
            <div class="my-tasks-header-left">
              <button class="btn-primary" onclick="app.showTaskModal()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Task
                <kbd class="btn-kbd">N</kbd>
              </button>
              <button class="btn-secondary" onclick="app.showBulkImport()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                Bulk Import
              </button>
            </div>
            <div class="filter-group">
              <div class="filter-main">
                <select id="filter-project" class="filter-select"><option value="">All Projects</option></select>
                <select id="filter-assignee" class="filter-select">
                  <option value="me">Assigned to Me</option>
                  <option value="">Anyone</option>
                </select>
                <select id="sort-select" class="filter-select">
                  <option value="status">Sort: Status</option>
                  <option value="due">Sort: Due Date</option>
                  <option value="priority">Sort: Priority</option>
                  <option value="alpha">Sort: A-Z</option>
                  <option value="created">Sort: Newest</option>
                </select>
                <button class="filter-more-btn" onclick="this.closest('.filter-group').classList.toggle('filters-expanded')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>
                  Filters
                </button>
              </div>
              <div class="filter-extra">
                <select id="filter-status" class="filter-select">
                  <option value="">All Status</option>
                </select>
                <select id="filter-priority" class="filter-select">
                  <option value="">All Priorities</option>
                  <option value="p0">Urgent</option>
                  <option value="p1">High</option>
                  <option value="p2">Medium</option>
                  <option value="p3">Low</option>
                </select>
                <select id="filter-label" class="filter-select"><option value="">All Labels</option></select>
              </div>
            </div>
          </div>
          <div id="my-tasks-list" class="task-list-view"></div>
          <div class="inline-add-row" id="inline-add-row">
            <div class="inline-add-check"></div>
            <input type="text" id="inline-add-input" placeholder="+ Add a task..." class="inline-add-input">
          </div>
        </div>

        <!-- Board View -->
        <div class="view" id="view-board">
          <div class="board-header">
            <div class="board-header-left">
              <select id="board-project-select" class="filter-select"><option value="">All Projects</option></select>
              <button class="btn-secondary" onclick="app.showColumnManager()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Columns
              </button>
            </div>
            <button class="btn-primary" onclick="app.showTaskModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Task
            </button>
          </div>
          <div class="kanban-board" id="kanban-board"></div>
        </div>

        <!-- Timeline View -->
        <div class="view" id="view-timeline">
          <div class="timeline-header">
            <div class="timeline-controls">
              <select id="timeline-project-select" class="filter-select"><option value="">All Projects</option></select>
              <button class="btn-secondary" id="timeline-prev"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>
              <button class="btn-secondary" id="timeline-today">Today</button>
              <button class="btn-secondary" id="timeline-next"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></button>
            </div>
          </div>
          <div class="timeline-container" id="timeline-container">
            <div class="timeline-chart" id="timeline-chart"></div>
          </div>
        </div>

        <!-- Analytics View -->
        <div class="view" id="view-analytics">
          <div class="analytics-grid">
            <div class="home-card analytics-full">
              <h3>Tasks Completed Over Time</h3>
              <canvas id="chart-burndown" height="220"></canvas>
            </div>
            <div class="home-card">
              <h3>Tasks by Status</h3>
              <canvas id="chart-status" height="200"></canvas>
            </div>
            <div class="home-card">
              <h3>Tasks by Priority</h3>
              <canvas id="chart-priority" height="200"></canvas>
            </div>
            <div class="home-card">
              <h3>Velocity (Last 4 Weeks)</h3>
              <canvas id="chart-velocity" height="200"></canvas>
            </div>
            <div class="home-card">
              <h3>Tasks by Label</h3>
              <canvas id="chart-labels" height="200"></canvas>
            </div>
          </div>
        </div>

        <!-- Workload View -->
        <div class="view" id="view-workload">
          <div class="workload-header"><h3>Team Workload</h3></div>
          <div id="workload-chart" class="workload-chart"></div>
        </div>

        <!-- Project View -->
        <div class="view" id="view-project">
          <div class="view-header">
            <h2 id="project-view-title">Project</h2>
            <div class="project-view-tabs">
              <button class="project-view-tab active" data-pview="list" onclick="app.switchProjectView('list')">List</button>
              <button class="project-view-tab" data-pview="board" onclick="app.switchProjectView('board')">Board</button>
              <button class="project-view-tab" data-pview="timeline" onclick="app.switchProjectView('timeline')">Timeline</button>
            </div>
          </div>
          <div id="project-view-content"></div>
        </div>

        <!-- Settings View -->
        <div class="view" id="view-settings">
          <div class="settings-layout">

            <!-- Settings sidebar nav -->
            <nav class="settings-sidenav">
              <p class="settings-sidenav-label">Workspace</p>
              <button class="settings-sidenav-item active" data-section="users" onclick="app.switchSettingsSection('users')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Users
              </button>
              <button class="settings-sidenav-item" data-section="labels" onclick="app.switchSettingsSection('labels')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                Labels
              </button>
              <p class="settings-sidenav-label">Personal</p>
              <button class="settings-sidenav-item" data-section="account" onclick="app.switchSettingsSection('account')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                My account
              </button>
              <button class="settings-sidenav-item" data-section="appearance" onclick="app.switchSettingsSection('appearance')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Appearance
              </button>
            </nav>

            <!-- Settings content panes -->
            <div class="settings-panes">

              <!-- Users -->
              <div class="settings-pane active" id="settings-pane-users">
                <div class="settings-pane-header">
                  <div>
                    <h2>Users</h2>
                    <p class="subtitle">Manage team members and their access levels</p>
                  </div>
                  <button class="btn-primary" onclick="app.showUserModal()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add member
                  </button>
                </div>
                <div id="settings-users-list"></div>
              </div>

              <!-- Labels -->
              <div class="settings-pane" id="settings-pane-labels">
                <div class="settings-pane-header">
                  <div>
                    <h2>Labels</h2>
                    <p class="subtitle">Create and manage labels to organize your tasks</p>
                  </div>
                  <button class="btn-primary" onclick="app.showLabelModal()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add label
                  </button>
                </div>
                <div id="settings-labels-list"></div>
              </div>

              <!-- My account -->
              <div class="settings-pane" id="settings-pane-account">
                <div class="settings-pane-header">
                  <div>
                    <h2>My account</h2>
                    <p class="subtitle">Your personal details and security</p>
                  </div>
                </div>
                <div id="settings-account-content"></div>
              </div>

              <!-- Appearance -->
              <div class="settings-pane" id="settings-pane-appearance">
                <div class="settings-pane-header">
                  <div>
                    <h2>Appearance</h2>
                    <p class="subtitle">Customize how Flow looks for you</p>
                  </div>
                </div>
                <div id="settings-appearance-content"></div>
              </div>

            </div><!-- /settings-panes -->
          </div><!-- /settings-layout -->
        </div><!-- /view-settings -->

      </div>
    </main>

    <!-- Task Detail Slide-out Panel -->
    <div class="overlay" id="task-overlay"></div>
    <div class="slide-panel" id="task-panel">
      <div class="panel-header">
        <div class="panel-header-left">
          <button class="btn-icon" onclick="app.closeTaskPanel()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <span class="panel-task-status" id="panel-task-status"></span>
        </div>
        <div class="panel-actions">
          <button class="btn-icon" onclick="app.deleteCurrentTask()" title="Delete task">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="panel-body">
        <div class="panel-main">
          <div id="panel-parent-link" class="hidden"></div>

          <!-- Title -->
          <input type="text" class="panel-title-input" id="panel-title" placeholder="Task name">
          <span class="panel-saved-indicator" id="panel-saved-indicator">Saved</span>

          <!-- Context Chips -->
          <div class="context-chips" id="context-chips">
            <div class="context-chip" id="chip-status" onclick="app.cycleChipStatus()">
              <span class="chip-dot" id="chip-status-dot"></span>
              <span id="chip-status-text">To Do</span>
            </div>
            <div class="context-chip" id="chip-assignee" onclick="app.showChipDropdown('assignee')">
              <div class="chip-avatar" id="chip-assignee-avatar"></div>
              <span id="chip-assignee-text">Unassigned</span>
            </div>
            <div class="context-chip" id="chip-due" onclick="app.showChipDropdown('due')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span id="chip-due-text">No date</span>
            </div>
            <div class="context-chip" id="chip-priority" onclick="app.cycleChipPriority()">
              <span class="chip-dot" id="chip-priority-dot"></span>
              <span id="chip-priority-text">No priority</span>
            </div>
            <div class="context-chip" id="chip-project" onclick="app.showChipDropdown('project')">
              <span class="chip-dot" id="chip-project-dot"></span>
              <span id="chip-project-text">No project</span>
            </div>
            <!-- Hidden dropdown for chips -->
            <div class="chip-dropdown hidden" id="chip-dropdown"></div>
          </div>

          <!-- Hidden selects for data binding -->
          <div class="hidden">
            <select id="panel-assignee"></select>
            <input type="date" id="panel-due">
            <select id="panel-project"></select>
            <select id="panel-status"></select>
            <select id="panel-priority">
              <option value="">None</option>
              <option value="p0">Urgent</option>
              <option value="p1">High</option>
              <option value="p2">Medium</option>
              <option value="p3">Low</option>
            </select>
            <select id="panel-effort">
              <option value="">None</option>
              <option value="trivial">&lt; 1h</option>
              <option value="small">1-2h</option>
              <option value="medium">Half day</option>
              <option value="large">1-2 days</option>
              <option value="xl">3-5 days</option>
              <option value="epic">1+ week</option>
            </select>
            <select id="panel-blocked-by" multiple></select>
            <div class="label-picker" id="panel-labels"></div>
          </div>

          <!-- Description -->
          <div class="panel-section panel-desc-section">
            <textarea id="panel-description" placeholder="Add a description..." rows="3"></textarea>
          </div>

          <!-- Subtasks -->
          <div class="panel-section">
            <div class="section-header">
              <h4>Subtasks</h4>
              <button class="btn-text" onclick="app.addSubtask()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add subtask
              </button>
            </div>
            <div class="subtask-progress hidden" id="subtask-progress">
              <div class="progress-bar"><div class="progress-fill" id="subtask-progress-fill"></div></div>
              <span class="progress-text" id="subtask-progress-text">0%</span>
            </div>
            <div id="subtask-list" class="subtask-list"></div>
          </div>

          <!-- Activity & Comments -->
          <div class="panel-section">
            <h4>Activity</h4>
            <div id="activity-timeline" class="activity-timeline"></div>
            <div class="comment-input-area">
              <div class="comment-avatar" id="comment-avatar"></div>
              <div class="comment-input-wrap">
                <textarea id="comment-input" placeholder="Write a comment..." rows="2"></textarea>
                <button class="btn-primary btn-sm" onclick="app.addComment()">Post</button>
              </div>
            </div>
            <!-- Hidden elements for backward compatibility -->
            <div id="comment-list" class="comment-list hidden"></div>
            <div id="activity-log" class="activity-log hidden"></div>
          </div>

          <!-- More Details (collapsible) -->
          <div class="panel-section panel-more-section">
            <button class="panel-more-toggle" onclick="this.closest('.panel-more-section').classList.toggle('expanded')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              More details
            </button>
            <div class="panel-more-content">
              <div class="meta-row"><label>Effort</label><select id="panel-effort-visible" class="meta-select" onchange="app.syncMoreField('effort')">
                <option value="">None</option><option value="trivial">&lt; 1h</option><option value="small">1-2h</option>
                <option value="medium">Half day</option><option value="large">1-2 days</option>
                <option value="xl">3-5 days</option><option value="epic">1+ week</option>
              </select></div>
              <div class="meta-row"><label>Labels</label><div class="label-picker" id="panel-labels-visible"></div></div>
              <div class="meta-row"><label>Blocked by</label><select id="panel-blocked-visible" class="meta-select" multiple onchange="app.syncMoreField('blocked')"></select></div>
              <div class="panel-section hidden" id="panel-deps-section">
                <h4>Dependencies</h4><div id="panel-deps-info" class="deps-info"></div>
              </div>
              <div class="panel-section">
                <div class="section-header"><h4>Deliverables</h4><button class="btn-text" onclick="app.addDeliverable()">+ Add</button></div>
                <div id="deliverable-list" class="deliverable-list"></div>
              </div>
              <div class="panel-section">
                <div class="section-header">
                  <h4>Attachments</h4>
                  <button class="btn-text" onclick="document.getElementById('file-input').click()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    Add file
                  </button>
                  <input type="file" id="file-input" hidden multiple onchange="app.handleFileUpload(event)">
                </div>
                <div id="attachment-list" class="attachment-list"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Create/Edit Modal -->
    <div class="modal-overlay" id="task-modal-overlay">
      <div class="modal" id="task-modal">
        <div class="modal-header">
          <h3 id="task-modal-title">New Task</h3>
          <div class="modal-header-right">
            <select id="template-select" class="filter-select" onchange="app.applyTemplate(this.value)">
              <option value="">Use Template...</option>
            </select>
            <button class="btn-icon" onclick="app.closeTaskModal()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div class="modal-body">
          <!-- Always-visible fields -->
          <div class="form-group">
            <input type="text" id="modal-task-name" placeholder="What needs to be done?" class="task-name-input">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Who's responsible?</label>
              <select id="modal-task-assignee"></select>
            </div>
            <div class="form-group">
              <label>Project</label>
              <select id="modal-task-project"></select>
            </div>
          </div>
          <div class="form-group">
            <label>Due Date</label>
            <div class="date-quickpicks">
              <button type="button" class="quickpick-btn" onclick="app.setQuickDate('modal-task-due','today')">Today</button>
              <button type="button" class="quickpick-btn" onclick="app.setQuickDate('modal-task-due','tomorrow')">Tomorrow</button>
              <button type="button" class="quickpick-btn" onclick="app.setQuickDate('modal-task-due','nextweek')">Next week</button>
              <button type="button" class="quickpick-btn" onclick="app.setQuickDate('modal-task-due','none')">No date</button>
            </div>
            <input type="date" id="modal-task-due">
          </div>

          <!-- More options (collapsed by default) -->
          <button type="button" class="more-options-toggle" id="more-options-toggle" onclick="app.toggleMoreOptions()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" id="more-options-chevron"><polyline points="6 9 12 15 18 9"/></svg>
            More options
          </button>
          <div class="more-options-body" id="more-options-body">
            <div class="form-row">
              <div class="form-group">
                <label>Status</label>
                <select id="modal-task-status"></select>
              </div>
              <div class="form-group">
                <label>Priority</label>
                <select id="modal-task-priority">
                  <option value="">None</option>
                  <option value="p0">🔴 Urgent</option>
                  <option value="p1">🟠 High</option>
                  <option value="p2">🟡 Medium</option>
                  <option value="p3">🔵 Low</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Effort estimate</label>
                <select id="modal-task-effort">
                  <option value="">Not sure yet</option>
                  <option value="trivial">Quick (under 1h)</option>
                  <option value="small">Short (1–2h)</option>
                  <option value="medium">Half day</option>
                  <option value="large">1–2 days</option>
                  <option value="xl">3–5 days</option>
                  <option value="epic">A week or more</option>
                </select>
              </div>
              <div class="form-group"><label>Labels</label><div class="label-picker" id="modal-task-labels"></div></div>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea id="modal-task-desc" placeholder="Add any notes or context..." rows="3"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-text" onclick="app.saveAsTemplate()" title="Save current fields as a template">Save as Template</button>
          <div style="flex:1"></div>
          <button class="btn-secondary" onclick="app.closeTaskModal()">Cancel</button>
          <button class="btn-primary" id="task-modal-save-btn" onclick="app.saveTaskFromModal()">Create Task</button>
        </div>
      </div>
    </div>

    <!-- Project Modal -->
    <div class="modal-overlay" id="project-modal-overlay">
      <div class="modal" id="project-modal">
        <div class="modal-header">
          <h3 id="project-modal-title">New Project</h3>
          <button class="btn-icon" onclick="app.closeProjectModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>Project Name</label><input type="text" id="modal-project-name" placeholder="Enter project name"></div>
          <div class="form-group">
            <label>Color</label>
            <div class="color-picker" id="color-picker">
              <button class="color-swatch active" data-color="#7a7a7a" style="background:#7a7a7a"></button>
              <button class="color-swatch" data-color="#6a9a8a" style="background:#6a9a8a"></button>
              <button class="color-swatch" data-color="#c45050" style="background:#c45050"></button>
              <button class="color-swatch" data-color="#c4993a" style="background:#c4993a"></button>
              <button class="color-swatch" data-color="#5a9a6e" style="background:#5a9a6e"></button>
              <button class="color-swatch" data-color="#5a82b4" style="background:#5a82b4"></button>
              <button class="color-swatch" data-color="#9a7ab4" style="background:#9a7ab4"></button>
              <button class="color-swatch" data-color="#b08a7a" style="background:#b08a7a"></button>
            </div>
          </div>
          <div class="form-group"><label>Description</label><textarea id="modal-project-desc" placeholder="Project description..." rows="3"></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="app.closeProjectModal()">Cancel</button>
          <button class="btn-primary" id="project-modal-save" onclick="app.saveProject()">Create Project</button>
        </div>
      </div>
    </div>

    <!-- User Modal -->
    <div class="modal-overlay" id="user-modal-overlay">
      <div class="modal" id="user-modal">
        <div class="modal-header">
          <h3 id="user-modal-title">Add Team Member</h3>
          <button class="btn-icon" onclick="app.closeUserModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>Full Name</label><input type="text" id="modal-user-name" placeholder="Enter full name"></div>
          <div class="form-group"><label>Email</label><input type="email" id="modal-user-email" placeholder="Enter email"></div>
          <div class="form-group"><label>Role</label><select id="modal-user-role"><option value="user">User</option><option value="admin">Admin</option><option value="collaborator">Collaborator</option></select></div>
          <div class="form-group">
            <label>Avatar Color</label>
            <div class="color-picker" id="user-color-picker">
              <button class="color-swatch active" data-color="#7a7a7a" style="background:#7a7a7a"></button>
              <button class="color-swatch" data-color="#8a9a7a" style="background:#8a9a7a"></button>
              <button class="color-swatch" data-color="#b08a7a" style="background:#b08a7a"></button>
              <button class="color-swatch" data-color="#9a8a6a" style="background:#9a8a6a"></button>
              <button class="color-swatch" data-color="#5a9a6e" style="background:#5a9a6e"></button>
              <button class="color-swatch" data-color="#5a82b4" style="background:#5a82b4"></button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="app.closeUserModal()">Cancel</button>
          <button class="btn-primary" id="user-modal-save" onclick="app.saveUser()">Add Member</button>
        </div>
      </div>
    </div>

    <!-- Change Password Modal -->
    <div class="modal-overlay" id="change-pw-modal-overlay">
      <div class="modal" id="change-pw-modal">
        <div class="modal-header">
          <h3 id="change-pw-modal-title">Change Password</h3>
          <button class="btn-icon" onclick="app.closeChangePwModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group" id="change-pw-old-group">
            <label>Current Password</label>
            <input type="password" id="change-pw-old" placeholder="Enter your current password">
          </div>
          <div class="form-group">
            <label>New Password</label>
            <input type="password" id="change-pw-new" placeholder="At least 8 characters">
          </div>
          <div class="form-group">
            <label>Confirm New Password</label>
            <input type="password" id="change-pw-confirm" placeholder="Repeat new password">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="app.closeChangePwModal()">Cancel</button>
          <button class="btn-primary" onclick="app.submitChangePassword()">Update Password</button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal (reusable, replaces all confirm() dialogs) -->
    <div class="modal-overlay" id="confirm-modal-overlay">
      <div class="modal modal-sm" id="confirm-modal">
        <div class="modal-header">
          <h3 id="confirm-modal-title">Are you sure?</h3>
        </div>
        <div class="modal-body">
          <p id="confirm-modal-message" style="margin:0;color:var(--text-light);font-size:14px"></p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="app._confirmResolve(false)">Cancel</button>
          <button id="confirm-modal-ok" class="btn-danger" onclick="app._confirmResolve(true)">Confirm</button>
        </div>
      </div>
    </div>

    <!-- Temp Password Modal (shown after creating a new member) -->
    <div class="modal-overlay" id="temp-pw-modal-overlay">
      <div class="modal" id="temp-pw-modal">
        <div class="modal-header">
          <h3>Member created</h3>
          <button class="btn-icon" onclick="app.closeTempPwModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="temp-pw-intro">Share these login details with the new member. They should change their password after first login.</p>
          <div class="temp-pw-field">
            <label>Email</label>
            <div class="temp-pw-row">
              <code id="temp-pw-email"></code>
              <button class="btn-secondary btn-sm" onclick="app.copyTempField('email')">Copy</button>
            </div>
          </div>
          <div class="temp-pw-field">
            <label>Temporary password</label>
            <div class="temp-pw-row">
              <code id="temp-pw-value"></code>
              <button class="btn-secondary btn-sm" onclick="app.copyTempField('password')">Copy</button>
            </div>
          </div>
          <p class="temp-pw-warning">This password will not be shown again.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" onclick="app.closeTempPwModal()">Done</button>
        </div>
      </div>
    </div>

    <!-- Label Management Modal -->
    <div class="modal-overlay" id="label-modal-overlay">
      <div class="modal" id="label-modal">
        <div class="modal-header">
          <h3>Manage Labels</h3>
          <button class="btn-icon" onclick="app.closeLabelModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="label-create-row">
            <input type="text" id="new-label-name" placeholder="Label name">
            <div class="color-picker color-picker-sm" id="label-color-picker">
              <button class="color-swatch active" data-color="#7a7a7a" style="background:#7a7a7a"></button>
              <button class="color-swatch" data-color="#6a9a8a" style="background:#6a9a8a"></button>
              <button class="color-swatch" data-color="#c45050" style="background:#c45050"></button>
              <button class="color-swatch" data-color="#c4993a" style="background:#c4993a"></button>
              <button class="color-swatch" data-color="#5a9a6e" style="background:#5a9a6e"></button>
              <button class="color-swatch" data-color="#9a7ab4" style="background:#9a7ab4"></button>
            </div>
            <button class="btn-primary btn-sm" onclick="app.createLabel()">Add</button>
          </div>
          <div id="label-list-manage" class="label-list-manage"></div>
        </div>
      </div>
    </div>

    <!-- Command Palette -->
    <div class="command-palette-overlay" id="cmd-overlay">
      <div class="command-palette" id="cmd-palette">
        <div class="cmd-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="cmd-input" placeholder="Search tasks, projects, or type a command...">
        </div>
        <div class="cmd-results" id="cmd-results"></div>
        <div class="cmd-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Select</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </div>

    <!-- Bulk Import Modal -->
    <div class="modal-overlay" id="bulk-import-overlay">
      <div class="modal" id="bulk-import-modal" style="width:560px">
        <div class="modal-header">
          <h3>Bulk Import Tasks</h3>
          <button class="btn-icon" onclick="app.closeBulkImport()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">
            Paste a list of tasks. Use indentation (spaces, tabs, or <code>-</code> / <code>*</code> markers) to create nested subtasks. Up to 5 levels deep.
          </p>
          <div class="form-group">
            <label>Project</label>
            <select id="bulk-import-project"></select>
          </div>
          <div class="form-group">
            <textarea id="bulk-import-text" placeholder="Design system&#10;  Colors&#10;  Typography&#10;    Font selection&#10;    Scale system&#10;  Components&#10;API integration&#10;  Authentication&#10;  Endpoints" rows="12" style="font-family:'SF Mono',Monaco,Consolas,monospace;font-size:12px;tab-size:2;line-height:1.7"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="app.closeBulkImport()">Cancel</button>
          <button class="btn-primary" onclick="app.executeBulkImport()">Import Tasks</button>
        </div>
      </div>
    </div>

    <!-- Column Manager Modal -->
    <div class="modal-overlay hidden" id="column-manager-overlay">
      <div class="modal" id="column-manager" style="max-width:400px">
        <div class="modal-header"><h3>Manage Columns</h3><button class="btn-icon" onclick="app.closeColumnManager()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div class="modal-body" id="column-manager-body"></div>
        <div class="modal-footer"><button class="btn-primary" onclick="app.addBoardColumn()">+ Add Column</button></div>
      </div>
    </div>

    <!-- Lightbox -->
    <div class="modal-overlay hidden" id="lightbox-overlay" onclick="this.classList.add('hidden')">
      <div style="position:relative;max-width:90vw;max-height:90vh">
        <img id="lightbox-img" style="max-width:90vw;max-height:90vh;border-radius:8px" src="" alt="">
      </div>
    </div>

    <!-- Context Menu -->
    <div class="context-menu" id="context-menu"></div>

    <!-- Mentions Dropdown -->
    <div class="mentions-dropdown" id="mentions-dropdown"></div>

    <!-- Undo Toast Container -->
    <div id="undo-toast-container" class="undo-toast-container"></div>

    <!-- Celebration Canvas -->
    <canvas id="confetti-canvas" class="confetti-canvas"></canvas>

    <!-- Toast Container -->
    <div id="toast-container" class="toast-container"></div>

    <!-- Recently Viewed Card (Home) -->
    <div id="recent-viewed-card" class="hidden"></div>

    <!-- Keyboard Shortcuts -->
    <button class="shortcuts-hint" onclick="this.classList.toggle('open')" title="Keyboard shortcuts">?
      <div class="shortcuts-overlay">
        <h4>Keyboard Shortcuts</h4>
        <div class="shortcut-row"><kbd>Ctrl+K</kbd><span>Command palette</span></div>
        <div class="shortcut-row"><kbd>Ctrl+Z</kbd><span>Undo</span></div>
        <div class="shortcut-row"><kbd>Ctrl+N</kbd><span>New task</span></div>
        <div class="shortcut-row"><kbd>B</kbd><span>Board view</span></div>
        <div class="shortcut-row"><kbd>H</kbd><span>Home</span></div>
        <div class="shortcut-row"><kbd>T</kbd><span>Timeline</span></div>
        <div class="shortcut-row"><kbd>L</kbd><span>List view</span></div>
        <div class="shortcut-row"><kbd>Esc</kbd><span>Close panel</span></div>
      </div>
    </button>
  </div>
</template>

<script setup>
import { onMounted, nextTick } from 'vue'
import { useAppStore } from '../stores/app.js'

const store = useAppStore()

onMounted(async () => {
  await nextTick()
  store.bindEvents()
  store.render()
})
</script>
