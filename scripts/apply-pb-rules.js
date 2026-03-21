/**
 * apply-pb-rules.js
 * Applies server-side PocketBase collection rules to enforce role-based access.
 * Run once from your local machine (needs network access to PocketBase).
 *
 * Usage:
 *   node scripts/apply-pb-rules.js <admin-email> <admin-password>
 *
 * Example:
 *   node scripts/apply-pb-rules.js admin@example.com myAdminPass
 */

const PB_URL = process.env.VITE_PB_URL || 'https://pb.thedigitalvitamins.com';

const [,, adminEmail, adminPassword] = process.argv;
if (!adminEmail || !adminPassword) {
  console.error('Usage: node scripts/apply-pb-rules.js <admin-email> <admin-password>');
  process.exit(1);
}

// ── Rule definitions ────────────────────────────────────────────────────────
//
// @request.auth.id != ""          → any authenticated user
// @request.auth.role = "admin"    → admin only
// @request.auth.role ?= "admin"   → admin (safe variant used in list rules)
//
// Access model:
//   admin  → full access to everything
//   user   → read/write tasks, projects, labels, notifications; cannot delete users
//   collaborator → read-only on most; can update tasks assigned to them
// ─────────────────────────────────────────────────────────────────────────────

const RULES = {
  tasks: {
    listRule:   '@request.auth.id != ""',
    viewRule:   '@request.auth.id != ""',
    // Any authenticated user can create tasks (collaborators may be assigned tasks)
    createRule: '@request.auth.id != ""',
    // Admins/users can update any task; collaborators only their own assigned tasks
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "user" || (@request.auth.role = "collaborator" && assigneeId = @request.auth.id)',
    // Only admins and users can delete tasks
    deleteRule: '@request.auth.role = "admin" || @request.auth.role = "user"',
  },
  projects: {
    listRule:   '@request.auth.id != ""',
    viewRule:   '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "user"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "user"',
    deleteRule: '@request.auth.role = "admin" || @request.auth.role = "user"',
  },
  labels: {
    listRule:   '@request.auth.id != ""',
    viewRule:   '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "user"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "user"',
    deleteRule: '@request.auth.role = "admin" || @request.auth.role = "user"',
  },
  notifications: {
    listRule:   '@request.auth.id != ""',
    viewRule:   '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },
  users: {
    listRule:   '@request.auth.id != ""',
    viewRule:   '@request.auth.id != ""',
    // Only admins can create new users (handled via PB auth, but rule is a safety net)
    createRule: '@request.auth.role = "admin"',
    // Admins can update anyone; users can only update themselves
    updateRule: '@request.auth.role = "admin" || @request.auth.id = id',
    // Only admins can delete users
    deleteRule: '@request.auth.role = "admin"',
  },
};

async function main() {
  // 1. Authenticate as admin
  console.log(`Connecting to ${PB_URL}...`);
  const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: adminEmail, password: adminPassword }),
  });
  if (!authRes.ok) {
    const err = await authRes.text();
    console.error('Admin auth failed:', err);
    process.exit(1);
  }
  const { token } = await authRes.json();
  console.log('✓ Authenticated as admin\n');

  // 2. Get all collections so we can map name → id
  const colRes = await fetch(`${PB_URL}/api/collections?perPage=100`, {
    headers: { Authorization: token },
  });
  const { items: collections } = await colRes.json();
  const byName = Object.fromEntries(collections.map(c => [c.name, c]));

  // 3. Apply rules to each collection
  for (const [name, rules] of Object.entries(RULES)) {
    const col = byName[name];
    if (!col) {
      console.warn(`⚠  Collection "${name}" not found — skipping`);
      continue;
    }
    const patchRes = await fetch(`${PB_URL}/api/collections/${col.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(rules),
    });
    if (patchRes.ok) {
      console.log(`✓ ${name}`);
    } else {
      const err = await patchRes.text();
      console.error(`✗ ${name}: ${err}`);
    }
  }

  console.log('\nDone. PocketBase collection rules are now enforced server-side.');
}

main().catch(e => { console.error(e); process.exit(1); });
