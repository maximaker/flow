# Flow

A project-management SPA — tasks, boards, timelines, comments — backed by [PocketBase](https://pocketbase.io).

## Stack

- **Frontend**: Vue 3 + Pinia, built with Vite
- **Backend**: PocketBase (auth, realtime, REST)
- **Tests**: Vitest + happy-dom
- **Production server**: nginx (see `Dockerfile` + `nginx.conf`)

## Local development

Requires Node ≥ 20 and a reachable PocketBase instance.

```bash
echo "VITE_PB_URL=https://your-pocketbase.example.com" > .env
npm install
npm run dev          # http://localhost:5173 with HMR
```

| Script                  | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `npm run dev`           | Vite dev server with HMR                                      |
| `npm run build`         | Production bundle into `dist/`                                |
| `npm run preview`       | Serve the built bundle locally (port 4173)                    |
| `npm test`              | Run the Vitest suite once (unit + integration)                |
| `npm run test:watch`    | Vitest in watch mode                                          |
| `npm run test:e2e`      | Run Playwright smoke tests against the built bundle           |
| `npm run lint`          | ESLint with warnings allowed                                  |
| `npm run lint:fix`      | ESLint auto-fix                                               |
| `npm run lint:errors`   | ESLint errors-only (CI-strict; fails on any error)            |
| `npm run size`          | Check gzipped bundle size against the budget                  |

## Project layout

```
src/
  App.vue                      # auth gate + global error boundary
  main.js                      # entry — creates the Pinia store and mounts App
  pb.js                        # PocketBase SDK wrapper (reads VITE_PB_URL)
  utils.js                     # pure helpers (esc, safeColor, safeUrl, safeId, markdown…)
  components/
    LoginScreen.vue            # email/password login + reset flow
    AppShell.vue               # the static DOM scaffold the renderer paints into
  stores/
    app.js                     # the single Pinia store; spreads action modules
    actions/
      authActions.js           # login / logout / changePassword / session expiry
      syncActions.js           # PocketBase load + realtime + cross-tab sync
      taskActions.js           # CRUD + comments + attachments
      projectActions.js, labelActions.js, userActions.js
      renderActions.js         # all view-rendering paths (home / board / timeline / …)
      tourActions.js           # first-run product tour
      convTaskActions.js       # conversational task-creation flow
scripts/
  apply-pb-rules.js            # one-shot — pushes role-based rules to live PB
  migrate-comments.js          # one-shot — older data migration
tests/                         # Vitest — store + utils + integration
nginx.conf                     # production static-server config
Dockerfile                     # multi-stage build (node → nginx)
.github/workflows/ci.yml       # test + build + npm audit on every PR
```

## Backend setup

Once your PocketBase instance is running, push the role-based collection rules **and** schema additions:

```bash
VITE_PB_URL=https://your-pocketbase.example.com \
  node scripts/apply-pb-rules.js <admin-email> <admin-password>
```

The script does two things, both idempotent:

1. **Schema additions** — appends any missing fields listed in `SCHEMA_ADDITIONS`
   to their collections (today: `projects.icon`, `projects.managerId`). Existing
   fields are never modified or removed.
2. **Collection rules** — pushes the role-based list/view/create/update/delete
   rules in `RULES`.

Re-run it after every release where either block changes. Safe to re-run with no
changes (no-op).

## Production deployment

The `Dockerfile` builds a production bundle and serves it from `nginx:1.27-alpine`
on port **8080**. `VITE_PB_URL` is required at build time:

```bash
docker build --build-arg VITE_PB_URL=https://your-pocketbase.example.com -t flow .
docker run -p 8080:8080 flow
```

`nginx.conf` sets:

- Strict CSP, HSTS, `X-Frame-Options`, `Permissions-Policy`, `Referrer-Policy`
- Far-future immutable cache on hashed `/assets/*`, no-cache on `index.html`
- gzip, SPA fallback to `/index.html`
- A container `HEALTHCHECK` so orchestrators can detect a wedged process

## Deploy runbook

End-to-end sequence for a clean release:

1. **CI is green on the target commit.** The GitHub Actions workflow at
   [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `lint:errors`,
   `test`, `build`, `size` (bundle budget) and Playwright E2E. All must pass.
2. **Build the image** with the production PB URL baked in. The build arg is
   required — there is no safe default.
   ```bash
   docker build \
     --build-arg VITE_PB_URL=https://pb.example.com \
     -t flow:$(git rev-parse --short HEAD) .
   ```
   Optionally set `--build-arg VITE_RELEASE=$(git rev-parse HEAD)` so error
   reports stamp the deploy SHA, and `--build-arg VITE_ERROR_REPORT_URL=...`
   if you've configured an error-reporting endpoint.
3. **Run the PocketBase migration** against the same PB URL. Idempotent —
   re-run on every release.
   ```bash
   VITE_PB_URL=https://pb.example.com \
     node scripts/apply-pb-rules.js <admin-email> <admin-password>
   ```
4. **Push the image** to your registry and roll the container. nginx serves on
   port 8080, has `HEALTHCHECK` baked in, drops connections cleanly on SIGTERM.
5. **Smoke-test** the deploy: load the login page, sign in, confirm the
   sidebar renders, create + delete a task.

### Environment variables

See [.env.example](.env.example) for the full list. The only required one is
`VITE_PB_URL`; the rest are optional:

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_PB_URL` | yes | PocketBase backend URL (no trailing slash) |
| `VITE_ERROR_REPORT_URL` | no | POST endpoint for error reports — Sentry, Logtail, your own backend |
| `VITE_RELEASE` | no | Release identifier stamped on each error payload (use the git SHA in CI) |

## Architectural notes

The Vue layer is a static scaffold (`AppShell.vue`); most view rendering happens
through `renderActions.js`, which builds HTML strings and assigns them to
`innerHTML` on placeholder `<div>`s. A `window.app` proxy (defined in `App.vue`)
is what makes the inline `onclick="app.foo()"` handlers in those strings work.

Migrating the renderer to native Vue templates is on the roadmap — once
complete, the CSP `script-src 'unsafe-inline'` allowance can be dropped.
