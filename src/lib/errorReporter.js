/**
 * Vendor-agnostic error reporter. POSTs error payloads to a configurable
 * endpoint when `VITE_ERROR_REPORT_URL` is set; logs to the console
 * otherwise. Designed so the bundle has zero monitoring-vendor lock-in —
 * point the env var at:
 *
 *   - Sentry's "Tunnel" endpoint or a relay
 *   - A serverless function you control
 *   - A logging service like Logflare / Logtail / Better Stack
 *   - Your own backend's /errors route
 *
 * The payload shape is intentionally simple and JSON-only so any HTTP
 * receiver can ingest it.
 */

const endpoint = import.meta.env.VITE_ERROR_REPORT_URL || ''
const release = import.meta.env.VITE_RELEASE || 'flow@dev'
const environment = import.meta.env.MODE || 'production'

// Buffer for retry when offline. Capped so a long offline session doesn't
// balloon memory. Oldest entries fall off the front.
const BUFFER_CAP = 50
const buffer = []

function makePayload(err, context) {
  return {
    message: err?.message || String(err),
    stack: err?.stack || undefined,
    name: err?.name || undefined,
    timestamp: new Date().toISOString(),
    release,
    environment,
    url: typeof location !== 'undefined' ? location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    context: context && Object.keys(context).length ? context : undefined,
  }
}

function flush() {
  if (!endpoint || !buffer.length) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  const batch = buffer.splice(0, buffer.length)
  const body = JSON.stringify(batch)
  // Prefer sendBeacon — survives page unload and is fire-and-forget.
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' })
    const ok = navigator.sendBeacon(endpoint, blob)
    if (!ok) buffer.unshift(...batch) // re-queue if browser refused
    return
  }
  // Fallback for environments without sendBeacon.
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Re-queue on network failure so the next online event picks them up.
    buffer.unshift(...batch.slice(-BUFFER_CAP))
  })
}

/**
 * Report an error. Safe to call before init(); the payload buffers and
 * flushes when network is available.
 *
 * @param {Error|string} err - error instance or message
 * @param {object} [context] - free-form structured context, e.g. { taskId, userId }
 */
export function captureError(err, context = {}) {
  // Always surface to the dev console — production builds strip console.log
  // via vite.config.js but keep console.error, which is what we use here.
  // eslint-disable-next-line no-console
  console.error('[Plans]', err, context)
  if (!endpoint) return
  buffer.push(makePayload(err, context))
  if (buffer.length > BUFFER_CAP) buffer.splice(0, buffer.length - BUFFER_CAP)
  flush()
}

/**
 * Capture a non-error log message (e.g. a known-bad state worth tracking).
 */
export function captureMessage(msg, level = 'info', context = {}) {
  if (!endpoint) return
  buffer.push({ ...makePayload(new Error(msg), context), level })
  flush()
}

/**
 * Install global handlers and start the offline-retry listener. Safe to
 * call multiple times — guards against double-binding. Returns a teardown
 * function (useful in tests).
 */
let installed = false
export function init() {
  if (installed || typeof window === 'undefined') return () => {}
  installed = true

  const onError = (event) => {
    captureError(event.error || event.message || 'window.error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  }
  const onRejection = (event) => {
    captureError(event.reason || 'unhandledrejection', { kind: 'unhandledrejection' })
  }
  const onOnline = () => flush()

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  window.addEventListener('online', onOnline)
  // Best-effort flush before the page closes.
  window.addEventListener('pagehide', flush)

  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('pagehide', flush)
    installed = false
  }
}

/** Test-only: peek at the in-memory buffer. */
export function _peekBuffer() {
  return buffer.slice()
}
