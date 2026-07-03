# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a multi-tenant ML model management platform (ModelOps) organized as a monorepo with three services:

- **`backend/`** — NestJS REST API (port 3000). See [`backend/CLAUDE.md`](backend/CLAUDE.md) for module-level rules.
- **`frontend/`** — Next.js 16 App Router dashboard (port 3001). See [`frontend/CLAUDE.md`](frontend/CLAUDE.md) for component-level rules.
- **`services/mcp-server/`** — Model Context Protocol server (port 3030) exposing backend tools to AI assistants.

## Development Setup

### Prerequisites

- Native Windows PostgreSQL 18 service running on port 5432 (`postgresql-x64-18`)
  - Credentials: `postgres` / `khalid` / database `aidb`
- Docker Desktop (for Redis, MinIO, observability stack)

### Running the project

**Option A — Backend in Docker (easiest):**

```bash
# From repo root
docker compose up -d --build

# Frontend separately
cd frontend && npm run dev
```

**Option B — Full local development (hot-reload for backend changes):**

```bash
# Start Docker services, then stop the dockerized backend
docker compose up -d
docker compose stop backend gateway

# Backend (hot-reload)
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

### Per-service commands

| Task        | Backend            | Frontend           | MCP Server          |
| ----------- | ------------------ | ------------------ | ------------------- |
| Dev (watch) | `npm run dev`      | `npm run dev`      | `npm run dev`       |
| Build       | `npm run build`    | `npm run build`    | `npm run build`     |
| Lint        | `npm run lint`     | `npm run lint`     | —                   |
| Type check  | —                  | `npx tsc --noEmit` | `npm run typecheck` |
| Unit tests  | `npm run test`     | —                  | —                   |
| E2E tests   | `npm run test:e2e` | —                  | —                   |
| Format      | `npm run format`   | —                  | —                   |

### Service ports

| Service             | Port        |
| ------------------- | ----------- |
| Frontend            | 3001        |
| Backend API         | 3000        |
| PostgreSQL (native) | 5432        |
| Redis               | 6380        |
| MinIO API / Console | 9000 / 9001 |
| Grafana             | 3005        |
| Prometheus          | 9090        |
| Loki                | 3100        |
| MCP Server          | 3030        |

## Architecture

### Backend (NestJS + TypeORM)

Code lives under `backend/src/` in two trees:

- **`modules/`** — bounded feature domains: `auth`, `users`, `models`, `deployments`, `wallets`, `organizations`, `analytics`, `fraud`. Each module owns its controllers, services, entities, enums, and interfaces.
- **`shared/`** — infrastructure: `queue` (BullMQ), `docker`, `minio`, `redis`, `opensearch`, `mail`, `stripe`, `security`, `utils`.

All routes are prefixed `/api/v1`. Authentication uses JWT (Bearer) for dashboard users and `ml_sk_*` API keys for model prediction endpoints. Organization-level access uses `org_*` keys.

**Model build/deploy flow:** Creating a model version enqueues a BullMQ job → the job pulls the Python artifact from MinIO, selects the right base Docker image (PyTorch, TensorFlow, scikit-learn, Diffusion), builds the container, and registers it. Deployments route prediction requests to versioned containers.

**Billing:** Credit-based wallet system in EGP. CONSUMER wallets (users) are debited per prediction; PROVIDER wallets (organizations) receive earnings. Stripe webhooks handle credit top-ups.

### Frontend (Next.js App Router)

```
src/
├── app/               # File-based routing (route groups: (auth), (dashboard), (public))
├── components/        # ui/ (atoms), layout/ (shell), providers/, and domain sub-folders
├── lib/
│   ├── actions/       # Server Actions — always return discriminated union { success, data } | { success: false, error }
│   ├── services/      # Isomorphic API layer (smartFetch-based, works server + client)
│   ├── schemas/       # Zod validation schemas by domain
│   └── utils/         # Pure helpers including smartFetch
├── hooks/             # Custom React hooks (complex state, polling, uploads)
├── types/             # Centralized TS interfaces re-exported from types/index.ts
└── auth.ts            # NextAuth config + JWT refresh callbacks
```

`smartFetch<T>()` is the canonical HTTP utility — auto-attaches JWT, uniform error handling. All API calls must go through the service layer, not inline in components or pages.

### MCP Server

Exposes backend capabilities (model management, analytics, organization context) as MCP tools for AI assistants. Token-based auth with rate limiting. Built as ESM TypeScript with Express HTTP transport.

### Observability Stack (Docker)

OpenTelemetry → collector → Prometheus (metrics) + Loki (logs). Grafana at port 3005 unifies both. Winston log transport includes `trace_id` and `span_id` for log-trace correlation.

## Cross-cutting Rules

Both `backend/CLAUDE.md` and `frontend/CLAUDE.md` enforce:

1. **Zero `any`** — use `unknown`, explicit generics, or `Record<string, unknown>` for dynamic shapes.
2. **JSDoc on everything** — every class, public method, hook, server action, and component.
3. **File size limits** — backend controllers/services ≤ 200 lines; frontend pages/components ≤ 250 lines.
4. **Early returns** — guard clauses over nested `if/else`.
5. **No direct cross-module imports** — import a module's public exports, never its internal subdirectories.
6. **TypeORM migrations** — never use `synchronize: true`; all schema changes go through migrations.
