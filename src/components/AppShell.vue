<template>
  <div id="app" :data-theme="store.theme">
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
      <!-- User-as-brand row at top, matching n.thedigitalvitamins.com.
           Clicking it opens Settings (where the user can manage their account). -->
      <a href="#" class="sidebar-brand sidebar-brand-user" data-view="settings" :aria-label="`Open settings for ${currentUserName}`">
        <SidebarUser :brand="true" />
      </a>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <button type="button" class="nav-item nav-item-button search-trigger" @click="store.openCommandPalette()" aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span>Search</span>
            <kbd class="nav-item-kbd">{{ shortcutLabel }}</kbd>
          </button>
          <button type="button" class="nav-item nav-item-button new-task-trigger" @click="store.openQuickAdd()" aria-label="New task">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>New task</span>
          </button>
          <a href="#" class="nav-item" data-view="home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Home</span>
          </a>
          <a href="#" class="nav-item" data-view="my-tasks">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span>My Tasks</span>
            <span class="nav-badge" :class="{ visible: openTaskCount > 0 }">{{ openTaskCount > 0 ? openTaskCount : '' }}</span>
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
              <span class="nav-badge" :class="{ visible: inProgressCount > 0 }">{{ inProgressCount > 0 ? inProgressCount : '' }}</span>
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
            <button type="button" class="btn-icon-sm" @click.stop="store.showProjectModal()" title="Add Project" aria-label="Add Project">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          <div class="project-list accordion-body"><SidebarProjectList /></div>
        </div>

        <!-- Recents (Notion-style): last 5 projects opened, per device. -->
        <SidebarRecents />

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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>Settings</span>
        </a>
        <button class="nav-item nav-item-button theme-toggle" id="theme-toggle" title="Toggle dark mode" aria-label="Toggle dark mode">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" id="theme-icon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <span id="theme-label">Dark mode</span>
        </button>
        <button type="button" class="nav-item nav-item-button logout-button" @click="store.logout()" title="Sign out" aria-label="Sign out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Log out</span>
        </button>
      </div>
    </aside>

    <!-- Mobile sidebar backdrop -->
    <div class="sidebar-backdrop" id="sidebar-backdrop" @click="store.closeSidebar()"></div>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Mobile-only compact header (replaces full topbar on phones) -->
      <header class="mobile-header" id="mobile-header">
        <button type="button" class="btn-icon" id="mobile-sidebar-toggle" aria-label="Open menu" @click="store.openSidebar()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <h1 class="page-title" id="mobile-page-title">Home</h1>
        <div class="mobile-header-right">
          <div class="search-box mobile-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search…" id="mobile-search-input">
          </div>
          <div class="notification-wrapper mobile-notif">
            <button class="btn-icon notification-btn" id="mobile-notification-btn" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span class="notification-badge" :class="{ visible: unreadCount > 0 }" :style="{ display: unreadCount > 0 ? 'flex' : 'none' }">{{ unreadCount }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Desktop/Tablet Top Bar (hidden on mobile) -->
      <header class="topbar" id="desktop-topbar">
        <div class="topbar-left">
          <button class="btn-icon" id="sidebar-toggle" aria-label="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <Breadcrumb />
        </div>
        <div class="topbar-right">
          <div id="sync-status" class="sync-status" style="display:none" role="status" aria-live="polite"></div>
          <div class="notification-wrapper">
            <button class="btn-icon notification-btn" id="notification-btn" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span class="notification-badge" :class="{ visible: unreadCount > 0 }" :style="{ display: unreadCount > 0 ? 'flex' : 'none' }">{{ unreadCount }}</span>
            </button>
            <div class="notification-dropdown" id="notification-dropdown">
              <div class="notif-header">
                <h3>Notifications</h3>
                <button class="btn-text" @click="store.clearNotifications()">Clear all</button>
              </div>
              <div class="notif-tabs">
                <button class="notif-tab active" data-tab="in-app">In-app</button>
                <button class="notif-tab" data-tab="settings">Settings</button>
              </div>
              <div class="notif-content" id="notif-in-app">
                <NotificationsList />
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
          <!-- Topbar shortcut hint removed; the sidebar's Search row already
               shows the Ctrl K kbd next to the search trigger. -->
        </div>
      </header>

      <!-- Bulk Actions Bar -->
      <div class="bulk-bar" id="bulk-bar">
        <span class="bulk-count"><span id="bulk-count-num">0</span> selected</span>
        <button type="button" class="btn-secondary btn-sm" @click="store.bulkMove('todo')">Move to To Do</button>
        <button type="button" class="btn-secondary btn-sm" @click="store.bulkMove('in-progress')">Move to In Progress</button>
        <button type="button" class="btn-secondary btn-sm" @click="store.bulkMove('done')">Move to Done</button>
        <button type="button" class="btn-secondary btn-sm" @click="store.showBulkAssign()">Assign</button>
        <button type="button" class="btn-danger btn-sm" @click="store.bulkDelete()">Delete</button>
        <button type="button" class="btn-icon" @click="store.clearSelection()" title="Clear selection">
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
                <div class="first-run-step" role="button" tabindex="0" @click="store.showProjectModal()" @keydown.enter.prevent="store.showProjectModal()" @keydown.space.prevent="store.showProjectModal()">
                  <div class="first-run-step-num">1</div>
                  <div class="first-run-step-body">
                    <strong>Create a project</strong>
                    <span>Group your tasks under a project — like "Website Redesign" or "Q3 Goals".</span>
                  </div>
                  <svg class="first-run-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </div>
                <div class="first-run-step" role="button" tabindex="0" @click="store.openConvTask()" @keydown.enter.prevent="store.openConvTask()" @keydown.space.prevent="store.openConvTask()">
                  <div class="first-run-step-num">2</div>
                  <div class="first-run-step-body">
                    <strong>Add your first task</strong>
                    <span>What's the first thing that needs to get done? Add it here.</span>
                  </div>
                  <svg class="first-run-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </div>
                <div class="first-run-step" role="button" tabindex="0" @click="store.switchView('settings')" @keydown.enter.prevent="store.switchView('settings')" @keydown.space.prevent="store.switchView('settings')">
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
                  <button type="button" class="focus-tab active" data-focus="today" @click="store.switchFocusTab('today')">Today</button>
                  <button type="button" class="focus-tab" data-focus="week" @click="store.switchFocusTab('week')">This Week</button>
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
                <HomeUpcomingDeadlines />
              </div>
              <div class="home-card">
                <h3>Recent Activity</h3>
                <HomeRecentActivity />
              </div>
              <div class="home-card">
                <h3>My Tasks Overview</h3>
                <HomeMyTasksOverview />
              </div>
            </div>
          </div>
        </div>

        <!-- My Tasks View -->
        <div class="view" id="view-my-tasks">
          <div class="my-tasks-header">
            <!-- Desktop action buttons -->
            <div class="my-tasks-header-left">
              <button type="button" class="btn-primary" @click="store.openConvTask()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Task
                <kbd class="btn-kbd">N</kbd>
              </button>
              <button type="button" class="btn-secondary" @click="store.showBulkImport()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                Brain dump
              </button>
              <button type="button" id="focus-mode-btn" class="focus-mode-btn btn-secondary" :aria-pressed="store.focusMode" @click="store.toggleFocusMode()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                Focus
              </button>
            </div>

            <!-- Mobile: single filter CTA that opens overlay -->
            <div class="mobile-filter-bar">
              <button type="button" class="mobile-sort-chip" id="mobile-sort-chip" @click="store.openMobileFilters()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>
                Sort &amp; Filter
              </button>
              <button type="button" id="mobile-focus-btn" class="mobile-focus-chip" :aria-pressed="store.focusMode" @click="store.toggleFocusMode()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                Focus
              </button>
            </div>

            <!-- Desktop filter controls (hidden on mobile) -->
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
                  <option value="effort-asc">Sort: Quick wins</option>
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

          <!-- Mobile filter overlay (full-screen bottom sheet) -->
          <div class="mobile-filter-overlay" id="mobile-filter-overlay" @click.self="store.closeMobileFilters()">
            <div class="mobile-filter-sheet">
              <div class="mobile-filter-sheet-header">
                <h3>Sort &amp; filter</h3>
                <button type="button" class="btn-icon" aria-label="Close" @click="store.closeMobileFilters()">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div class="mobile-filter-sheet-body">
                <label class="mobile-filter-label">Sort by</label>
                <select id="mobile-sort-select" class="mobile-filter-select" onchange="document.getElementById('sort-select').value=this.value;app.render()">
                  <option value="status">Status</option>
                  <option value="due">Due date</option>
                  <option value="priority">Priority</option>
                  <option value="alpha">A–Z</option>
                  <option value="created">Newest first</option>
                  <option value="effort-asc">Quick wins</option>
                </select>
                <label class="mobile-filter-label">Project</label>
                <select id="mobile-filter-project" class="mobile-filter-select" onchange="document.getElementById('filter-project').value=this.value;app.render()">
                  <option value="">All projects</option>
                </select>
                <label class="mobile-filter-label">Assigned to</label>
                <select id="mobile-filter-assignee" class="mobile-filter-select" onchange="document.getElementById('filter-assignee').value=this.value;app.render()">
                  <option value="me">Me</option>
                  <option value="">Anyone</option>
                </select>
                <label class="mobile-filter-label">Status</label>
                <select id="mobile-filter-status" class="mobile-filter-select" onchange="document.getElementById('filter-status').value=this.value;app.render()">
                  <option value="">All</option>
                </select>
                <label class="mobile-filter-label">Priority</label>
                <select id="mobile-filter-priority" class="mobile-filter-select" onchange="document.getElementById('filter-priority').value=this.value;app.render()">
                  <option value="">All</option>
                  <option value="p0">Urgent</option>
                  <option value="p1">High</option>
                  <option value="p2">Medium</option>
                  <option value="p3">Low</option>
                </select>
                <label class="mobile-filter-label">Label</label>
                <select id="mobile-filter-label" class="mobile-filter-select" onchange="document.getElementById('filter-label').value=this.value;app.render()">
                  <option value="">All</option>
                </select>
              </div>
              <div class="mobile-filter-sheet-footer">
                <button type="button" class="btn-secondary" @click="store.clearFilters(); store.closeMobileFilters()">Clear all</button>
                <button type="button" class="btn-primary" @click="store.closeMobileFilters()">Done</button>
              </div>
            </div>
          </div>
          <div id="my-tasks-list" class="task-list-view"></div>
          <div class="inline-add-row" id="inline-add-row">
            <div class="inline-add-check"></div>
            <input type="text" id="inline-add-input" placeholder="Add a task — press Enter to save" class="inline-add-input">
          </div>
        </div>

        <!-- Board View -->
        <div class="view" id="view-board">
          <div class="board-header">
            <div class="board-header-left">
              <select id="board-project-select" class="filter-select"><option value="">All Projects</option></select>
              <button type="button" class="btn-secondary" @click="store.showColumnManager()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Columns
              </button>
            </div>
            <button type="button" class="btn-primary" @click="store.showTaskModal()">
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
          <WorkloadChart />
        </div>

        <!-- Project View — title removed from here; the breadcrumb in the
             topbar carries the project name (with icon). Body opens directly
             into the view-mode tabs and content. -->
        <div class="view" id="view-project">
          <div class="view-header">
            <div class="project-view-tabs">
              <button type="button" class="project-view-tab" data-pview="list" :class="{ active: store.projectViewMode === 'list' }" :aria-pressed="store.projectViewMode === 'list'" @click="store.switchProjectView('list')">List</button>
              <button type="button" class="project-view-tab" data-pview="board" :class="{ active: store.projectViewMode === 'board' }" :aria-pressed="store.projectViewMode === 'board'" @click="store.switchProjectView('board')">Board</button>
              <button type="button" class="project-view-tab" data-pview="timeline" :class="{ active: store.projectViewMode === 'timeline' }" :aria-pressed="store.projectViewMode === 'timeline'" @click="store.switchProjectView('timeline')">Timeline</button>
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
              <button type="button" class="settings-sidenav-item" :class="{ active: store._settingsSection === 'users' }" :aria-current="store._settingsSection === 'users' ? 'page' : undefined" @click="store.switchSettingsSection('users')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Users
              </button>
              <button type="button" class="settings-sidenav-item" :class="{ active: store._settingsSection === 'labels' }" :aria-current="store._settingsSection === 'labels' ? 'page' : undefined" @click="store.switchSettingsSection('labels')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                Labels
              </button>
              <p class="settings-sidenav-label">Personal</p>
              <button type="button" class="settings-sidenav-item" :class="{ active: store._settingsSection === 'account' }" :aria-current="store._settingsSection === 'account' ? 'page' : undefined" @click="store.switchSettingsSection('account')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                My account
              </button>
              <button type="button" class="settings-sidenav-item" :class="{ active: store._settingsSection === 'appearance' }" :aria-current="store._settingsSection === 'appearance' ? 'page' : undefined" @click="store.switchSettingsSection('appearance')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
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
                  <button type="button" class="btn-primary" @click="store.showUserModal()">
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
                  <button type="button" class="btn-primary" @click="store.showLabelModal()">
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
                <SettingsAppearance />
                <div class="settings-divider"></div>
                <div class="settings-section-header">Help</div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <strong>Take the product tour</strong>
                    <span>Walk through the app features again at any time.</span>
                  </div>
                  <button type="button" class="btn-secondary btn-sm" @click="store.restartTour()">Start tour</button>
                </div>
              </div>

            </div><!-- /settings-panes -->
          </div><!-- /settings-layout -->
        </div><!-- /view-settings -->

      </div>
    </main>

    <!-- Mobile bottom navigation -->
    <nav class="bottom-nav" id="bottom-nav" aria-label="Main navigation">
      <a href="#" class="bottom-nav-item" data-view="home" aria-label="Home">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Home</span>
      </a>
      <a href="#" class="bottom-nav-item" data-view="my-tasks" aria-label="My Tasks">
        <span class="bottom-nav-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span class="bottom-nav-badge" :class="{ visible: openTaskCount > 0 }">{{ openTaskCount > 0 ? openTaskCount : '' }}</span>
        </span>
        <span>My Tasks</span>
      </a>
      <button class="bottom-nav-fab" @click="store.openConvTask()" aria-label="Add task">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <a href="#" class="bottom-nav-item" data-view="timeline" aria-label="Timeline">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>Timeline</span>
      </a>
      <a href="#" class="bottom-nav-item" data-view="settings" aria-label="Settings">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>More</span>
      </a>
    </nav>

    <!-- Task Detail Slide-out Panel -->
    <div class="overlay" id="task-overlay"></div>
    <div class="slide-panel" id="task-panel">
      <div class="panel-header">
        <div class="panel-header-left">
          <button class="btn-icon" @click="store.closeTaskPanel()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <span class="panel-task-status" id="panel-task-status"></span>
        </div>
        <div class="panel-actions">
          <button class="btn-icon" @click="store.deleteCurrentTask()" title="Delete task">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="panel-body">
        <div class="panel-main">
          <div id="panel-parent-link" class="hidden"></div>

          <!-- Page icon (Notion-style) — clickable emoji slot above title.
               Populated by openTask() with a deterministic default until the
               user picks one. Click opens a palette picker. -->
          <div class="panel-page-icon-wrap">
            <button
              type="button"
              class="panel-page-icon"
              id="panel-page-icon"
              aria-label="Task icon (click to change)"
              aria-haspopup="true"
              @click="store.toggleTaskIconPicker($event)"
            >📝</button>
            <div class="panel-page-icon-picker hidden" id="panel-page-icon-picker" role="menu" aria-label="Choose task icon">
              <div class="icon-picker-grid">
                <button
                  v-for="emoji in TASK_EMOJI_PALETTE"
                  :key="emoji"
                  type="button"
                  class="icon-picker-cell"
                  :aria-label="`Use ${emoji}`"
                  @click="store.setTaskIcon(emoji)"
                >{{ emoji }}</button>
              </div>
              <div class="icon-picker-footer">
                <button type="button" class="btn-ghost" @click="store.removeTaskIcon()">Remove icon</button>
              </div>
            </div>
          </div>

          <!-- Title -->
          <input type="text" class="panel-title-input" id="panel-title" placeholder="Task name">
          <span class="panel-saved-indicator" id="panel-saved-indicator">Saved</span>

          <!-- Context Chips -->
          <div class="context-chips" id="context-chips">
            <div class="context-chip" id="chip-status" @click="store.cycleChipStatus()">
              <span class="chip-dot" id="chip-status-dot"></span>
              <span id="chip-status-text">To Do</span>
            </div>
            <div class="context-chip" id="chip-assignee" @click="store.showChipDropdown('assignee')">
              <div class="chip-avatar" id="chip-assignee-avatar"></div>
              <span id="chip-assignee-text">Unassigned</span>
            </div>
            <div class="context-chip" id="chip-due" @click="store.showChipDropdown('due')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span id="chip-due-text">No date</span>
            </div>
            <div class="context-chip" id="chip-priority" @click="store.cycleChipPriority()">
              <span class="chip-dot" id="chip-priority-dot"></span>
              <span id="chip-priority-text">No priority</span>
            </div>
            <div class="context-chip" id="chip-project" @click="store.showChipDropdown('project')">
              <span class="chip-dot" id="chip-project-dot"></span>
              <span id="chip-project-text">No project</span>
            </div>
            <!-- Hidden dropdown for chips -->
            <div class="chip-dropdown hidden" id="chip-dropdown"></div>

            <!-- Extended property rows promoted out of "More details" so the
                 full task property list reads inline (Notion's pattern). -->
            <div class="meta-row">
              <label>Effort</label>
              <select id="panel-effort-visible" class="meta-select" onchange="app.syncMoreField('effort')">
                <option value="">None</option>
                <option value="trivial">&lt; 1h</option>
                <option value="small">1-2h</option>
                <option value="medium">Half day</option>
                <option value="large">1-2 days</option>
                <option value="xl">3-5 days</option>
                <option value="epic">1+ week</option>
              </select>
            </div>
            <div class="meta-row">
              <label>Labels</label>
              <div class="label-picker" id="panel-labels-visible"></div>
            </div>
            <div class="meta-row">
              <label>Blocked by</label>
              <select id="panel-blocked-visible" class="meta-select" multiple onchange="app.syncMoreField('blocked')"></select>
            </div>
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

          <!-- Description — click-to-edit markdown editor -->
          <div class="panel-section panel-desc-section" id="desc-section">

            <!-- Preview mode (default) -->
            <div id="desc-preview" class="desc-preview" @click="store.editDescription()" role="button" tabindex="0"
              onkeydown="if(event.key==='Enter'||event.key===' ')app.editDescription()">
              <!-- Populated by renderDescriptionPreview() -->
            </div>

            <!-- Edit mode (hidden until clicked) -->
            <div id="desc-editor" class="desc-editor hidden">
              <div class="desc-toolbar">
                <button class="desc-tb-btn" title="Bold (Ctrl+B)" @click="store.descInsert('**','**')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 4h8a4 4 0 0 1 0 8H6z"/><path d="M6 12h9a4 4 0 0 1 0 8H6z"/></svg></button>
                <button class="desc-tb-btn" title="Italic (Ctrl+I)" @click="store.descInsert('*','*')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg></button>
                <button class="desc-tb-btn" title="Heading" @click="store.descInsert('## ','')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M4 12h16M4 6v12M20 6v12"/></svg></button>
                <div class="desc-tb-divider"></div>
                <button class="desc-tb-btn" title="Bullet list" @click="store.descInsertLine('- ')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg></button>
                <button class="desc-tb-btn" title="Checklist" @click="store.descInsertLine('- [ ] ')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="6" height="6" rx="1"/><polyline points="5 8 6.5 9.5 9 6.5"/><line x1="13" y1="8" x2="21" y2="8"/><rect x="3" y="14" width="6" height="6" rx="1"/><line x1="13" y1="17" x2="21" y2="17"/></svg></button>
                <button class="desc-tb-btn" title="Inline code" @click="store.descInsert('\`','\`')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></button>
                <div class="desc-tb-divider"></div>
                <span class="desc-tb-hint">Markdown</span>
                <button class="desc-done-btn" @click="store.blurDescription()">Done</button>
              </div>
              <textarea id="panel-description"
                placeholder="Add a description…&#10;&#10;Supports **bold**, *italic*, ## headings&#10;- bullet lists&#10;- [ ] checklists&#10;- [x] checked items"
                rows="8"
                oninput="app.onDescInput()"
                onkeydown="app.descKeydown(event)"></textarea>
            </div>

          </div>

          <!-- Subtasks -->
          <div class="panel-section">
            <div class="section-header">
              <h4>Subtasks</h4>
              <button class="btn-text" @click="store.addSubtask()">
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
                <button class="btn-primary btn-sm" @click="store.addComment()">Post</button>
              </div>
            </div>
            <!-- Hidden elements for backward compatibility -->
            <div id="comment-list" class="comment-list hidden"></div>
            <div id="activity-log" class="activity-log hidden"></div>
          </div>

          <!-- Dependencies (only renders when the task has blockers/blockees). -->
          <div class="panel-section hidden" id="panel-deps-section">
            <h4>Dependencies</h4>
            <div id="panel-deps-info" class="deps-info"></div>
          </div>

          <!-- Deliverables -->
          <div class="panel-section">
            <div class="section-header">
              <h4>Deliverables</h4>
              <button class="btn-text" @click="store.addDeliverable()">+ Add</button>
            </div>
            <div id="deliverable-list" class="deliverable-list"></div>
          </div>

          <!-- Attachments -->
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

    <!-- Task Create/Edit Modal — palette-style overlay matching command-palette
         chrome: pinned 15vh from top, 560px wide, lean input row + property
         rail + keyboard-hint footer (no heavy "New Task" title bar). -->
    <div class="task-palette-overlay" id="task-modal-overlay" @click.self="store.closeTaskModal()">
      <div class="task-palette" id="task-modal">
        <!-- Input row: + icon, primary input, template selector, close -->
        <div class="task-palette-input-wrap">
          <svg class="task-palette-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <input type="text" id="modal-task-name" placeholder="What needs to be done?" autocomplete="off">
          <select id="template-select" class="task-palette-template" onchange="app.applyTemplate(this.value)" aria-label="Apply template">
            <option value="">Templates…</option>
          </select>
          <button class="btn-icon" @click="store.closeTaskModal()" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Property rail: rows of label + value, matching task-panel's pattern -->
        <div class="task-palette-props">
          <div class="task-palette-prop">
            <label>Project</label>
            <select id="modal-task-project"></select>
          </div>
          <div class="task-palette-prop">
            <label>Assignee</label>
            <select id="modal-task-assignee"></select>
          </div>
          <div class="task-palette-prop">
            <label>Due</label>
            <div class="task-palette-due">
              <div class="task-palette-quickpicks">
                <button type="button" @click="store.setQuickDate('modal-task-due','today')">Today</button>
                <button type="button" @click="store.setQuickDate('modal-task-due','tomorrow')">Tomorrow</button>
                <button type="button" @click="store.setQuickDate('modal-task-due','nextweek')">Next week</button>
                <button type="button" @click="store.setQuickDate('modal-task-due','none')">No date</button>
              </div>
              <input type="date" id="modal-task-due">
            </div>
          </div>
          <div class="task-palette-prop">
            <label>Priority</label>
            <select id="modal-task-priority">
              <option value="">None</option>
              <option value="p0">🔴 Urgent</option>
              <option value="p1">🟠 High</option>
              <option value="p2">🟡 Medium</option>
              <option value="p3">🔵 Low</option>
            </select>
          </div>
          <div class="task-palette-prop">
            <label>Status</label>
            <select id="modal-task-status"></select>
          </div>
          <div class="task-palette-prop">
            <label>Effort</label>
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
          <div class="task-palette-prop">
            <label>Labels</label>
            <div class="label-picker" id="modal-task-labels"></div>
          </div>
          <div class="task-palette-prop task-palette-prop-desc">
            <label>Notes</label>
            <textarea id="modal-task-desc" placeholder="Optional context, links, or notes…" rows="2"></textarea>
          </div>
          <!-- Hidden legacy more-options targets so old toggle code keeps no-op-ing -->
          <div class="hidden">
            <span id="more-options-toggle"></span>
            <span id="more-options-chevron"></span>
            <span id="more-options-body"></span>
          </div>
        </div>

        <!-- Footer: keyboard hints (palette pattern) + actions -->
        <div class="task-palette-footer">
          <div class="task-palette-hints">
            <span><kbd>⏎</kbd> Create</span>
            <span><kbd>Tab</kbd> Next field</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
          <div class="task-palette-actions">
            <button class="btn-text" @click="store.saveAsTemplate()" title="Save current fields as a template">Save as Template</button>
            <button class="btn-primary btn-sm" id="task-modal-save-btn" @click="store.saveTaskFromModal()">Create Task</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Project Modal -->
    <div class="modal-overlay" id="project-modal-overlay">
      <div class="modal" id="project-modal">
        <div class="modal-header">
          <h3 id="project-modal-title">New Project</h3>
          <button class="btn-icon" @click="store.closeProjectModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>Project Name</label><input type="text" id="modal-project-name" placeholder="Enter project name"></div>
          <div class="form-group">
            <label>Icon</label>
            <div class="icon-picker" id="icon-picker">
              <button type="button" class="icon-swatch active" data-icon="" title="No icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <button type="button" class="icon-swatch" data-icon="📁" title="Folder">📁</button>
              <button type="button" class="icon-swatch" data-icon="📋" title="Clipboard">📋</button>
              <button type="button" class="icon-swatch" data-icon="📌" title="Pin">📌</button>
              <button type="button" class="icon-swatch" data-icon="🚀" title="Launch">🚀</button>
              <button type="button" class="icon-swatch" data-icon="⭐" title="Star">⭐</button>
              <button type="button" class="icon-swatch" data-icon="💡" title="Idea">💡</button>
              <button type="button" class="icon-swatch" data-icon="📊" title="Analytics">📊</button>
              <button type="button" class="icon-swatch" data-icon="🎯" title="Target">🎯</button>
              <button type="button" class="icon-swatch" data-icon="🎨" title="Design">🎨</button>
              <button type="button" class="icon-swatch" data-icon="🛠️" title="Build">🛠️</button>
              <button type="button" class="icon-swatch" data-icon="📚" title="Library">📚</button>
              <button type="button" class="icon-swatch" data-icon="✨" title="Sparkle">✨</button>
              <button type="button" class="icon-swatch" data-icon="🌱" title="Growth">🌱</button>
              <button type="button" class="icon-swatch" data-icon="🔬" title="Research">🔬</button>
            </div>
          </div>
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
          <div class="form-group">
            <label>Project Manager</label>
            <select id="modal-project-manager" class="filter-select">
              <option value="">No manager</option>
            </select>
          </div>
          <div class="form-group"><label>Description</label><textarea id="modal-project-desc" placeholder="Project description..." rows="3"></textarea></div>
        </div>
        <div class="modal-footer modal-footer-split">
          <!-- Destructive actions only appear when editing (not on create) -->
          <div class="modal-footer-left">
            <template v-if="store.editingProjectId">
              <button
                v-if="!editingProjectArchived"
                type="button"
                class="btn-ghost btn-ghost-warn"
                @click="store.archiveFromEdit()"
                title="Archive this project"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                Archive
              </button>
              <button
                v-else
                type="button"
                class="btn-ghost"
                @click="store.unarchiveFromEdit()"
                title="Restore this project"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 10 9 10"/></svg>
                Restore
              </button>
              <button
                type="button"
                class="btn-ghost btn-ghost-danger"
                @click="store.deleteFromEdit()"
                title="Delete this project"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Delete
              </button>
            </template>
          </div>
          <div class="modal-footer-right">
            <button class="btn-secondary" @click="store.closeProjectModal()">Cancel</button>
            <button class="btn-primary" id="project-modal-save" @click="store.saveProject()">Create Project</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Archive Project Modal -->
    <div class="modal-overlay" id="archive-modal-overlay" @click.self="store.closeArchiveModal()">
      <div class="modal modal-compact">
        <div class="modal-header">
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="vertical-align: -3px; margin-right: 6px;"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
            Archive project
          </h3>
          <button class="btn-icon" @click="store.closeArchiveModal()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="archive-modal-lead">
            You're archiving <strong id="archive-modal-project-name"></strong>. It'll move to the
            <em>Archived</em> section in the sidebar and you can restore it any time.
          </p>
          <div class="archive-modal-warning" id="archive-modal-warning" role="status"></div>
          <div class="form-group">
            <label for="archive-modal-note">Note (optional)</label>
            <textarea
              id="archive-modal-note"
              rows="3"
              placeholder="Why are you archiving this? Any handoff context for future-you…"
              maxlength="2000"
            ></textarea>
            <small class="form-hint">Shown on the archived item's hover tooltip and on the project page.</small>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="store.closeArchiveModal()">Cancel</button>
          <button class="btn-primary" @click="store.confirmArchive()">Archive project</button>
        </div>
      </div>
    </div>

    <!-- User Modal -->
    <div class="modal-overlay" id="user-modal-overlay">
      <div class="modal" id="user-modal">
        <div class="modal-header">
          <h3 id="user-modal-title">Add Team Member</h3>
          <button class="btn-icon" @click="store.closeUserModal()">
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
          <button class="btn-secondary" @click="store.closeUserModal()">Cancel</button>
          <button class="btn-primary" id="user-modal-save" @click="store.saveUser()">Add Member</button>
        </div>
      </div>
    </div>

    <!-- Change Password Modal -->
    <div class="modal-overlay" id="change-pw-modal-overlay">
      <div class="modal" id="change-pw-modal">
        <div class="modal-header">
          <h3 id="change-pw-modal-title">Change Password</h3>
          <button class="btn-icon" @click="store.closeChangePwModal()">
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
          <button class="btn-secondary" @click="store.closeChangePwModal()">Cancel</button>
          <button class="btn-primary" @click="store.submitChangePassword()">Update Password</button>
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
          <button class="btn-secondary" @click="store._confirmResolve(false)">Cancel</button>
          <button id="confirm-modal-ok" class="btn-danger" @click="store._confirmResolve(true)">Confirm</button>
        </div>
      </div>
    </div>

    <!-- Temp Password Modal (shown after creating a new member) -->
    <div class="modal-overlay" id="temp-pw-modal-overlay">
      <div class="modal" id="temp-pw-modal">
        <div class="modal-header">
          <h3>Member created</h3>
          <button class="btn-icon" @click="store.closeTempPwModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="temp-pw-intro">Share these login details with the new member. They should change their password after first login.</p>
          <div class="temp-pw-field">
            <label>Email</label>
            <div class="temp-pw-row">
              <code id="temp-pw-email"></code>
              <button class="btn-secondary btn-sm" @click="store.copyTempField('email')">Copy</button>
            </div>
          </div>
          <div class="temp-pw-field">
            <label>Temporary password</label>
            <div class="temp-pw-row">
              <code id="temp-pw-value"></code>
              <button class="btn-secondary btn-sm" @click="store.copyTempField('password')">Copy</button>
            </div>
          </div>
          <p class="temp-pw-warning">This password will not be shown again.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" @click="store.closeTempPwModal()">Done</button>
        </div>
      </div>
    </div>

    <!-- Label Management Modal -->
    <div class="modal-overlay" id="label-modal-overlay">
      <div class="modal" id="label-modal">
        <div class="modal-header">
          <h3>Manage Labels</h3>
          <button class="btn-icon" @click="store.closeLabelModal()">
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
            <button class="btn-primary btn-sm" @click="store.createLabel()">Add</button>
          </div>
          <div id="label-list-manage" class="label-list-manage"></div>
        </div>
      </div>
    </div>

    <!-- Quick Add (New task popup) — mirrors the Search popup pattern:
         centered modal, input at top, escape to close, Enter to create. -->
    <div class="command-palette-overlay" id="quick-add-overlay" @click.self="store.closeQuickAdd()">
      <div class="command-palette quick-add-modal">
        <div class="cmd-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <input
            type="text"
            id="quick-add-popup-input"
            placeholder="What needs doing?"
            @keydown.enter.prevent="onQuickAddEnter"
            @keydown.escape.prevent="store.closeQuickAdd()"
          />
        </div>
        <div class="quick-add-hint">
          <span><kbd>@</kbd> project</span>
          <span><kbd>p0–p3</kbd> priority</span>
          <span><kbd>by tomorrow</kbd> due date</span>
          <span><kbd>for [name]</kbd> assignee</span>
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
          <button class="btn-icon" @click="store.closeBulkImport()">
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
          <button class="btn-secondary" @click="store.closeBulkImport()">Cancel</button>
          <button class="btn-primary" @click="store.executeBulkImport()">Import Tasks</button>
        </div>
      </div>
    </div>

    <!-- Column Manager Modal -->
    <div class="modal-overlay hidden" id="column-manager-overlay">
      <div class="modal" id="column-manager" style="max-width:400px">
        <div class="modal-header"><h3>Manage Columns</h3><button class="btn-icon" @click="store.closeColumnManager()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div class="modal-body" id="column-manager-body"></div>
        <div class="modal-footer"><button class="btn-primary" @click="store.addBoardColumn()">+ Add Column</button></div>
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

    <!-- Conversational task creation -->
    <div class="conv-task-overlay" id="conv-task-overlay">
      <div class="conv-task-modal" id="conv-task-modal">
        <div class="conv-task-header">
          <div class="conv-task-header-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            New task
          </div>
          <div class="conv-task-header-right">
            <button class="conv-advanced-link" @click="store.closeConvTask(); app.showTaskModal()">Advanced form</button>
            <button class="conv-close-btn" @click="store.closeConvTask()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- Answered questions scroll up here as a thread -->
        <div class="conv-thread" id="conv-thread"></div>

        <!-- Current question -->
        <div class="conv-current-block">
          <p class="conv-current-question" id="conv-current-question"></p>
          <p class="conv-current-hint" id="conv-current-hint"></p>
        </div>

        <!-- Dynamic input area -->
        <div class="conv-input-area" id="conv-input-area"></div>

        <!-- Skip -->
        <div class="conv-skip-row">
          <button class="conv-skip-btn" id="conv-skip-btn" @click="store._convSkip()">Skip</button>
        </div>
      </div>
    </div>

    <!-- Tour overlay (spotlight backdrop) -->
    <div id="tour-overlay" class="tour-overlay"></div>

    <!-- Tour tooltip -->
    <div id="tour-tooltip" class="tour-tooltip">
      <div class="tour-tooltip-header">
        <span id="tour-step-label" class="tour-step-label">Step 1 of 6</span>
        <button class="tour-skip-btn" @click="store.skipTour()">Skip tour</button>
      </div>
      <h3 id="tour-title" class="tour-title"></h3>
      <p id="tour-body" class="tour-body"></p>
      <div id="tour-dots" class="tour-dots"></div>
      <div class="tour-footer">
        <button id="tour-prev" class="btn-secondary btn-sm" @click="store.prevTourStep()">← Back</button>
        <button id="tour-next" class="btn-primary btn-sm" @click="store.nextTourStep()">Next →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, nextTick } from 'vue'
import { useAppStore } from '../stores/app.js'
import { TASK_EMOJI_PALETTE } from '../utils.js'
import Breadcrumb from './Breadcrumb.vue'
import SidebarProjectList from './SidebarProjectList.vue'
import SidebarRecents from './SidebarRecents.vue'
import SidebarUser from './SidebarUser.vue'
import NotificationsList from './NotificationsList.vue'
import HomeUpcomingDeadlines from './HomeUpcomingDeadlines.vue'
import HomeRecentActivity from './HomeRecentActivity.vue'
import HomeMyTasksOverview from './HomeMyTasksOverview.vue'
import WorkloadChart from './WorkloadChart.vue'
import SettingsAppearance from './SettingsAppearance.vue'

const store = useAppStore()

// Reactive nav-counter values previously updated imperatively by
// renderNavBadges. The Vue templates above bind directly to these.
const openTaskCount = computed(() => store.tasks.filter(t => t.status !== 'done' && store.isRootTask(t)).length)
const inProgressCount = computed(() => store.tasks.filter(t => t.status === 'in-progress' && store.isRootTask(t)).length)
const unreadCount = computed(() => store.notifications.filter(n => !n.read).length)

// OS-aware shortcut label for the Search kbd hint.
const shortcutLabel = computed(() => {
  if (typeof navigator === 'undefined') return 'Ctrl K'
  return /Mac|iPhone|iPad/i.test(navigator.platform) ? '⌘ K' : 'Ctrl K'
})

// User name for aria-label on the user-as-brand row.
const currentUserName = computed(() => {
  const u = (typeof store.getCurrentUser === 'function' && store.getCurrentUser()) || store.users[0]
  return u?.name || 'account'
})

// True when the project currently open in the Edit modal is archived — used
// to swap the Archive button for a Restore button in the modal footer.
const editingProjectArchived = computed(() => {
  if (!store.editingProjectId) return false
  const p = store.projects.find(x => x.id === store.editingProjectId)
  return !!p?.archived
})

// Quick-add popup Enter handler — reads the input, runs the smart-parser
// in `quickAdd`, closes the popup. Empty input is a no-op (the store
// already guards against that, but we close anyway for snappier feedback).
function onQuickAddEnter (e) {
  const input = e.target
  const text = (input.value || '').trim()
  if (text) store.quickAdd(text)
  input.value = ''
  store.closeQuickAdd()
}

onMounted(async () => {
  await nextTick()
  store.bindEvents()
  store.render()
})
</script>
