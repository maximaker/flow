#!/usr/bin/env node
/**
 * D-01 migration: extract embedded comments from task records into a
 * dedicated PocketBase `comments` collection.
 *
 * Usage:
 *   node scripts/migrate-comments.js <admin-email> <admin-password>
 *
 * What it does:
 *   1. Authenticates with PocketBase as admin
 *   2. Creates the `comments` collection if it doesn't exist
 *   3. Reads all tasks, finds any with task.comments[]
 *   4. Creates one `comments` record per embedded comment
 *   5. Clears task.comments[] from the task record once migrated
 *
 * Safe to re-run: skips tasks whose comments array is already empty.
 */

const PB_URL = process.env.PB_URL || 'https://pb.thedigitalvitamins.com';

async function pbFetch(path, options = {}) {
  const url = `${PB_URL}/api/${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: node scripts/migrate-comments.js <admin-email> <admin-password>');
    process.exit(1);
  }

  // 1. Authenticate
  console.log('Authenticating...');
  const auth = await pbFetch('admins/auth-with-password', {
    method: 'POST',
    body: JSON.stringify({ identity: email, password }),
  });
  const token = auth.token;
  const authHeader = { Authorization: token };

  // 2. Ensure `comments` collection exists
  console.log('Ensuring comments collection...');
  let collectionsRes;
  try {
    collectionsRes = await pbFetch('collections?filter=name="comments"', { headers: authHeader });
  } catch (e) {
    collectionsRes = { items: [] };
  }

  if (!collectionsRes.items?.length) {
    await pbFetch('collections', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        name: 'comments',
        type: 'base',
        fields: [
          { name: 'taskId',    type: 'text',     required: true },
          { name: 'userId',    type: 'text',     required: false },
          { name: 'text',      type: 'text',     required: true },
          { name: 'timestamp', type: 'text',     required: true },
        ],
        listRule:   '@request.auth.id != ""',
        viewRule:   '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: 'userId = @request.auth.id',
        deleteRule: 'userId = @request.auth.id',
      }),
    });
    console.log('Created comments collection.');
  } else {
    console.log('comments collection already exists.');
  }

  // 3. Load all tasks
  console.log('Loading tasks...');
  let page = 1, tasks = [];
  while (true) {
    const res = await pbFetch(`collections/tasks/records?page=${page}&perPage=200`, { headers: authHeader });
    tasks = tasks.concat(res.items || []);
    if (page >= res.totalPages) break;
    page++;
  }
  console.log(`Loaded ${tasks.length} tasks.`);

  // 4. Migrate comments
  let migrated = 0, skipped = 0;
  for (const task of tasks) {
    const comments = task.comments;
    if (!Array.isArray(comments) || comments.length === 0) { skipped++; continue; }

    console.log(`  Migrating ${comments.length} comment(s) from task ${task.id} (${task.title})...`);
    for (const c of comments) {
      try {
        await pbFetch('collections/comments/records', {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify({
            id:        c.id || undefined,
            taskId:    task.id,
            userId:    c.userId || '',
            text:      c.text || '',
            timestamp: c.timestamp || new Date().toISOString(),
          }),
        });
      } catch (e) {
        // Likely already migrated (duplicate id) — skip
        if (!e.message.includes('already exists')) console.warn(`    Warning: ${e.message}`);
      }
    }

    // 5. Clear embedded comments from the task record
    await pbFetch(`collections/tasks/records/${task.id}`, {
      method: 'PATCH',
      headers: authHeader,
      body: JSON.stringify({ comments: [] }),
    });
    migrated++;
  }

  console.log(`\nDone. Migrated ${migrated} tasks, skipped ${skipped} (already empty).`);
  console.log('\nNext step: update app.js loadData() to load comments from the');
  console.log('`comments` collection and merge them into task objects by taskId.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
