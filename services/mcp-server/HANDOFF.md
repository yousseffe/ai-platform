# Handoff — Standalone MCP Server & Supporting Backend Work

_Last updated: 2026-06-29 • Branch: `main` (uncommitted working tree)_

This document hands off the in-progress work to add a **standalone, zero-LLM MCP
server** to the ModelOps AI platform, plus the backend endpoints, fraud engine, and
CORS changes that support it.

---

## Current architecture

A new **Model Context Protocol (MCP) server** (`services/mcp-server/`) exposes the
platform's capabilities as tools for external AI agents/IDEs (Claude Code, Cursor,
Antigravity, etc.) under a **"Bring Your Own Intelligence"** model: the external agent
does all reasoning/code-editing; this server only **gathers, parses, correlates, and
scores** context and returns structured JSON.

**Hard invariants:** never calls any LLM/inference API, never edits source code, never
mutates platform state. Read + analyze + recommend only. Tool outputs contain no
secrets (only the *format* of auth headers).

### MCP server internals
- **TypeScript / Express**, port **7000**, own `package.json` (deps:
  `@modelcontextprotocol/sdk`, `express`, `zod`).
- **Transport:** stateless **Streamable HTTP** at `POST /mcp`. Each request →
  extract bearer → per-key rate-limit (sha256 of key) → resolve identity → build
  scoped context → fresh disposable `McpServer` → handle → tear down.
  `GET /health` for liveness. `GET`/`DELETE /mcp` return 405 (stateless).
- **Auth:** does no auth of its own — forwards the caller's bearer to the backend
  `GET /api/v1/auth/whoami` (cached ~30s) and forwards the same key on every
  downstream backend call, so the backend's existing guards enforce scope.
- **Tool modules** (`src/tools/`), composed by `src/registry.ts`:
  - `integration_*` — repo analysis (deterministic manifest/heuristic parsing),
    model integration specs, curated provider KB (openai/claude/gemini).
  - `observability_*` — deployments, metrics, request-stats, logs, `correlate`
    (fans out stats+metrics+logs, runs z-score spike detection + template summary;
    RCA left to the agent), alerts.
  - `security_*` — fraud/abuse risk reports + security alerts.
  - `system_ping` — auth/wiring/scope check.
- Wired into root `docker-compose.yml` as the `mcp-server` service (depends on backend).

### Backend additions that feed the MCP server
- **auth:** `ApiIdentityService` + `GET /auth/whoami` — resolves any credential
  (org `sk_live_`, model `ml_sk_live_`/`ml_sk_trial_`, or RS256 JWT) to a scoped
  `ApiIdentity` with no secrets.
- **models:** `ModelIntegrationService` + `GET /models/:id/integration-spec` — predict
  URL, auth-header *format*, request/response samples from the version's
  `examplePayload`/`expectedResult`, pricing.
- **analytics:** `AnalyticsQueryService` + `GET /analytics/models/:id/request-stats`
  and `GET /analytics/deployments` — scoped raw telemetry computed from `ModelLog`
  (ownership enforced).
- **fraud module** (`backend/src/modules/fraud/`): enriches `ModelLog`
  (ip/sizes/payloadHash/errorMessage/injectionMatch — captured in
  `models.controller.ts`), runs a BullMQ scan that aggregates traffic, maintains EWMA
  baselines, applies deterministic rules + z-score anomaly, persists
  `RiskEvent`/`RiskBaseline`, raises `Alert`s, emails owners. **Read-only — reports,
  never blocks.** Prompt-injection flagged at request time via
  `shared/security/injection-patterns.ts` (only the matched *category* stored, never
  the raw input).

---

## Decisions made

1. **Tool naming: underscore, not dot.** Renamed all tools from `group.action` →
   `group_action` to satisfy the strict MCP identifier regex
   `^[a-zA-Z0-9_-]{1,64}$` enforced by some clients (notably **Antigravity IDE**).
   Kept full namespaces (no abbreviation): longest name is 33 chars, leaving room for
   client prefixes like `mcp_ai-platform_` (→ 49, under 64). This is a **breaking
   change** with no aliases — acceptable at `0.1.0` since the dot form was rejected by
   those clients anyway. Migration table lives in `services/mcp-server/README.md`.

2. **CORS split by route, not global.** The dashboard keeps a strict, **credentialed**
   origin allowlist (cookie/JWT auth → must stay locked, else CSRF-style exposure).
   The **prediction API** is Bearer-key authenticated (no ambient credentials), so it
   reflects any caller origin with `credentials: false`. Implemented as a single
   per-request `cors(...)` middleware that branches on `req.path`. Allowlist is now
   env-driven via `CORS_ORIGINS` (comma-separated, default `http://localhost:3001`).

3. **`mcp-remote` is not the integration path.** Diagnosed a client connection failure
   (see Current problem). The server speaks static-bearer Streamable HTTP; clients
   should connect **natively** over HTTP with an `Authorization` header, not via the
   OAuth-first `mcp-remote` bridge.

---

## Files created (new, untracked)

### MCP server (`services/mcp-server/`)
- `src/index.ts` — Express entry, transport, auth/rate-limit wiring
- `src/server.ts` — per-request MCP server factory
- `src/registry.ts` — composes capability modules
- `src/types.ts`, `src/config.ts`, `src/result.ts`
- `src/auth/identity.ts`, `src/auth/rate-limit.ts`
- `src/context/{index,backend-client,prometheus-client,loki-client}.ts`
- `src/analyzers/{repo-analyzer,anomaly,summary}.ts`
- `src/knowledge/providers.ts`
- `src/tools/system/ping.ts`
- `src/tools/integration/index.ts`
- `src/tools/observability/index.ts`
- `src/tools/security/index.ts`
- `scripts/smoke-client.mts`
- `README.md`, `Dockerfile`, `.dockerignore`, `package.json`, `tsconfig.json`
- `HANDOFF.md` (this file)

### Backend
- `backend/src/modules/auth/interfaces/api-identity.interface.ts`
- `backend/src/modules/auth/services/api-identity.service.ts`
- `backend/src/modules/models/controllers/integration.controller.ts`
- `backend/src/modules/models/services/model-integration.service.ts`
- `backend/src/modules/analytics/controllers/analytics-mcp.controller.ts`
- `backend/src/modules/analytics/services/analytics-query.service.ts`
- `backend/src/shared/security/injection-patterns.ts`
- `backend/src/modules/fraud/` (whole module: controller, services, entities,
  processor, rules, enums)

### Files modified
- `backend/src/main.ts` — per-route CORS policy
- `backend/src/app.module.ts` — register FraudModule + RiskBaseline/RiskEvent entities
- `backend/src/modules/auth/{auth.module,controllers/auth.controller}.ts` — `whoami`
- `backend/src/modules/models/{models.module,controllers/models.controller,entities/model-log.entity}.ts`
  — integration spec, request-fingerprint capture, enriched ModelLog columns
- `backend/src/modules/analytics/analytics.module.ts`
- `backend/src/shared/mail/mail.service.ts` — `sendSecurityAlert`
- `docker-compose.yml` — `mcp-server` service + backend `PUBLIC_API_URL`
- `services/mcp-server/{README.md, tools/*, scripts/smoke-client.mts}` — tool renames

---

## Important constraints

- **Backend rules** (`backend/CLAUDE.md`): zero `any`, 200-line file cap on
  controllers/services, no direct inner-module imports, early returns, JSDoc on every
  class/handler/service method/processor.
- **MCP server invariants:** no LLM/inference calls, never edits code, never mutates
  platform state, never returns secrets (auth-header *format* only).
- **TypeORM `synchronize: true`** is on (MVP) — new entities must be added to the
  `entities` array in `app.module.ts` (RiskBaseline/RiskEvent already added).
- **Two-package repo, no root `package.json`** — run `npm` inside `backend/` or
  `frontend/` or `services/mcp-server/` separately.
- **Do not commit to `main` directly**; branch + PR.
- Ports: frontend 3001, backend 5000 (`/api/v1`), MCP 7000, Prometheus 9090, Loki 3100.

---

## Quick verification commands

```bash
# MCP server typecheck
cd services/mcp-server && npm run typecheck

# Backend typecheck
cd backend && npx tsc --noEmit -p tsconfig.json

# Server liveness + a real MCP initialize (proves bearer auth works)
curl -s http://localhost:7000/health
curl -s -X POST http://localhost:7000/mcp \
  -H "Authorization: Bearer <ml_sk_live_...>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```
