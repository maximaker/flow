// Smoke tests — verify the production bundle boots and the login screen
// is reachable. No PocketBase required; we don't actually log in.
import { test, expect } from '@playwright/test'

test.describe('Flow — smoke', () => {
  test('serves index.html with the expected title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Flow/i)
  })

  test('mounts the Vue app and shows the login screen', async ({ page }) => {
    await page.goto('/')
    // The Vue app populates #app; wait for either the login screen or the
    // logged-in shell to appear.
    const loginCard = page.locator('.login-card')
    const sidebar = page.locator('#sidebar')
    await expect(loginCard.or(sidebar)).toBeVisible({ timeout: 10_000 })
  })

  test('login screen has the expected reference-style fields', async ({ page }) => {
    await page.goto('/')
    // Skip if we somehow landed in a logged-in session (e.g. cached token).
    const loginCard = page.locator('.login-card')
    if (!(await loginCard.isVisible().catch(() => false))) test.skip()

    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /forgot your password/i })).toBeVisible()
  })

  test('show/hide password toggle works', async ({ page }) => {
    await page.goto('/')
    const loginCard = page.locator('.login-card')
    if (!(await loginCard.isVisible().catch(() => false))) test.skip()

    const password = page.getByLabel('Password')
    await password.fill('hunter2')
    await expect(password).toHaveAttribute('type', 'password')

    await page.getByRole('button', { name: /show password/i }).click()
    await expect(password).toHaveAttribute('type', 'text')

    await page.getByRole('button', { name: /hide password/i }).click()
    await expect(password).toHaveAttribute('type', 'password')
  })

  test('renders without any console errors on initial load', async ({ page }) => {
    const errors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/')
    // Give the app a moment to initialize and surface any errors.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // Ignore expected network errors against the placeholder PB URL.
    const real = errors.filter(
      (e) =>
        !/fetch|network|cors|pocketbase|aborted|cancelled/i.test(e) &&
        !/ECONNREFUSED|net::ERR/i.test(e),
    )
    expect(real, `console errors: ${real.join('\n')}`).toHaveLength(0)
  })
})
