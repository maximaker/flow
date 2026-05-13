#!/usr/bin/env node
/**
 * Bundle size budget check. Reads the built artifacts under dist/assets/,
 * computes gzipped size for each, and exits non-zero if any file exceeds
 * its budget. Run after `npm run build`.
 *
 * Pure Node — no extra deps (just zlib). Adjust BUDGETS as the app grows;
 * keep increases deliberate rather than incidental.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const DIST = 'dist/assets'

// Gzipped-size budgets in bytes. Set ~10-15% above current so day-to-day
// changes don't trip the check; deliberate growth requires bumping these.
const BUDGETS = {
  // App code chunk — the one that changes on most deploys.
  appJs: { pattern: /^index-.*\.js$/, max: 72 * 1024 },
  // Vendor chunk — should rarely change (pinia/vue/pocketbase).
  vendorJs: { pattern: /^vendor-.*\.js$/, max: 44 * 1024 },
  // Single CSS bundle — eligible for splitting later but capped for now.
  css: { pattern: /^index-.*\.css$/, max: 24 * 1024 },
}

function gz(path) {
  return gzipSync(readFileSync(path)).length
}

function fmt(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`
}

let failed = false
const files = readdirSync(DIST)

for (const [name, { pattern, max }] of Object.entries(BUDGETS)) {
  const match = files.find((f) => pattern.test(f))
  if (!match) {
    console.error(`✗ ${name}: no file matched ${pattern}`)
    failed = true
    continue
  }
  const size = gz(join(DIST, match))
  const pct = Math.round((size / max) * 100)
  const ok = size <= max
  const icon = ok ? '✓' : '✗'
  console.log(
    `${icon} ${name.padEnd(10)} ${match.padEnd(36)} ${fmt(size).padStart(10)} gz / ${fmt(max)} (${pct}%)`,
  )
  if (!ok) failed = true
}

if (failed) {
  console.error('\nBundle size budget exceeded. Either reduce bundle size or bump the limit in scripts/check-bundle-size.js.')
  process.exit(1)
}
console.log('\nBundle size within budget.')
