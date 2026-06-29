# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ModelOps AI is a self-hosted MLOps platform: users upload trained model weights (sklearn, PyTorch, TensorFlow, ONNX, GGUF LLMs, diffusion), and the platform automatically **containerizes each model version into a self-serving Docker image** and **deploys it as an isolated, auto-scaling container** behind a prediction API. It includes wallets/billing (Stripe), organizations & RBAC, and a full observability stack (Prometheus, Loki, Grafana, OpenTelemetry).

This is a two-package repo with **no root `package.json`** — run `npm` commands inside `frontend/` or `backend/` separately. Each package has its own detailed guide:
- [`backend/CLAUDE.md`](backend/CLAUDE.md) — NestJS rules (zero-`any`, 200-line file cap, module boundaries).
- [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — Next.js architecture (service layer, server actions, Zustand, Zod). **Read this before editing frontend code** — it defines mandatory layering.

## Commands

All commands run from `backend/` or `frontend/`, not the repo root.

| | Backend (`backend/`) | Frontend (`frontend/`) |
|---|---|---|
| Dev server | `npm run dev` (port 5000, boots OTel first) | `npm run dev` (port 3001) |
| Build | `npm run build` | `npm run build` |
| Lint | `npm run lint` | `npm run lint` |
| Type-check | — | `npx tsc --noEmit` |
| Unit tests | `npm run test` | — |
| Single test | `npm run test -- path/to/file.spec.ts` | — |
| E2E tests | `npm run test:e2e` | — |
| Coverage | `npm run test:cov` | — |

> Backend `npm run dev` runs `nest start --watch --entryFile instrumentation` — the entry point is [`instrumentation.ts`](backend/src/instrumentation.ts), which starts the OpenTelemetry SDK **before** requiring `main.ts`. Don't change the entry file to `main` or tracing breaks.

## Running the full stack

See [`RUNNING.md`](RUNNING.md) for details. Key facts:
- **PostgreSQL is NOT in `docker-compose.yml`** — it runs as a native host service on port 5432 (DB `aidb`). Docker containers reach it via `host.docker.internal`.
- `docker compose up -d --build` starts everything except the DB. To develop the backend locally with hot reload: `docker compose up -d` then `docker compose stop backend gateway` and run `npm run dev` in `backend/`.
- Ports: frontend 3001, backend API 5000 (prefix `/api/v1`), MCP server 7000, Postgres 5432, Redis 6380→6379, MinIO console 9001 / API 9000, Grafana 3005, Prometheus 9090, Loki 3100.

## Architecture: the build → deploy pipeline

This is the core of the platform and spans multiple files. Two BullMQ (Redis-backed) queues registered in [`shared/queue/queue.module.ts`](backend/src/shared/queue/queue.module.ts):

1. **`build-queue`** → [`build.processor.ts`](backend/src/shared/queue/processors/build.processor.ts): downloads the model artifacts from MinIO, **auto-detects the framework/type** via a three-stage heuristic (filename extension → extracted-archive contents like `model_index.json`/`config.json` → import scanning of user `preprocess.py`/`postprocess.py`), picks a serving template from [`shared/queue/templates/`](backend/src/shared/queue/templates) (`serve_tabular.py`, `serve_nlp.py`, `serve_vision.py`, `serve_diffusion.py`), generates a `Dockerfile`, and builds image `model-version-<versionId>`. The serving contract is passed entirely via `ENV` vars (`MODEL_PATH`, `FRAMEWORK`, `TASK_TYPE`, `OUTPUT_SCHEMA_PATH`, etc.). Build progress/logs are streamed to the DB on the `ModelVersion` row.
   - Prefers prebuilt base images (`ai-platform-{pytorch,tensorflow,sklearn,diffusion}-base:latest`, built via [`build-base-images.sh`](build-base-images.sh) / [`.bat`](build-base-images.bat) from [`docker/base-images/`](docker/base-images)) and falls back to `python:3.11-slim` if absent.
   - **GGUF LLMs are special-cased**: no image is built; the `.gguf` file is stored on the host and mounted directly into the shared `ghcr.io/ggml-org/llama.cpp:server` container at deploy time.

2. **`deploy-queue`** → [`deploy.processor.ts`](backend/src/shared/queue/processors/deploy.processor.ts): launches a container from the built image on the `ai-platform_models` Docker network, assigns the next free host port from 8000, then polls `/health` (`verify-deployment-health` job) to flip status `STARTING → RUNNING`. Also handles **memory-based eviction** (tier→RAM map vs `MAX_SYSTEM_RAM_MB`, evicting least-recently-active deployments via Redis `model:last-active:<id>` keys) and **idle auto-stop** (`check-idle-deployments` job, `IDLE_TIMEOUT_MS`).
   - On deploy it rewrites `docker/observability/targets.json` to add/remove the container as a Prometheus scrape target.

The backend talks to the **host Docker daemon** via `dockerode`; socket resolution is centralized in [`shared/docker/docker.util.ts`](backend/src/shared/docker/docker.util.ts) (Windows named pipe, `/var/run/docker.sock`, or Colima). `docker-compose.yml` mounts `/var/run/docker.sock` into the backend container so it can spawn sibling model containers.

## Backend module map

Feature modules in [`backend/src/modules/`](backend/src/modules): `auth` (JWT + API keys, verification codes), `users` (+ audit logs), `models` (registry, versions, test cases, review events, OpenSearch-backed search), `deployments`, `organizations` (orgs, members, projects, org API keys, RBAC), `wallets` (Stripe billing, transactions, idempotent webhooks, system config), `analytics` (alerts + a Socket.IO `log-stream.gateway.ts` for live container logs). Cross-cutting infra in [`backend/src/shared/`](backend/src/shared): `queue`, `minio`, `redis`, `opensearch`, `mail`, `stripe`, `middleware`, `docker`.

- **TypeORM `synchronize: true` is on** ([`app.module.ts`](backend/src/app.module.ts)) — MVP only; entity changes auto-alter the schema. New entities must be added to the `entities` array there.
- Global API prefix `api/v1`; CORS is locked to `http://localhost:3001`; global `ValidationPipe` with `whitelist`/`forbidNonWhitelisted` — every request DTO needs `class-validator` decorators or fields get stripped.
- Logging is Winston JSON to console + an OpenTelemetry transport that injects `trace_id`/`span_id` so Loki logs correlate to traces.

## MCP server (`services/mcp-server/`)

A standalone, **deterministic, zero-LLM** Model Context Protocol server (TypeScript,
`@modelcontextprotocol/sdk`, stateless Streamable HTTP at `POST /mcp`, port 7000). It is a
**context provider** for external AI agents/IDEs (Claude Code, Cursor, Antigravity, etc.) under a
"Bring Your Own Intelligence" model: the external agent does all reasoning and code editing; this
server only gathers/parses/correlates/scores and returns structured JSON. **Hard invariants: it never
calls any LLM/inference API, never edits source code, and never mutates platform state.** See
[`services/mcp-server/README.md`](services/mcp-server/README.md).

- **Auth:** callers send a platform API key as `Authorization: Bearer …`; the server validates it via
  the backend `GET /api/v1/auth/whoami` (cached ~30s) and forwards the key on every downstream call so
  the backend's existing guards enforce scope. Per-key rate limiting at the boundary.
- **Tools:** `integration.*` (repo analysis via deterministic manifest/heuristic parsing in
  `src/analyzers/repo-analyzer.ts`, model integration specs, curated provider KB in `src/knowledge/`),
  `observability.*` (metrics/logs/request-stats + z-score spike detection in `src/analyzers/anomaly.ts`
  + a template summarizer — the agent does the RCA), `security.*` (fraud findings).
- Run: `npm run dev` (port 7000) in `services/mcp-server/`, or the `mcp-server` docker-compose service.

### Backend additions that back the MCP server
- `auth`: `ApiIdentityService` + `GET /auth/whoami` resolves any credential to a scoped identity.
- `models`: `ModelIntegrationService` + `GET /models/:id/integration-spec` (predict URL, auth-header
  *format*, request/response samples from the version's `examplePayload`/`expectedResult`).
- `analytics`: `AnalyticsQueryService` + `GET /analytics/models/:id/request-stats` and
  `GET /analytics/deployments` (scoped raw telemetry; correlation/anomaly/summary live in the MCP server).
- `fraud` module ([`modules/fraud/`](backend/src/modules/fraud)): enriches `ModelLog` (ip, sizes,
  `payloadHash`, `errorMessage`, `injectionMatch`), runs a BullMQ repeatable `scan-fraud` job
  (`fraud.processor.ts`) that aggregates traffic, maintains EWMA baselines, applies deterministic rules +
  z-score anomaly (`fraud-rules.ts`), and persists `RiskEvent`/`RiskBaseline` + raises `Alert` + emails the
  owner (`MailService.sendSecurityAlert`). Prompt-injection is flagged at request time via
  `shared/security/injection-patterns.ts` (only the matched category is stored, never the raw input).
  Read-only — it reports, it does not block traffic.

## Frontend at a glance

Next.js 16 App Router (`frontend/src/app/`) with route groups `(auth)`, `(dashboard)`, `(public)`, plus `admin/`, `orgs/`, `workspaces/`. Strict layering (enforced by [`frontend/CLAUDE.md`](frontend/CLAUDE.md)): pages stay thin → logic in `src/hooks/` + Zustand stores → network calls only via domain services in `src/lib/services/` built on `smartFetch` (auto-attaches the NextAuth JWT) → mutations via server actions in `src/lib/actions/` returning discriminated-union results → Zod schemas in `src/lib/schemas/`. Auth/session config lives in [`frontend/src/auth.ts`](frontend/src/auth.ts) (NextAuth, token refresh).
