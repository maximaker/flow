# syntax=docker/dockerfile:1.7

# ─── Stage 1: build ─────────────────────────────────────────────────────────
# Pinned to Node 20 LTS Alpine for reproducible builds. Bump deliberately.
FROM node:20.18-alpine AS builder

# VITE_PB_URL is baked into the bundle at build time. Required — there is no
# safe default; building without it would silently produce a broken artifact.
ARG VITE_PB_URL
ENV VITE_PB_URL=${VITE_PB_URL}
RUN test -n "$VITE_PB_URL" || (echo "VITE_PB_URL build arg is required" >&2 && exit 1)

WORKDIR /app
# Copy lockfile first so the install layer caches across source-only changes.
COPY package.json package-lock.json ./
# `npm ci` uses the lockfile verbatim — non-mutating, reproducible.
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ─── Stage 2: runtime ───────────────────────────────────────────────────────
# nginx-alpine: small (~25 MB), proper PID 1 signal handling, real cache and
# security headers, gzip on by default. Pinned to a stable tag.
FROM nginx:1.27-alpine

# Drop the default site config and replace with ours.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static assets — nginx-alpine runs as root by default, but the worker
# processes drop to the `nginx` user defined in /etc/nginx/nginx.conf.
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

# Container-level healthcheck — orchestrator can detect a wedged process.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

# nginx already handles SIGTERM properly, no tini needed.
CMD ["nginx", "-g", "daemon off;"]
