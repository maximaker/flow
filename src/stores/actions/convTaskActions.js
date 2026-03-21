// Conversational task creation — guided, one question at a time
export const convTaskActions = {

  // Steps definition
  _convSteps() {
    return [
      {
        id: 'title',
        question: "What needs to get done?",
        hint: null,
        type: 'text',
        placeholder: 'e.g. Write the quarterly report…',
        required: true,
      },
      {
        id: 'dueDate',
        question: "When does this need to be done by?",
        hint: null,
        type: 'date',
        skipLabel: "No deadline yet",
      },
      {
        id: 'assigneeId',
        question: "Who should work on this?",
        hint: null,
        type: 'users',
        skipLabel: "I'll assign it later",
      },
      {
        id: 'projectId',
        question: "Which project does this belong to?",
        hint: null,
        type: 'projects',
        skipLabel: "No project",
      },
      {
        id: 'priority',
        question: "How urgent is this?",
        hint: "Pick whichever feels right — you can change it later.",
        type: 'priority',
        skipLabel: "I'll decide later",
      },
    ];
  },

  openConvTask() {
    this.convStep = 0;
    this.convAnswers = {};
    this.convActive = true;
    const overlay = document.getElementById('conv-task-overlay');
    if (overlay) {
      overlay.classList.add('show');
      this._renderConvStep();
      setTimeout(() => {
        const input = document.querySelector('#conv-input-area input, #conv-input-area textarea');
        if (input) input.focus();
      }, 120);
    }
  },

  closeConvTask() {
    this.convActive = false;
    document.getElementById('conv-task-overlay')?.classList.remove('show');
  },

  _convAnswerLabel(step, value) {
    if (!value && value !== 0) return null;
    if (step.id === 'assigneeId') {
      const u = this.users.find(u => u.id === value);
      return u ? u.name : null;
    }
    if (step.id === 'projectId') {
      const p = this.projects.find(p => p.id === value);
      return p ? p.name : null;
    }
    if (step.id === 'priority') {
      const map = { p0: '🔴 Urgent', p1: '🟠 High', p2: '🟡 Normal', p3: '🔵 Low' };
      return map[value] || value;
    }
    if (step.id === 'dueDate') return this.formatDate(value);
    return value;
  },

  _renderConvThread() {
    const steps = this._convSteps();
    const thread = document.getElementById('conv-thread');
    if (!thread) return;

    let html = '';
    const answeredSteps = steps.slice(0, this.convStep);
    answeredSteps.forEach(step => {
      const raw = this.convAnswers[step.id];
      const label = raw ? this._convAnswerLabel(step, raw) : null;
      html += `
        <div class="conv-pair">
          <div class="conv-question">${this.esc(step.question)}</div>
          <div class="conv-answer ${!label ? 'skipped' : ''}">
            ${label ? this.esc(label) : '<em>Skipped</em>'}
          </div>
        </div>`;
    });
    thread.innerHTML = html;
    thread.scrollTop = thread.scrollHeight;
  },

  _renderConvStep() {
    const steps = this._convSteps();
    if (this.convStep >= steps.length) { this._convFinish(); return; }
    const step = steps[this.convStep];
    const isFirst = this.convStep === 0;

    // Question area
    const qEl = document.getElementById('conv-current-question');
    const hintEl = document.getElementById('conv-current-hint');
    if (qEl) qEl.textContent = step.question;
    if (hintEl) {
      hintEl.textContent = step.hint || '';
      hintEl.style.display = step.hint ? '' : 'none';
    }

    // Skip button
    const skipBtn = document.getElementById('conv-skip-btn');
    if (skipBtn) {
      if (step.required) {
        skipBtn.style.display = 'none';
      } else {
        skipBtn.style.display = '';
        skipBtn.textContent = step.skipLabel || 'Skip';
      }
    }

    // Build input area
    const area = document.getElementById('conv-input-area');
    if (!area) return;
    area.innerHTML = '';

    if (step.type === 'text') {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'conv-text-input';
      inp.placeholder = step.placeholder || '';
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && inp.value.trim()) this._convSubmit(inp.value.trim());
        if (e.key === 'Escape') this.closeConvTask();
      });
      const submitBtn = document.createElement('button');
      submitBtn.className = 'btn-primary conv-submit-btn';
      submitBtn.textContent = 'Continue →';
      submitBtn.addEventListener('click', () => {
        if (inp.value.trim()) this._convSubmit(inp.value.trim());
      });
      area.appendChild(inp);
      area.appendChild(submitBtn);
      setTimeout(() => inp.focus(), 60);

    } else if (step.type === 'date') {
      const inp = document.createElement('input');
      inp.type = 'date';
      inp.className = 'conv-date-input';
      inp.min = new Date().toISOString().split('T')[0];
      inp.addEventListener('change', () => {
        if (inp.value) this._convSubmit(inp.value);
      });
      area.appendChild(inp);
      setTimeout(() => inp.focus(), 60);

    } else if (step.type === 'users') {
      const visible = this.getVisibleUsers ? this.getVisibleUsers() : this.users;
      visible.forEach(u => {
        const btn = document.createElement('button');
        btn.className = 'conv-chip conv-chip-user';
        btn.innerHTML = `<span class="conv-chip-avatar" style="background:${this.safeColor(u.color)}">${this.initials(u.name)}</span>${this.esc(u.name)}`;
        btn.addEventListener('click', () => this._convSubmit(u.id));
        area.appendChild(btn);
      });

    } else if (step.type === 'projects') {
      if (this.projects.length === 0) {
        // Auto-skip if no projects
        this._convSkip();
        return;
      }
      this.projects.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'conv-chip conv-chip-project';
        btn.innerHTML = `<span class="conv-chip-dot" style="background:${p.color}"></span>${this.esc(p.name)}`;
        btn.addEventListener('click', () => this._convSubmit(p.id));
        area.appendChild(btn);
      });

    } else if (step.type === 'priority') {
      const opts = [
        { value: 'p0', label: '🔴 Urgent', sub: 'Drop everything' },
        { value: 'p1', label: '🟠 High', sub: 'Important this week' },
        { value: 'p2', label: '🟡 Normal', sub: 'Gets done eventually' },
        { value: 'p3', label: '🔵 Low', sub: 'Nice to have' },
      ];
      opts.forEach(o => {
        const btn = document.createElement('button');
        btn.className = 'conv-chip conv-chip-priority';
        btn.innerHTML = `<span class="conv-priority-label">${o.label}</span><span class="conv-priority-sub">${o.sub}</span>`;
        btn.addEventListener('click', () => this._convSubmit(o.value));
        area.appendChild(btn);
      });
    }

    this._renderConvThread();
  },

  _convSubmit(value) {
    const steps = this._convSteps();
    const step = steps[this.convStep];
    this.convAnswers[step.id] = value;
    this.convStep++;
    this._nextConvStep();
  },

  _convSkip() {
    const steps = this._convSteps();
    const step = steps[this.convStep];
    if (!step || step.required) return;
    // Record skip as null/empty
    this.convAnswers[step.id] = null;
    this.convStep++;
    this._nextConvStep();
  },

  _nextConvStep() {
    const area = document.getElementById('conv-input-area');
    if (area) {
      area.style.opacity = '0';
      area.style.transform = 'translateY(8px)';
      setTimeout(() => {
        area.style.transition = '';
        area.style.opacity = '';
        area.style.transform = '';
        this._renderConvStep();
        requestAnimationFrame(() => {
          area.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
          area.style.opacity = '1';
          area.style.transform = 'translateY(0)';
        });
      }, 140);
    } else {
      this._renderConvStep();
    }
  },

  _convFinish() {
    // Show summary / confirm screen
    const a = this.convAnswers;
    const steps = this._convSteps();

    this._renderConvThread();

    const qEl = document.getElementById('conv-current-question');
    const hintEl = document.getElementById('conv-current-hint');
    const skipBtn = document.getElementById('conv-skip-btn');
    const area = document.getElementById('conv-input-area');

    if (qEl) qEl.textContent = "Looks good! Ready to create this task?";
    if (hintEl) { hintEl.textContent = 'You can always edit the details afterwards.'; hintEl.style.display = ''; }
    if (skipBtn) skipBtn.style.display = 'none';

    if (area) {
      area.innerHTML = '';
      const createBtn = document.createElement('button');
      createBtn.className = 'btn-primary conv-create-btn';
      createBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Create task';
      createBtn.addEventListener('click', () => this._convCreate());

      const backBtn = document.createElement('button');
      backBtn.className = 'btn-secondary conv-back-btn';
      backBtn.textContent = '← Start over';
      backBtn.addEventListener('click', () => { this.convStep = 0; this.convAnswers = {}; this._renderConvStep(); });

      area.appendChild(createBtn);
      area.appendChild(backBtn);
    }
  },

  _convCreate() {
    const a = this.convAnswers;
    if (!a.title) return;
    const task = {
      id: this.generateId(),
      title: a.title,
      description: '',
      status: this.boardColumns[0]?.id || 'todo',
      projectId: a.projectId || '',
      assigneeId: a.assigneeId || (this.currentUserId || ''),
      dueDate: a.dueDate || '',
      priority: a.priority || '',
      labelIds: [],
      blockedBy: [],
      order: this.tasks.length,
      parentId: '',
      attachments: [],
      comments: [],
      activityLog: [{ text: 'Task created', timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.tasks.push(task);
    this.save();
    this.closeConvTask();
    this.renderMyTasks();
    // Brief celebration toast with task name
    this.toast(`✓ "${a.title}" added`, 'success');
    // Highlight the new task in the list
    setTimeout(() => {
      const el = document.querySelector(`[data-task-id="${task.id}"]`);
      if (el) {
        el.classList.add('just-created');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
  },
}
