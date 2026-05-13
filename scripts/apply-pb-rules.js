/**
 * apply-pb-rules.js
 * Applies server-side PocketBase collection rules AND ensures all schema
 * fields required by the client exist (additive only — never drops fields).
 *
 * Run on every deploy that changes either the rules or the SCHEMA_ADDITIONS
 * block below. Idempotent — re-running with no changes is a no-op.
 *
 * Usage:
 *   VITE_PB_URL=https://pb.example.com node scripts/apply-pb-rules.js <admin-email> <admin-password>
 */

const PB_URL = process.env.VITE_PB_URL;
if (!PB_URL) {
  console.error('VITE_PB_URL env var is required (refusing to default to a hardcoded URL — risk of overwriting prod rules unintentionally).');
  process.exit(1);
}

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
    // Admins and users can create tasks for anyone. Collaborators can create
    // tasks too but only with an empty assignee or themselves — preventing
    // a collaborator from silently assigning work to other people.
    createRule: '@request.auth.id != "" && (@request.auth.role = "admin" || @request.auth.role = "user" || assigneeId = "" || assigneeId = @request.auth.id)',
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
    // Owner-scoped: a user can only see / mutate their own notifications.
    listRule:   '@request.auth.id != "" && userId = @request.auth.id',
    viewRule:   '@request.auth.id != "" && userId = @request.auth.id',
    // create: any authenticated user, but only with their own userId stamped on it.
    createRule: '@request.auth.id != "" && userId = @request.auth.id',
    updateRule: '@request.auth.id != "" && userId = @request.auth.id',
    deleteRule: '@request.auth.id != "" && userId = @request.auth.id',
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

// ── Schema additions ───────────────────────────────────────────────────────
//
// Additive-only field migrations. The script reads the current collection
// schema, finds any field listed here that's missing, and appends it. It
// never modifies or removes existing fields — safe to re-run.
//
// PocketBase field types reference: text, number, bool, email, url, date,
// select, json, file, relation, editor.
// ────────────────────────────────────────────────────────────────────────────

const SCHEMA_ADDITIONS = {
  projects: [
    {
      name: 'icon',
      type: 'text',
      required: false,
      options: { min: null, max: 8, pattern: '' },
    },
    {
      name: 'managerId',
      type: 'relation',
      required: false,
      // collectionId is resolved at runtime from the `users` collection name.
      _relationCollection: 'users',
      options: { maxSelect: 1, cascadeDelete: false, minSelect: null },
    },
  ],
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

  // 3. Apply schema additions (idempotent — only adds missing fields).
  console.log('Schema additions:');
  for (const [name, fields] of Object.entries(SCHEMA_ADDITIONS)) {
    const col = byName[name];
    if (!col) {
      console.warn(`⚠  Collection "${name}" not found — skipping schema additions`);
      continue;
    }
    const existing = new Set((col.schema || []).map(f => f.name));
    const toAdd = fields.filter(f => !existing.has(f.name));
    if (!toAdd.length) {
      console.log(`✓ ${name}: schema already up to date`);
      continue;
    }
    // Resolve _relationCollection names → collectionId on the wire format.
    const resolved = toAdd.map(f => {
      const out = { ...f };
      if (f._relationCollection) {
        const target = byName[f._relationCollection];
        if (!target) throw new Error(`Relation target collection "${f._relationCollection}" not found for field ${name}.${f.name}`);
        out.options = { ...(f.options || {}), collectionId: target.id };
        delete out._relationCollection;
      }
      return out;
    });
    const newSchema = [...(col.schema || []), ...resolved];
    const schemaRes = await fetch(`${PB_URL}/api/collections/${col.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ schema: newSchema }),
    });
    if (schemaRes.ok) {
      console.log(`✓ ${name}: added ${toAdd.map(f => f.name).join(', ')}`);
      // Update local cache so the rules pass below sees the new schema.
      byName[name].schema = newSchema;
    } else {
      const err = await schemaRes.text();
      console.error(`✗ ${name} schema: ${err}`);
    }
  }

  // 4. Apply rules to each collection
  console.log('\nCollection rules:');
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

  console.log('\nDone. PocketBase schema and collection rules are now in sync.');
}

main().catch(e => { console.error(e); process.exit(1); });
