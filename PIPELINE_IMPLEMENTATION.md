# Pipelines Feature — Implementation Log

> Companion to [PIPELINE.md](PIPELINE.md) (the original design proposal). That document is the
> "why would we build this and how" pitch; **this document is the as-built record** — what was
> actually written, where, and why each piece exists. Written for a future engineer (or future
> me) picking this up cold.

Branch: `Features/Pipelines`. Scope shipped: **Phase 1 (InferenceClient refactor) + Phase 2
(linear pipeline engine with manual mappers)** from PIPELINE.md's suggested build order.
Auto-mapper detection, the visual builder, and pipeline-as-a-model are **not** built yet — see
[What's deliberately not done](#whats-deliberately-not-done).

---

## 1. Why this shape

Two constraints drove every decision here:

1. **A pipeline step must be billed, logged, and fraud-scanned exactly like a direct
   `/predict` call.** The platform's economics (wallet debits, provider revenue share, fraud
   detection) only work if every model invocation — whether a human hits `/predict` directly or
   a pipeline calls it as step 3 of 5 — goes through the *same* code path. Two parallel
   implementations of "call a model and charge for it" would drift the moment either side got a
   bug fix the other didn't.
2. **The mapper between steps must never execute arbitrary code.** The MCP server's hard
   invariant ("never calls an LLM, never executes user code") is a security posture worth
   extending here: a mapping spec is *data*, interpreted by a fixed set of safe operations, not
   a sandboxed script.

Everything else (entity shape, service boundaries, retry policy) falls out of those two
constraints plus the existing `backend/CLAUDE.md` rules (200-line file cap, zero-`any`, bounded
feature modules).

---

## 2. Backend — Phase 1: the `InferenceClient` refactor

### The problem

Before this change, [`models.controller.ts`](backend/src/modules/models/controllers/models.controller.ts)
had a single ~330-line private method, `handlePredictionProxy`, that did *everything* for a
prediction call: computed price, checked the consumer's wallet balance, looked up the model
owner's container API key, called the deployed container over HTTP, ran a `QueryRunner`
transaction to debit the consumer/credit the provider/credit the platform, and wrote a
`ModelLog` row — all inline, called from both `predict()` and `predictVersion()`.

A pipeline step needs the *exact same sequence*, called once per step instead of once per HTTP
request. Copy-pasting that method into a new pipeline engine would have meant two copies of
billing logic to keep in sync forever. So Phase 1 was purely a **behavior-preserving extraction**
of that logic into reusable services — no new functionality, just a seam to build on.

### What was extracted, and why split this way

Each new file in [`backend/src/modules/models/services/`](backend/src/modules/models/services/)
has one job, kept under the 200-line cap:

| File | Responsibility | Why separate |
|---|---|---|
| [`inference-pricing.service.ts`](backend/src/modules/models/services/inference-pricing.service.ts) | `computeCost(model, isTrial)` — reads `SystemConfig` for per-type default pricing or the model's custom pricing | Pricing rules change independently of billing mechanics |
| [`inference-billing.service.ts`](backend/src/modules/models/services/inference-billing.service.ts) | `chargeForInference(...)` — the `QueryRunner` transaction: debit consumer, credit provider (EGP), credit platform commission | The riskiest code (money movement) — isolated so it's easy to find and audit |
| [`inference-log.service.ts`](backend/src/modules/models/services/inference-log.service.ts) | `computeRequestFingerprint(data)` + `writeModelLog(...)` — payload hash/size/injection-match capture and the `ModelLog` write | Fingerprinting is reused by both the success and failure paths |
| [`inference-deployment-resolver.service.ts`](backend/src/modules/models/services/inference-deployment-resolver.service.ts) | `resolveDeploymentUrl(model, versionNumber?)` — finds a RUNNING deployment or auto-deploys and polls until one is up | This was duplicated near-verbatim between `predict()` and `predictVersion()` before; now it's one implementation handling both (version pinned or latest) |
| [`inference-call-preparer.service.ts`](backend/src/modules/models/services/inference-call-preparer.service.ts) | `prepareCall(model, actor)` — balance check + resolves the container's predict endpoint path and auth headers; `markActive(deploymentId)` — Redis idle-tracking heartbeat | Needs to run *before* the HTTP call (balance) and *during* it (heartbeat), so it's the natural seam between "decide if we can call" and "actually call" |
| [`inference-client.service.ts`](backend/src/modules/models/services/inference-client.service.ts) | **The public façade.** Composes the five services above into `runInference(...)` (one call, full lifecycle) and exposes `resolveDeploymentUrl`/`prepareCall`/`recordOutcome` individually for the streaming SSE case | This is the *only* class anything outside `models/services` should ever import — the pipeline engine depends on this one file, not the five behind it |

New shared interfaces live in
[`models/interfaces/inference.interface.ts`](backend/src/modules/models/interfaces/inference.interface.ts):
`PredictionActor` (who's calling — user/org-key/workspace), `ClientRequestMeta` (IP/UA for fraud
analysis), `InferenceResult` (the structured outcome). These replace what used to be inline
`req.user`/`ClientRequestMeta` types defined directly in the controller.

`extractClientMeta` moved out of the controller into
[`shared/utils/client-meta.util.ts`](backend/src/shared/utils/client-meta.util.ts) since it's now
called from contexts that aren't NestJS request handlers.

### What changed in the controller

[`models.controller.ts`](backend/src/modules/models/controllers/models.controller.ts) shrank from
**1179 → 736 lines**. `predict()` and `predictVersion()` are now ~20 lines each:
resolve the model, call `inferenceClient.resolveDeploymentUrl(...)`, hand off to a private
`respondWithPrediction` that either streams (SSE, still inline in the controller since pipelines
never stream) or calls `inferenceClient.runInference(...)` and writes the JSON response.
**Every existing endpoint's external behavior is unchanged** — same URLs, same error messages,
same billing math, same log fields. This was verified by diffing the extracted logic line-by-line
against the original method, not rewritten from scratch.

### What this enables

A pipeline step now does exactly this to call a model:
```ts
const { url, deploymentId } = await inferenceClient.resolveDeploymentUrl(model, versionNumber);
const result = await inferenceClient.runInference(model, url, deploymentId, mappedInput, actor, clientMeta);
```
Two lines, the same two lines `predict()` uses. No separate "pipeline billing" code exists.

---

## 3. Backend — Phase 2: the pipelines module

New module: [`backend/src/modules/pipelines/`](backend/src/modules/pipelines/), registered in
[`app.module.ts`](backend/src/app.module.ts) and wired into the TypeORM entity list.

### Data model

```
Pipeline ──< PipelineStep >── PipelineEdge >── PipelineStep
   │                                                  │
   └──< PipelineRun ──< PipelineStepRun >─────────────┘
```

| Entity | Purpose | Notable fields |
|---|---|---|
| [`Pipeline`](backend/src/modules/pipelines/entities/pipeline.entity.ts) | The reusable definition | `status` (`DRAFT`/`VALIDATED`/`ARCHIVED`), `version` (bumped on every validate, for run reproducibility) |
| [`PipelineStep`](backend/src/modules/pipelines/entities/pipeline-step.entity.ts) | One node = one model call | `source` (`NEW_UPLOAD`/`EXISTING` — **provenance only**, see below), `modelVersion`, `pinPolicy` (`PINNED`/`LATEST_READY`), `maxRetries`, `timeoutMs` |
| [`PipelineEdge`](backend/src/modules/pipelines/entities/pipeline-edge.entity.ts) | The transform between two steps | `fromStep`/`toStep` (either nullable — null `fromStep` = pipeline's external input, null `toStep` = external output), `spec` (the `MapperSpec` JSON), `status` (`MANUAL` for now; `OK`/`NEEDS_REVIEW` reserved for the future auto-detector) |
| [`PipelineRun`](backend/src/modules/pipelines/entities/pipeline-run.entity.ts) | One execution's audit trail | `input`/`output` (jsonb), `status`, `totalCost`, `totalLatencyMs` |
| [`PipelineStepRun`](backend/src/modules/pipelines/entities/pipeline-step-run.entity.ts) | One step's result within a run | `mappedInput` (what was actually sent, post-mapper), `output`, `cost`, `responseTimeMs` |

**Why a separate `PipelineEdge` entity instead of putting the mapper directly on `PipelineStep`:**
a linear chain has *N+1* transform points for *N* steps (input→step1, step_i→step_{i+1},
stepN→output) — folding the inbound mapper onto the step works for internal edges but has no
natural home for the pipeline's external input/output mapping. A separate entity with nullable
`fromStep`/`toStep` represents all three cases uniformly, and is also what lets the future DAG
mode (branches, fan-out) reuse the same table without a schema change.

**Why `PipelineStepSource` exists even though only `EXISTING` is wired up:** per your
instruction that a step's model isn't limited to already-deployed ones — it can also be a brand
new upload made while building the pipeline. That upload still goes through the *existing*
`POST /models/:id/versions` → `build-queue` flow unchanged; the pipeline step just needs to know
whether it's referencing something that already has a `ModelVersion` or is waiting on one. The
field is on the entity now so the schema doesn't need a migration later; the *behavior* (an
upload UI embedded in the step-creation flow, binding the resulting version automatically) is a
frontend-plus-small-backend follow-up, not built in this pass.

### The mapper engine — declarative, not executable

[`MapperEngineService`](backend/src/modules/pipelines/services/mapper-engine.service.ts) is the
entire "safe interpreter" promised in the design doc. A `MapperSpec` is:

```json
{ "rules": [
  { "op": "copy", "from": "prediction.caption", "to": "messages[0].content" },
  { "op": "default", "to": "temperature", "value": 0.2 },
  { "op": "cast", "from": "score", "to": "confidence", "as": "number" },
  { "op": "template", "to": "prompt", "template": "Classify: {{caption}}" }
]}
```

Four ops, defined in
[`mapper-spec.interface.ts`](backend/src/modules/pipelines/interfaces/mapper-spec.interface.ts):
`copy`, `cast`, `default`, `template`. The engine reads/writes dotted-and-bracketed paths
(`a.b[0].c`) with hand-rolled `getPath`/`setPath` — **no `eval`, no `Function()` constructor, no
expression language**. An empty/missing `rules` array means "pass the payload through
unchanged," which is the common case when two adjacent steps already speak compatible JSON.

This phase ships **manual mappers only** — a human (or, via the API, a script) writes the
`MapperSpec` JSON when creating an edge. The auto-detection described in PIPELINE.md §4
(`SchemaInferenceService` + `MapperGeneratorService`, inferring schemas from `examplePayload`/
`expectedResult` and proposing rules by name/type/semantic-role matching) is **not built** —
that's the natural next phase, and the entity/engine shape here was chosen so adding it later
means *generating* a `MapperSpec` programmatically and writing it through the same
`upsertEdge` endpoint, not changing the runtime.

### Execution engine

A run is a `(load → mark RUNNING → walk steps → finalize)` pipeline, deliberately split across
small single-purpose services rather than one large class (the 200-line cap forced this, and it
turned out to be the right shape anyway):

- [`PipelineRunnerService`](backend/src/modules/pipelines/services/pipeline-runner.service.ts) —
  top-level orchestration: loads the run + ordered steps + edges, hands the walk off to the step
  loop, applies the final outbound mapper, persists the terminal status.
- [`PipelineStepLoopService`](backend/src/modules/pipelines/services/pipeline-step-loop.service.ts) —
  the actual `for (const step of steps)` walk: finds each step's inbound edge, maps the payload,
  executes the step, records the `PipelineStepRun`, and **stops at the first unrecoverable
  failure** (no partial-then-continue — a broken middle step makes the rest of the chain
  meaningless).
- [`PipelineStepExecutorService`](backend/src/modules/pipelines/services/pipeline-step-executor.service.ts) —
  resolves the step's target version (pinned exact version, or latest READY if `pinPolicy` is
  `LATEST_READY`) and calls `InferenceClient`, retrying up to `step.maxRetries` times.
- [`PipelineRunPersistenceService`](backend/src/modules/pipelines/services/pipeline-run-persistence.service.ts) —
  the only place that writes `PipelineRun`/`PipelineStepRun` rows, so run-state transitions are
  in one auditable spot.

Run outcome states: `SUCCESS` (every step succeeded), `FAILED` (the first step failed, nothing
billed), `PARTIAL` (some steps succeeded and were billed before a later step failed — the run
record keeps the `totalCost` accrued up to the failure point so nothing is double-charged or
silently dropped).

Background execution: a `pipeline-queue` BullMQ queue (registered in
[`pipelines.module.ts`](backend/src/modules/pipelines/pipelines.module.ts), mirroring the
existing `build-queue`/`deploy-queue` pattern) and a thin
[`PipelineProcessor`](backend/src/modules/pipelines/processors/pipeline.processor.ts) that just
calls `pipelineRunnerService.runPipeline(runId)`. Triggering a run creates a `PENDING`
`PipelineRun` row synchronously and returns its ID immediately; the actual chain runs
asynchronously, polled via `GET /pipelines/runs/:runId`.

### API surface

All under JWT auth (`JwtAuthGuard`), workspace-aware where billing applies
(`WorkspaceInterceptor`, same pattern as `models.controller.ts`):

| Method | Path | Service |
|---|---|---|
| `POST` | `/pipelines` | Create an empty `DRAFT` pipeline |
| `GET` | `/pipelines` | List the caller's pipelines |
| `GET` | `/pipelines/:id` | Fetch one, with steps + bound model versions |
| `PATCH` | `/pipelines/:id` | Edit name/description |
| `DELETE` | `/pipelines/:id` | Delete (cascades steps/edges/runs) |
| `POST` | `/pipelines/:id/validate` | Check every step is bound to a READY version; flips `DRAFT → VALIDATED` |
| `POST` | `/pipelines/:pipelineId/steps` | Add a step (binds an existing READY `ModelVersion`) |
| `PATCH` | `/pipelines/:pipelineId/steps/:stepId` | Edit a step |
| `DELETE` | `/pipelines/:pipelineId/steps/:stepId` | Remove a step |
| `GET` | `/pipelines/:pipelineId/edges` | List edges |
| `POST` | `/pipelines/:pipelineId/edges` | Create/replace the mapper for a `fromStepId`/`toStepId` pair (omit either for external input/output) |
| `DELETE` | `/pipelines/:pipelineId/edges/:edgeId` | Remove an edge |
| `POST` | `/pipelines/:id/run` | Trigger a run (pipeline must be `VALIDATED`); body `{ "input": {...} }` |
| `GET` | `/pipelines/:id/runs` | List recent runs |
| `GET` | `/pipelines/runs/:runId` | Poll one run's status/output/step results |

**Editing a `VALIDATED` pipeline's steps or edges silently demotes it back to `DRAFT`**
(`PipelinesService.demoteToDraft`) — this is intentional, not a bug: it forces re-validation
before the next run, so a stale validation can never paper over a structural change.

### Verification performed

- `tsc --noEmit` and `eslint` clean across the entire new module and every touched file (the only
  remaining errors anywhere in the repo are pre-existing, unrelated to this work — see below).
- Fixed an unrelated environment gap while verifying: `backend/node_modules` was missing ~13
  declared dependencies (`dockerode`, `winston`, `stripe`, `@opensearch-project/opensearch`, the
  OpenTelemetry packages). Ran `npm install` to reconcile; only `package-lock.json` changed.
- **Live boot confirmed**: started the dev server against the project's actual Postgres/Redis
  containers. `TypeORM synchronize` created all 5 new tables with correct foreign keys, the
  `PipelinesModule` initialized, and all 13 routes above registered with zero path conflicts.
  `Nest application successfully started`.
- **Not verified**: a full authenticated HTTP round-trip through `POST /:id/run` against a real
  deployed model container — the test database only had one READY model version and no test
  credentials were available to mint a JWT. The code path is the same `InferenceClient.
  runInference` the production `/predict` endpoint already uses, so risk is low, but this
  specific flow is untested live.

---

## 4. The new end-to-end flow

```
1. User has (or uploads, via the existing upload flow) two or more READY model versions.
2. POST /pipelines                         → empty DRAFT pipeline
3. POST /pipelines/:id/steps  (×N)         → bind each step to a ModelVersion, in order
4. POST /pipelines/:id/edges  (×N+1, optional) → write a MapperSpec for each transform point;
                                                  omit an edge to pass payloads through unchanged
5. POST /pipelines/:id/validate            → checks every step has a READY version; DRAFT → VALIDATED
6. POST /pipelines/:id/run   { input: {...} } → PENDING PipelineRun created, queued, ID returned
7. (background) PipelineProcessor → PipelineRunnerService:
     for each step in order:
       map inbound payload (MapperEngineService)
       resolve deployment (auto-deploys if needed — same as a direct /predict call)
       call InferenceClient.runInference → bills consumer, credits provider, writes ModelLog
       record PipelineStepRun
       on failure: stop, mark run FAILED or PARTIAL
     map final output, mark run SUCCESS
8. GET /pipelines/runs/:runId  (poll)      → status, output, per-step trace, totalCost
```

---

## 5. What's deliberately not done

Carried over from PIPELINE.md's phased build order — these are follow-ups, not oversights:

- **Auto-mapper detection** (Phase 3-4: `SchemaInferenceService`, `MapperGeneratorService`,
  confidence scoring, design-time dry-run validation against `examplePayload`/`expectedResult`).
  Mappers are 100% hand-written JSON for now.
- **Frontend builder** — see §6, being added now.
- **`NEW_UPLOAD` step behavior** — the entity field exists; there's no endpoint yet that lets a
  step-creation call carry upload form-data directly. Today the upload happens first via the
  existing `POST /models/:id/versions`, then the resulting version is bound via `POST
  /pipelines/:pipelineId/steps` with `source` implicitly `EXISTING`.
- **Pipeline-as-a-model** (exposing a validated pipeline behind a `/pipelines/:id/predict`
  endpoint identical in shape to a model's, so pipelines compose and can be sold in the
  marketplace).
- **DAG/branching**, **result caching**, **org RBAC on pipelines** (today: single-owner only,
  the `organization` field on `Pipeline` exists but isn't enforced), **BYOI mapping suggestions**
  via the MCP server.

---

## 6. Frontend

Built on `Features/Pipelines`, mirroring `frontend/CLAUDE.md`'s mandatory layering
(`pages → hooks/Zustand → services via smartFetch → server actions → Zod schemas`) and the
**Models** feature's existing conventions exactly — same file shapes, same visual language, same
JSDoc style. No new patterns were introduced; every file below has a one-to-one counterpart in
the Models feature it was copied from.

### Why this shape

Three rules drove every file placement:

1. **Pages stay thin.** Every `page.tsx` here is a server component that does one thing: fetch
   data via server actions, then hand it to a `*Client.tsx` component. All interactivity (forms,
   dialogs, polling) lives in client components and hooks, never in the page itself.
2. **One hook per concern, not one hook per page.** `usePipelineBuilder` owns step/edge/validate
   mutations; `usePipelineRuns` owns run-triggering and polling. They're composed together in
   `PipelineDetailsClient`, not merged into a single mega-hook — this mirrors how
   `use-model-details.ts` stays focused on deployment lifecycle alone.
3. **The mapper spec is just a JSON textarea.** Building a visual node-and-wire mapper editor is
   real frontend work with its own design questions (drag targets, field autocomplete, live
   validation against a schema) — doing that properly deserves its own pass, not a corner cut
   inside this one. So for now, writing a `MapperSpec` is literally pasting the JSON the backend
   already documents in [PIPELINE_IMPLEMENTATION.md §3](#3-backend--phase-2-the-pipelines-module).
   This is functionally complete (every backend capability is reachable from the UI) but
   intentionally not the long-term editing experience.

### What was added, file by file

**Types** — [`types/pipelines/index.ts`](frontend/src/types/pipelines/index.ts), wired into
[`types/index.ts`](frontend/src/types/index.ts). Six enums with string values copied verbatim
from the backend enums (`draft`, `validated`, `pinned`, etc. — getting these wrong would silently
break every status comparison in the UI), plus `Pipeline`/`PipelineStep`/`PipelineEdge`/
`PipelineRun`/`PipelineStepRun`/`MapperSpec` interfaces shaped to match the controllers' actual
JSON responses. `PipelineStepModelVersion` extends the existing `ModelVersion` type with an
optional nested `model: { id, name }` — the backend's `getPipeline` eager-loads
`steps.modelVersion.model` specifically so the UI can show "GPT-Caption · v3" instead of a bare
version ID, without widening the shared `ModelVersion` type used everywhere else.

**Validation** — [`lib/schemas/pipelines/index.ts`](frontend/src/lib/schemas/pipelines/index.ts),
wired into [`lib/schemas/index.ts`](frontend/src/lib/schemas/index.ts). Five Zod schemas
(`createPipelineSchema`, `updatePipelineSchema`, `createStepSchema`, `upsertEdgeSchema`,
`runPipelineSchema`). The two JSON-carrying fields (`upsertEdgeSchema.specJson`,
`runPipelineSchema.inputJson`) use the same `.refine(() => { try { JSON.parse... } })` pattern
the Models feature already uses for `examplePayload`/`expectedResult` — `upsertEdgeSchema`
additionally checks the parsed JSON actually has a `rules` array, so a malformed mapper spec is
caught client-side before it ever reaches the backend's interpreter.

**Service layer** — [`lib/services/pipelines.service.ts`](frontend/src/lib/services/pipelines.service.ts).
One `smartFetch` wrapper per backend endpoint (15 functions total — see the route table in
§3), full JSDoc, identical signature style to `models.service.ts`.

**Server actions** — [`lib/actions/pipelines.actions.ts`](frontend/src/lib/actions/pipelines.actions.ts).
Every mutation returns the mandatory discriminated union
(`{ success: true; data: T } | { success: false; error: string }`), every action calls
`revalidatePath` on the affected routes, exactly matching `models.actions.ts`. Read actions
(`getPipelines`, `getPipeline`, `listPipelineRuns`, `listPipelineEdges`, `getPipelineRun`) catch
and log rather than throw, returning an empty array/`null` — same as `getModels`/`getModel`.

**Hooks** — [`hooks/use-pipeline-builder.ts`](frontend/src/hooks/use-pipeline-builder.ts) (add/
remove step, upsert/remove edge, validate, delete — each calls its server action then
`router.refresh()` so the parent server component re-fetches) and
[`hooks/use-pipeline-runs.ts`](frontend/src/hooks/use-pipeline-runs.ts) (trigger a run, plus a
`useEffect` that polls every 3 seconds via `router.refresh()` **only while a run is PENDING or
RUNNING** — the exact `setInterval` + cleanup pattern `use-model-details.ts` uses to poll
deployment status, reused via the shared `isPipelineRunTransient` helper in
[`lib/utils/pipelines.ts`](frontend/src/lib/utils/pipelines.ts)).

**Pages & components:**

```
app/(dashboard)/pipelines/
├── page.tsx                       # list (server) — fetches getPipelines()
└── [id]/
    ├── page.tsx                   # detail (server) — fetches pipeline + edges + runs
    │                                 + the caller's own READY model versions in parallel
    └── PipelineDetailsClient.tsx  # orchestration (client, ~95 lines) — wires both hooks
                                      to three panels, renders the header/status/actions

components/pipelines/
├── PipelinesTable.tsx             # list table — copy of ModelsTable.tsx's structure/classes
├── CreatePipelineDialog.tsx       # name+description dialog → redirects into the builder
├── PipelineStepsPanel.tsx         # ordered step list + "Add Step" dialog (picks from the
│                                     READY model-version pool passed down from the page)
├── PipelineEdgesPanel.tsx         # edge list + "Add Mapper" dialog (from/to step selects +
│                                     JSON textarea for the MapperSpec)
├── PipelineRunPanel.tsx           # "Run Pipeline" trigger dialog + run history table
└── PipelineRunDetailDialog.tsx    # fetches one run's full step trace on demand, shows
                                      mapped input/output/cost/latency per step
```

Every visual surface reuses the existing terminal/dev-tool aesthetic verbatim — `border
border-border bg-card rounded-xl`, `font-mono text-xs`, the same status-dot convention
(`bg-emerald-500 animate-pulse` for healthy/active states), the same shadcn-on-base-ui primitives
(`Dialog`, `Select`, `Textarea`, `Button`, `Label`) already used throughout the Models pages. The
list page's `PipelinesTable` is structurally a copy of `ModelsTable` with models→pipelines
substituted.

**Navigation** — added a `Pipelines` link to
[`components/layout/Sidebar.tsx`](frontend/src/components/layout/Sidebar.tsx), visible
regardless of Consumer/Provider view mode (unlike "Models Registry," which is Provider-only) —
since a pipeline can chain any model the caller can already call, it's not a provider-only
concern.

### The new UI flow

```
/pipelines                          → table of the user's pipelines, "New Pipeline" dialog
  └─ create (name + description)    → redirects to /pipelines/:id

/pipelines/:id                      → builder/run view, three stacked panels:

  Steps panel
    "Add Step" → pick a READY model version (from the user's own models) → bound,
                  appended at the end of the chain

  Mappers panel
    "Add Mapper" → pick From (a step, or "Pipeline Input") and To (a step, or
                    "Pipeline Output") → paste/edit a { "rules": [...] } JSON spec
                  → omitting a mapper for a from/to pair passes that payload through unchanged

  Runs panel
    "Run Pipeline" (enabled only once the pipeline is VALIDATED)
      → paste a JSON input payload → POST /pipelines/:id/run
      → run appears PENDING in the history table, page polls every 3s while it's
        PENDING/RUNNING, flips to SUCCESS/FAILED/PARTIAL automatically
      → "View →" on any run opens its full step-by-step trace: mapped input, raw
        output, cost, and latency for every step that executed
```

The "Validate" button in the header is the gate: editing any step or edge silently demotes the
pipeline back to `DRAFT` (server-side, per §3), and the Run button is disabled until `Validate`
is clicked again — the UI reflects this by reading `pipeline.status` directly rather than
tracking its own "is dirty" state.

### Verification performed

- `npx tsc --noEmit`: **zero errors** across the entire frontend (two pre-existing missing-package
  errors — `recharts`, `socket.io-client`, same root cause as the backend's incomplete
  `node_modules` — were present before this work and fixed via `npm install`, same as the backend).
- `npx eslint` on every new/touched file: zero genuine issues. Three React-Compiler advisory items
  remain (`watch()` "incompatible library" warnings, one `set-state-in-effect` error in
  `PipelineRunDetailDialog`) — all three were confirmed to be a pre-existing, codebase-wide pattern
  by running the same lint against existing files (`use-upload-model.ts`, `use-model-metrics.ts`,
  `use-system-alerts.ts`, `use-transactions.ts` all trigger the identical warnings), not something
  introduced here.
- `npm run build`: **production build succeeds**, and `/pipelines` + `/pipelines/[id]` are
  correctly registered as dynamic server-rendered routes alongside every existing route.
- **Not verified**: an authenticated live click-through (no test credentials were available in
  this environment — same limitation noted for the backend's live run test in §3).

### What's deliberately not done (frontend)

- **No visual mapper builder.** Field mapping is a JSON textarea, not a drag-and-drop UI. This is
  the single biggest UX gap versus the long-term vision in [PIPELINE.md](PIPELINE.md).
- **No model picker beyond the caller's own models.** The "Add Step" dialog only lists the
  current user's own READY model versions — no marketplace browsing tab, matching the backend's
  current lack of ownership enforcement on step binding (see §5).
- **No inline "upload a new model as a step" flow.** Binding a `NEW_UPLOAD` step still means
  uploading via the existing `/models/:id/upload` flow first, then adding the resulting version
  as a step — the backend's `source` field exists, but the builder doesn't yet embed the upload
  form inside step creation.
- **No reordering UI** for steps (`order` is set by append position only) and no editing of an
  existing step's bound model version (only add/remove).
- **No pipeline-as-a-model / marketplace publishing UI**, since the backend doesn't expose that
  capability yet either.
