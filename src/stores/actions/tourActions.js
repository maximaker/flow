export const tourActions = {
  // ===== TOUR =====

  _tourSteps() {
    return [
      {
        selector: '.sidebar-nav',
        title: 'This is how you get around',
        body: 'Use the sidebar to switch between views — Home, My Tasks, Board, and your Projects.',
        position: 'right',
        pad: 6,
      },
      {
        selector: '[data-view="my-tasks"]',
        title: 'My Tasks is your home base',
        body: 'Every task assigned to you shows up here. This is where your day starts.',
        position: 'right',
      },
      {
        selector: '[data-view="board"]',
        title: 'Board view',
        body: 'Switch to Board to see tasks in columns — perfect for tracking what\'s in progress or stuck.',
        position: 'right',
      },
      {
        selector: '.nav-section:nth-child(3)',
        title: 'Keep things organized with Projects',
        body: 'Group related tasks under a project — like "Website Redesign" or "Q3 Goals". Hit + to create one.',
        position: 'right',
        pad: 6,
      },
      {
        view: 'my-tasks',
        selector: '#view-my-tasks .btn-primary',
        title: 'Add a task the full way',
        body: 'Click here to open the task form. Fill in the details — or just give it a name and come back to it later.',
        position: 'bottom',
      },
      {
        view: 'my-tasks',
        selector: '#inline-add-row',
        title: 'Or add one in two seconds',
        body: 'Click here, type a task name, and press Enter. No form, no steps, just done.',
        position: 'top',
      },
    ];
  },

  startTour() {
    this.tourActive = true;
    this.tourStep = 0;
    this._showTourOverlay();
    this._applyTourStep();
  },

  _showTourOverlay() {
    document.getElementById('tour-overlay')?.classList.add('active');
    document.getElementById('tour-tooltip')?.classList.add('active');
  },

  _applyTourStep() {
    const steps = this._tourSteps();
    const step = steps[this.tourStep];
    if (!step) { this.completeTour(); return; }

    // Navigate to required view first (if needed)
    const needsViewSwitch = step.view && this.currentView !== step.view;
    const apply = () => {
      requestAnimationFrame(() => {
        const el = document.querySelector(step.selector);
        if (!el) { this.nextTourStep(); return; }

        // Remove previous highlight
        document.querySelectorAll('.tour-target').forEach(e => e.classList.remove('tour-target'));
        el.classList.add('tour-target');

        // Populate tooltip content
        document.getElementById('tour-title').textContent = step.title;
        document.getElementById('tour-body').textContent = step.body;
        document.getElementById('tour-step-label').textContent = `${this.tourStep + 1} of ${steps.length}`;

        const prevBtn = document.getElementById('tour-prev');
        const nextBtn = document.getElementById('tour-next');
        if (prevBtn) prevBtn.style.visibility = this.tourStep === 0 ? 'hidden' : 'visible';
        if (nextBtn) nextBtn.textContent = this.tourStep === steps.length - 1 ? 'Done ✓' : 'Next →';

        // Update progress dots
        const dotsEl = document.getElementById('tour-dots');
        if (dotsEl) {
          dotsEl.innerHTML = steps.map((_, i) =>
            `<span class="tour-dot ${i === this.tourStep ? 'active' : ''}"></span>`
          ).join('');
        }

        // Position tooltip relative to the highlighted element
        const rect = el.getBoundingClientRect();
        const pad = step.pad || 0;
        const pos = step.position || 'right';
        const TW = 296, TH = 170;

        let top, left;
        if (pos === 'right') {
          top = rect.top + rect.height / 2 - TH / 2;
          left = rect.right + 16 + pad;
        } else if (pos === 'left') {
          top = rect.top + rect.height / 2 - TH / 2;
          left = rect.left - TW - 16 - pad;
        } else if (pos === 'bottom') {
          top = rect.bottom + 14 + pad;
          left = rect.left + rect.width / 2 - TW / 2;
        } else if (pos === 'top') {
          top = rect.top - TH - 14 - pad;
          left = rect.left + rect.width / 2 - TW / 2;
        }

        // Clamp to viewport with 16px margin
        top  = Math.max(16, Math.min(top,  window.innerHeight - TH - 16));
        left = Math.max(16, Math.min(left, window.innerWidth  - TW - 16));

        const tooltip = document.getElementById('tour-tooltip');
        if (tooltip) {
          tooltip.style.top  = `${top}px`;
          tooltip.style.left = `${left}px`;
          // Add directional class for the arrow
          tooltip.dataset.pos = pos;
        }
      });
    };

    if (needsViewSwitch) {
      this.switchView(step.view);
      setTimeout(apply, 120); // wait for view render
    } else {
      apply();
    }
  },

  nextTourStep() {
    const steps = this._tourSteps();
    if (this.tourStep >= steps.length - 1) { this.completeTour(); return; }
    this.tourStep++;
    this._applyTourStep();
  },

  prevTourStep() {
    if (this.tourStep <= 0) return;
    this.tourStep--;
    this._applyTourStep();
  },

  skipTour() {
    this._teardownTour();
    this.tourCompleted = true;
    this.save();
  },

  completeTour() {
    this._teardownTour();
    this.tourCompleted = true;
    this.save();
    this.switchView('my-tasks');
    setTimeout(() => this.toast("You're all set — let's get to work!", 'success'), 350);
  },

  _teardownTour() {
    this.tourActive = false;
    document.querySelectorAll('.tour-target').forEach(e => e.classList.remove('tour-target'));
    document.getElementById('tour-overlay')?.classList.remove('active');
    document.getElementById('tour-tooltip')?.classList.remove('active');
  },

  restartTour() {
    this.tourCompleted = false;
    this.save();
    this.startTour();
  },
}
