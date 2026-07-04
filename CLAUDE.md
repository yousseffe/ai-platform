# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a multi-tenant ML model management platform (ModelOps) organized as a monorepo with three services:

- **`backend/`** — NestJS REST API (port 3000).
- **`frontend/`** — Next.js 16 App Router dashboard (port 3001). See [`frontend/CLAUDE.md`](frontend/CLAUDE.md) for component-level rules (roles, JSDoc standards, file layout).
- **`services/mcp-server/`** — Model Context Protocol server (port 3030) exposing backend tools to AI assistants.

Additional docs: `RUNNING.md` (run guide), `PIPELINE.md` / `docs/pipelines.md` (pipeline feature), `MINIO.md`.

## Development Setup

### Prerequisites

- Native Windows PostgreSQL 18 service running on port 5432 (`postgresql-x64-18`)
  - Credentials: `postgres` / `khalid` / database `aidb`
  - There is **no postgres service in `docker-compose.yml`** — the database is always the native Windows service.
- Docker Desktop (for Redis, MinIO, OpenSearch, LLM sidecar, observability stack)

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

Backend extras:

- Single test file: `npm run test -- path/to/file.spec.ts` (Jest matches `*.spec.ts` under `src/`)
- Watch / coverage: `npm run test:watch` / `npm run test:cov`
- Seed an admin user: `npm run create:admin`

### Service ports

| Service              | Port        |
| -------------------- | ----------- |
| Frontend             | 3001        |
| Backend API          | 3000        |
| Nginx gateway        | 80          |
| PostgreSQL (native)  | 5432        |
| Redis                | 6380        |
| MinIO API / Console  | 9000 / 9001 |
| OpenSearch           | 9200        |
| llama.cpp LLM server | 8080        |
| Grafana              | 3005        |
| Prometheus           | 9090        |
| Alertmanager         | 9093        |
| Loki                 | 3100        |
| OTLP (gRPC / HTTP)   | 4317 / 4318 |
| MCP Server           | 3030        |

## Architecture

### Backend (NestJS + TypeORM)

Code lives under `backend/src/` in two trees:

- **`modules/`** — bounded feature domains: `auth`, `users`, `models`, `deployments`, `pipelines`, `wallets`, `billing`, `organizations`, `provider-accounts`, `analytics`, `fraud`, `admin-dashboard`, `admin-mcp`. Each module owns its controllers, services, entities, enums, and interfaces.
- **`shared/`** — infrastructure: `queue` (BullMQ processors + the Python `serve.py` template baked into model containers), `docker`, `minio`, `redis`, `opensearch`, `mail`, `stripe`, `security`, `middleware`, `enums`, `utils`.

All routes are prefixed `/api/v1` (set in `main.ts`).

**Authentication** (resolved in `modules/auth/services/api-identity.service.ts` by token prefix):

- JWT Bearer tokens — dashboard users
- `ml_sk_live_*` / `ml_sk_trial_*` — personal/trial model prediction keys
- `sk_live_*` — organization API keys
- `mcp_*` — MCP server tokens

**Model build/deploy flow:** Creating a model version enqueues a BullMQ job → the job pulls the Python artifact from MinIO, selects the right base Docker image (PyTorch, TensorFlow, scikit-learn, Diffusion — Dockerfiles in `docker/base-images/`, prebuilt via `build-base-images.bat`/`.sh`), builds the container via the mounted Docker socket, and registers it. Deployments route prediction requests to versioned containers on the `ai-platform_models` Docker network.

**Billing:** Credit-based wallet system in EGP. CONSUMER wallets (users) are debited per prediction; PROVIDER wallets (organizations) receive earnings. Stripe webhooks handle credit top-ups and one-off purposes like org creation fees. Provider account tiers live in `provider-accounts`.

**Database schema:** TypeORM currently runs with `synchronize: true` (MVP setting in `app.module.ts`) — entity changes auto-apply to the database; there is no migration workflow yet. The only SQL under `shared/migrations/` is a pricing-config seed.

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

`smartFetch<T>()` is the canonical HTTP utility — auto-attaches JWT, uniform error handling. All API calls must go through the service layer (`lib/services/*.service.ts`), not inline in components, pages, or server actions. Global client state uses Zustand (not React Context).

### MCP Server

Exposes backend capabilities (model management, analytics, organization context) as MCP tools for AI assistants. Deterministic/zero-LLM; token-based auth with rate limiting. Built as ESM TypeScript with Express HTTP transport, proxying to the backend at `/api/v1`.

### Observability Stack (Docker)

OpenTelemetry → collector → Prometheus (metrics) + Loki (logs). Grafana at port 3005 unifies both. Winston log transport includes `trace_id` and `span_id` for log-trace correlation. Backend dev entrypoint loads `instrumentation.ts` first (`nest start --entryFile instrumentation`).

## Cross-cutting Rules

Enforced here and in `frontend/CLAUDE.md`:

1. **Zero `any`** — use `unknown`, explicit generics, or `Record<string, unknown>` for dynamic shapes; narrow errors in catch blocks with `instanceof Error`.
2. **JSDoc on everything** — every class, public method, hook, server action, and component.
3. **File size limits** — backend controllers/services ≤ 200 lines; frontend pages/components ≤ 250 lines. Extract sub-components into `src/components/[domain]/` and logic into hooks/services.
4. **Early returns** — guard clauses over nested `if/else`.
5. **No direct cross-module imports** — import a module's public exports, never its internal subdirectories.
