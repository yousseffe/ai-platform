# AI Platform MCP Server (Zero-LLM Context Provider)

A deterministic **Model Context Protocol (MCP)** server that exposes the platform's
capabilities as tools for external AI agents and IDEs (Claude Code, Cursor, Antigravity,
Gemini CLI, Copilot Workspace, OpenAI Agents, custom agents).

**"Bring Your Own Intelligence" (BYOI):** the external agent owns all reasoning, planning,
and code editing. This server only **provides context** — repository analysis, model/provider
integration metadata, observability telemetry, and fraud/abuse findings.

### Guarantees

- ⛔ **No LLM / inference API of any kind** (no Claude/OpenAI/Gemini). Zero inference cost.
- ⛔ **Never edits source code** and **never mutates platform state**. Read + analyze + recommend only.
- ✅ Every tool call is authenticated with a **platform API key** and scoped by the platform's
  existing guards. Tool outputs contain **no secrets** (only the _format_ of auth headers).

## Run

```bash
# Local dev (backend must be reachable at BACKEND_URL)
npm install
npm run dev          # http://localhost:3030

# Production
npm run build && npm start

# Docker (wired in the repo docker-compose.yml as the `mcp-server` service)
docker compose up -d --build mcp-server
```

### Environment

| Var                      | Default                 | Purpose                         |
| ------------------------ | ----------------------- | ------------------------------- |
| `MCP_PORT`               | `3030`                  | HTTP port                       |
| `BACKEND_URL`            | `http://localhost:3000` | NestJS backend base URL         |
| `BACKEND_API_PREFIX`     | `/api/v1`               | Backend API prefix              |
| `PROMETHEUS_URL`         | `http://localhost:9090` | Prometheus base                 |
| `LOKI_URL`               | `http://localhost:3100` | Loki base                       |
| `MCP_IDENTITY_TTL_MS`    | `30000`                 | Credential validation cache TTL |
| `MCP_RATE_LIMIT_PER_MIN` | `120`                   | Per-credential rate limit       |

## Transport & auth

Stateless **Streamable HTTP** at `POST /mcp`. Send your platform API key as a bearer token:

```
Authorization: Bearer <ml_sk_live_... | sk_live_... | platform JWT>
```

`GET /health` returns liveness. Unauthenticated `/mcp` calls return `401`.

## Tool catalog

> **Naming:** tool names use a `<group>_<action>` convention (underscore, not dot) so they
> satisfy the strict MCP identifier regex `^[a-zA-Z0-9_-]{1,64}$` enforced by some clients
> (e.g. Antigravity). The longest name is 33 chars, leaving room for client prefixes such as
> `mcp_ai-platform_`. See the [migration table](#tool-name-migration-dot--underscore) if you
> used the earlier dot-namespaced names.

### `integration_*` — repository & model integration metadata

| Tool                                | Returns                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `integration_analyze_repository`    | framework / architecture / package manager / conventions / integration points (from supplied files) |
| `integration_list_platform_models`  | models you can integrate (your own for a JWT session, else the public marketplace)                  |
| `integration_get_model_spec`        | a model's predict endpoint, auth-header _format_, request/response samples, pricing                 |
| `integration_get_provider_metadata` | curated SDK/auth/endpoint metadata for openai / claude / gemini, optionally per stack               |

### `observability_*` — telemetry context (the agent does the RCA)

| Tool                              | Returns                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `observability_list_deployments`  | your deployments + status                                                                    |
| `observability_get_model_metrics` | live CPU/RAM, p50/p95 latency, request/error rate                                            |
| `observability_get_request_stats` | windowed request counts, error rate, latency percentiles, per-minute buckets                 |
| `observability_search_logs`       | recent container logs (optionally errors-only)                                               |
| `observability_correlate`         | request stats + metrics + error logs + deterministic spike detection + a descriptive summary |
| `observability_list_alerts`       | recent platform alerts (admin scope)                                                         |

### `security_*` — deterministic fraud/abuse findings

| Tool                       | Returns                                                                     |
| -------------------------- | --------------------------------------------------------------------------- |
| `security_get_risk_report` | risk score, threat class, fired rules + evidence, recommendations, baseline |
| `security_list_alerts`     | recent security/risk alerts (admin scope)                                   |

### `system_*`

| Tool          | Returns                                              |
| ------------- | ---------------------------------------------------- |
| `system_ping` | auth/wiring check — your resolved scope (no secrets) |

### Tool name migration (dot → underscore)

Earlier builds namespaced tools with a dot (`group.action`). That form is rejected by clients
that enforce `^[a-zA-Z0-9_-]{1,64}$` (notably Antigravity IDE). All names were migrated to an
underscore separator; the action names are unchanged.

| Old name                            | New name                            |
| ----------------------------------- | ----------------------------------- |
| `system.ping`                       | `system_ping`                       |
| `integration.analyze_repository`    | `integration_analyze_repository`    |
| `integration.list_platform_models`  | `integration_list_platform_models`  |
| `integration.get_model_spec`        | `integration_get_model_spec`        |
| `integration.get_provider_metadata` | `integration_get_provider_metadata` |
| `observability.list_deployments`    | `observability_list_deployments`    |
| `observability.get_model_metrics`   | `observability_get_model_metrics`   |
| `observability.get_request_stats`   | `observability_get_request_stats`   |
| `observability.search_logs`         | `observability_search_logs`         |
| `observability.correlate`           | `observability_correlate`           |
| `observability.list_alerts`         | `observability_list_alerts`         |
| `security.get_risk_report`          | `security_get_risk_report`          |
| `security.list_alerts`              | `security_list_alerts`              |

## Example client configuration

### Claude Code / Claude Desktop (remote MCP over HTTP)

```json
{
  "mcpServers": {
    "ai-platform": {
      "type": "http",
      "url": "http://localhost:3030/mcp",
      "headers": { "Authorization": "Bearer YOUR_PLATFORM_API_KEY" }
    }
  }
}
```

### Cursor / generic MCP HTTP client

Point the client at `http://localhost:3030/mcp` and add the `Authorization: Bearer …` header.

### Typical flow ("integrate GPT-5 into my NestJS backend")

1. Agent → `integration_analyze_repository` with your project's manifests → detects NestJS.
2. Agent → `integration_get_provider_metadata("openai", "NestJS")` → SDK + auth + env metadata.
3. Agent writes the service/module **itself** and installs the SDK. The MCP server never touched your repo.

## Architecture

```
src/
  index.ts        # Express entry + stateless Streamable HTTP transport + auth/rate-limit
  server.ts       # per-request MCP server factory
  registry.ts     # composes capability modules
  auth/           # bearer → backend /whoami (cached), per-key rate limiter
  context/        # scoped clients: backend (forwards your key), Prometheus, Loki
  analyzers/      # repo analyzer, z-score anomaly, template summarizer
  knowledge/      # curated provider knowledge base
  tools/          # integration / observability / security / system
```
