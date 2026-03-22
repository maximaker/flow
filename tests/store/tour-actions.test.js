/**
 * tests/store/tour-actions.test.js
 * Tests for onboarding tour state management.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tourActions } from '../../src/stores/actions/tourActions.js'

// ─── Minimal DOM setup ────────────────────────────────────────────────────

function setupTourDOM() {
  document.body.innerHTML = `
    <div id="tour-overlay"></div>
    <div id="tour-tooltip">
      <span id="tour-title"></span>
      <span id="tour-body"></span>
      <span id="tour-step-label"></span>
      <button id="tour-prev"></button>
      <button id="tour-next"></button>
      <div id="tour-dots"></div>
    </div>
    <nav class="sidebar-nav">
      <a class="nav-item" data-view="my-tasks">My Tasks</a>
      <a class="nav-item" data-view="board">Board</a>
    </nav>
    <div id="view-my-tasks">
      <button class="btn-primary">Add Task</button>
      <div id="inline-add-row"></div>
    </div>
  `
}

// ─── Mock store ────────────────────────────────────────────────────────────

function makeTourStore(overrides = {}) {
  const store = {
    tourActive: false,
    tourStep: 0,
    tourCompleted: false,
    currentView: 'home',
    save: vi.fn(),
    toast: vi.fn(),
    switchView: vi.fn(function(view) { this.currentView = view }),
    ...overrides,
  }
  // Bind all tour actions
  Object.entries(tourActions).forEach(([key, fn]) => {
    if (typeof fn === 'function') store[key] = fn.bind(store)
  })
  return store
}

// ═══════════════════════════════════════════════════════════════════════════

describe('tourActions — state management', () => {
  beforeEach(setupTourDOM)

  it('startTour sets tourActive = true and tourStep = 0', () => {
    const store = makeTourStore()
    store.startTour()
    expect(store.tourActive).toBe(true)
    expect(store.tourStep).toBe(0)
  })

  it('startTour adds "active" to tour-overlay', () => {
    const store = makeTourStore()
    store.startTour()
    expect(document.getElementById('tour-overlay').classList.contains('active')).toBe(true)
  })

  it('skipTour sets tourCompleted = true and calls save', () => {
    const store = makeTourStore({ tourActive: true })
    store.skipTour()
    expect(store.tourCompleted).toBe(true)
    expect(store.tourActive).toBe(false)
    expect(store.save).toHaveBeenCalled()
  })

  it('skipTour removes tour-target class from all elements', () => {
    setupTourDOM()
    const nav = document.querySelector('.sidebar-nav')
    nav.classList.add('tour-target')
    const store = makeTourStore({ tourActive: true })
    store.skipTour()
    expect(nav.classList.contains('tour-target')).toBe(false)
  })

  it('completeTour sets tourCompleted = true, calls save, and navigates to my-tasks', () => {
    const store = makeTourStore({ tourActive: true, tourStep: 5 })
    store.completeTour()
    expect(store.tourCompleted).toBe(true)
    expect(store.tourActive).toBe(false)
    expect(store.save).toHaveBeenCalled()
    expect(store.switchView).toHaveBeenCalledWith('my-tasks')
  })

  it('completeTour shows a toast', () => {
    vi.useFakeTimers()
    const store = makeTourStore({ tourActive: true })
    store.completeTour()
    vi.runAllTimers()
    expect(store.toast).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('nextTourStep increments tourStep', () => {
    const store = makeTourStore({ tourActive: true, tourStep: 0 })
    store.nextTourStep()
    expect(store.tourStep).toBe(1)
  })

  it('prevTourStep decrements tourStep', () => {
    const store = makeTourStore({ tourActive: true, tourStep: 2 })
    store.prevTourStep()
    expect(store.tourStep).toBe(1)
  })

  it('prevTourStep does not go below 0', () => {
    const store = makeTourStore({ tourActive: true, tourStep: 0 })
    store.prevTourStep()
    expect(store.tourStep).toBe(0)
  })

  it('nextTourStep calls completeTour on last step', () => {
    const steps = tourActions._tourSteps.call({})
    const lastIndex = steps.length - 1
    const store = makeTourStore({ tourActive: true, tourStep: lastIndex })
    store.nextTourStep()
    expect(store.tourCompleted).toBe(true)
  })

  it('restartTour resets tourCompleted and starts the tour', () => {
    const store = makeTourStore({ tourCompleted: true, tourActive: false })
    store.restartTour()
    expect(store.tourCompleted).toBe(false)
    expect(store.tourActive).toBe(true)
    expect(store.tourStep).toBe(0)
  })

  it('_teardownTour sets tourActive = false and clears overlay', () => {
    document.getElementById('tour-overlay').classList.add('active')
    document.getElementById('tour-tooltip').classList.add('active')
    const nav = document.querySelector('.sidebar-nav')
    nav.classList.add('tour-target')

    const store = makeTourStore({ tourActive: true })
    store._teardownTour()

    expect(store.tourActive).toBe(false)
    expect(document.getElementById('tour-overlay').classList.contains('active')).toBe(false)
    expect(document.getElementById('tour-tooltip').classList.contains('active')).toBe(false)
    expect(nav.classList.contains('tour-target')).toBe(false)
  })

  it('_tourSteps returns an array of 6 steps', () => {
    const steps = tourActions._tourSteps.call({})
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(5)
    steps.forEach(step => {
      expect(step).toHaveProperty('selector')
      expect(step).toHaveProperty('title')
      expect(step).toHaveProperty('body')
    })
  })
})
