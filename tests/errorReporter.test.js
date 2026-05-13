/**
 * tests/errorReporter.test.js
 * Tests the vendor-agnostic error reporter — captureError buffering,
 * payload shape, and console-logging when no endpoint is configured.
 *
 * Note: VITE_ERROR_REPORT_URL is empty in this test environment, so the
 * reporter is in console-only mode. The buffer should remain empty.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { captureError, captureMessage, _peekBuffer } from '../src/lib/errorReporter.js'

describe('errorReporter — no endpoint configured', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('logs errors to console.error', () => {
    captureError(new Error('boom'))
    expect(console.error).toHaveBeenCalledWith(
      '[Flow]',
      expect.any(Error),
      expect.any(Object),
    )
  })

  it('logs string messages too', () => {
    captureError('something went sideways')
    expect(console.error).toHaveBeenCalled()
  })

  it('does not buffer when no endpoint is set', () => {
    captureError(new Error('x'))
    captureMessage('hello', 'info')
    // captureError pushes to the buffer only when endpoint is set; without
    // an endpoint the buffer stays empty.
    expect(_peekBuffer()).toEqual([])
  })

  it('passes structured context to the console', () => {
    captureError(new Error('with context'), { taskId: 'abc', userId: 'xyz' })
    const lastCall = console.error.mock.calls.at(-1)
    expect(lastCall[2]).toMatchObject({ taskId: 'abc', userId: 'xyz' })
  })
})
