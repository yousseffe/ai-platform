# Pipelines (Model Chaining) — Design & Build Guide

> Status: **Proposal / design doc**. Nothing in this document is built yet. It describes
> how to add a *Pipeline* feature to ModelOps AI: chaining deployed models so the output
> of one becomes the input of the next, with an **auto-detected mapper** between
> incompatible steps so the user never has to wire fields by hand.

---

## 1. What we're building

A **Pipeline** is an ordered chain (later: a DAG) of **Steps**. Each step runs a model
already deployable on the platform. The output of step *N* is transformed by a **Mapper**
into the input of step *N+1*.

```
 input ──▶ [ Model A ] ──▶ (mapper A→B) ──▶ [ Model B ] ──▶ (mapper B→C) ──▶ [ Model C ] ──▶ output
            vision                            LLM                            classifier
```

Two things the user asked for explicitly:

1. **A step's model can come from either source.** When the user builds a pipeline they can:
   - **Upload a brand-new model right there in the builder** — it goes through the *normal*
     upload → auto-containerize (`build-queue`) → deploy flow, exactly like the existing
     system. The pipeline just holds a reference to the `ModelVersion` that flow produces.
   - **Pick an already-uploaded model** — any model the user can already call: their own
     existing versions **or** a marketplace model.

   In both cases a step ultimately resolves to a `ModelVersion` (+ a version-pin policy). The
   only difference is whether that version already exists or is created on the spot. The
   builder must therefore embed the existing upload UX as one of its node-creation paths.
2. **Auto-mapper.** Models rarely speak the same JSON. The platform should **detect** the
   output schema of one model and the input schema of the next, then **generate the mapping
   automatically**. The user only intervenes when the auto-mapper is unsure.

### Why this fits the platform well

The hard parts already exist:

- Every model is **already a self-serving container behind an HTTP predict API**
  (`POST /api/v1/models/:id/predict`, see [`models.controller.ts`](backend/src/modules/models/controllers/models.controller.ts)).
  A pipeline is "just" calling those endpoints in order and reshaping the JSON in between.
- **Auto-deploy on first call, idle auto-stop, and memory eviction** already exist in
  [`deploy.processor.ts`](backend/src/shared/queue/processors/deploy.processor.ts). The
  pipeline engine gets scale-to-zero for free.
- The **upload → auto-containerize → deploy** flow already exists end-to-end
  ([`build.processor.ts`](backend/src/shared/queue/processors/build.processor.ts)). A
  "new model" step in the builder reuses it verbatim — we do **not** write a second upload
  path, we just kick off the same `build-queue` job and bind the resulting `ModelVersion`
  to the step.
- Each `ModelVersion` already stores `examplePayload` + `expectedResult` (sample request/
  response JSON) and `classLabels` — see [`model-version.entity.ts`](backend/src/modules/models/entities/model-version.entity.ts).
  **This is the fuel for the auto-mapper**: we infer schemas from these samples.
- Wallet charging, per-request logging, and fraud/injection capture already wrap every
  prediction in `handlePredictionProxy`. A pipeline run is N of those, summed.
- The MCP server already does **deterministic, zero-LLM schema analysis** — the same
  philosophy the mapper should follow.

So the pipeline feature is mostly *orchestration + schema transformation* on top of
machinery that is already proven.

---

## 2. Core concepts & data model

New backend module: `backend/src/modules/pipelines/`. New entities (add all to the
`entities` array in [`app.module.ts`](backend/src/app.module.ts)):

### `Pipeline`
The reusable definition.

| field | notes |
|---|---|
| `id` | uuid |
| `name`, `description` | |
| `user` / `organization` | owner, same ownership model as `Model` |
| `status` | `DRAFT` \| `VALIDATED` \| `PUBLISHED` \| `ARCHIVED` |
| `visibility` | `PRIVATE` \| `PUBLIC` (marketplace) |
| `version` | integer; bumps on edit for reproducibility |
| `inputSchema` / `outputSchema` | JSON Schema of the *whole* pipeline (derived from step 1 input and step N output) |
| `pricingMode` | `SUM_OF_STEPS` \| `CUSTOM` (composite price) |

### `PipelineStep`
One node in the chain.

| field | notes |
|---|---|
| `id` | uuid |
| `pipeline` | FK |
| `order` | int (0-based). DAG later → replace with edges |
| `source` | `NEW_UPLOAD` (model uploaded while building this pipeline) \| `EXISTING` (own version or marketplace). Provenance only — both resolve to a `modelVersion` |
| `modelVersion` | FK to the unit that runs. For `NEW_UPLOAD` this is set once the build finishes; the step sits in a `PENDING_BUILD` state until then |
| `pinPolicy` | `PINNED` (exact version, reproducible) \| `LATEST_READY` (auto-track new versions) |
| `label` | display name in the builder |
| `timeoutMs`, `maxRetries` | per-step resiliency |
| `condition` | optional: only run step if a JSONLogic predicate over the running payload is true |

### `PipelineEdge` / `PipelineMapper`
The transform between two steps (and from pipeline-input→step-1, and last-step→pipeline-output).

| field | notes |
|---|---|
| `fromStep` / `toStep` | nullable ends represent pipeline input/output |
| `spec` | **MapperSpec JSON** — declarative field rules (see §4) |
| `autoGenerated` | boolean — was it produced by the auto-mapper? |
| `confidence` | 0–1 score from the detector |
| `status` | `OK` \| `NEEDS_REVIEW` \| `MANUAL` |

### `PipelineRun` & `PipelineStepRun`
Execution records (the audit trail, mirrors `Deployment` + `ModelLog` style).

- `PipelineRun`: input payload, final output, status (`RUNNING`/`SUCCESS`/`FAILED`/`PARTIAL`),
  total cost, total latency, who ran it, trigger (API/UI/MCP).
- `PipelineStepRun`: per-step input, output, mapped input, latency, cost, status, error,
  `payloadHash`. Reuses the same fraud/injection fingerprints already captured for predictions.

---

## 3. Execution engine

Add a third BullMQ queue alongside `build-queue` and `deploy-queue` in
[`queue.module.ts`](backend/src/shared/queue/queue.module.ts):

**`pipeline-queue`** → `pipeline.processor.ts`. For a `PipelineRun`:

1. Validate caller wallet can cover the **estimated** total (sum of step costs) up front.
2. For each step in `order`:
   a. Ensure a `RUNNING` deployment for the step's `ModelVersion` — **reuse the existing
      auto-deploy + `waitForDeployment` path**, do not reinvent it.
   b. Apply the inbound mapper (`PipelineEdge.spec`) to the running payload.
   c. Call the model's predict endpoint **through a shared internal inference client**
      (see refactor below), charging the wallet, logging the call, running injection scan.
   d. Persist a `PipelineStepRun`; stream progress over the existing Socket.IO
      `log-stream.gateway.ts` so the UI shows a live per-step trace.
   e. On error: retry up to `maxRetries`, else fail the run (`PARTIAL` if some steps
      already succeeded). Refund the unused step budget.
3. Apply the output mapper; persist `PipelineRun` result.

### Required refactor (do this first — it's load-bearing)

Today the charge/log/proxy logic lives **inside** `handlePredictionProxy` in
[`models.controller.ts`](backend/src/modules/models/controllers/models.controller.ts).
Extract it into a reusable **`InferenceClient` service** in the `models` (or `shared`)
module that takes `(modelVersion, payload, actor)` and returns `{ output, cost, latency,
statusCode, log }`. Then:

- The public `POST /:id/predict` endpoint calls it (no behavior change).
- The pipeline processor calls it per step.

This guarantees a pipeline step is billed, logged, fraud-scanned, and rate-limited
**exactly** like a direct call — no parallel, drifting code path. **Do this refactor before
writing the engine.**

### Triggering a run

- `POST /api/v1/pipelines/:id/run` — synchronous-ish (long-poll/SSE) for interactive use.
- Reuse `ApiKeyOrJwtGuard` + `WorkspaceInterceptor` so pipelines are callable with the same
  API keys as models, and billed to the right workspace.

---

## 4. The auto-mapper (the interesting part)

The mapper has two halves: **detect schemas** and **generate + execute a transform**.

### 4.1 Schema detection (deterministic, zero-LLM)

For each model version we infer:

- **Output schema** of step *N* from `expectedResult` (+ the `OUTPUT_SCHEMA_PATH` already
  produced at build time, + `classLabels`).
- **Input schema** of step *N+1* from `examplePayload`.

Infer types/shapes by walking the sample JSON: scalar types, arrays, nested objects,
fixed-length numeric vectors (embeddings), label maps. Tag each field with a **semantic
role** using `taskType`/`modelType` (e.g. a vision model's output is `caption:text`; a
classifier's is `label:categorical` + `score:number`; an embedding model's is
`vector:float[]`). This reuses the analyzer philosophy already in the MCP server
(`src/analyzers/`).

### 4.2 Mapping generation

Produce a **MapperSpec** — a *declarative* list of field rules, never executable code:

```jsonc
{
  "rules": [
    { "op": "copy",        "from": "$.prediction.caption", "to": "$.messages[0].content" },
    { "op": "decodeLabel", "from": "$.class_id", "to": "$.label", "labels": "@classLabels" },
    { "op": "template",    "to": "$.prompt", "template": "Classify: {{caption}}" },
    { "op": "cast",        "from": "$.score", "to": "$.confidence", "as": "number" },
    { "op": "default",     "to": "$.temperature", "value": 0.2 }
  ]
}
```

Candidate rules are generated by, in order of confidence:

1. **Exact name + type match** → `copy`.
2. **Type/shape match** (e.g. both `float[768]`) → `copy`, even if names differ.
3. **Semantic role match** (caption→prompt content, label→text via `classLabels` decode).
4. **Known adapter templates** for common cross-type hops (see table below).
5. Anything left unmatched → mark the edge `NEEDS_REVIEW` with a low `confidence`.

| from → to | adapter |
|---|---|
| tabular → tabular | field-by-field name/type map |
| LLM → LLM | pass text; optional prompt-template wrap |
| vision(caption) → LLM | extract caption string into `messages[].content` |
| classifier → LLM | `decodeLabel` via `classLabels`, inject into a prompt template |
| embedding → retrieval/tabular | pass the vector; validate dimension |

**Execution is a safe interpreter** over the MapperSpec ops (`copy`, `rename`, `cast`,
`template`, `decodeLabel`, `default`, `pick`, `extractPath`). **No `eval`, no user code.**
This keeps the same hard invariant the MCP server holds and avoids an RCE surface.

### 4.3 Where an LLM *may* help (optional, BYOI)

Mapping ambiguous fields is exactly the kind of judgement an LLM is good at — but the
platform's MCP server is contractually **zero-LLM**. Two clean options:

- **Default:** deterministic detector proposes the spec; the user confirms low-confidence
  edges in the builder UI. No LLM in the platform.
- **Optional:** expose a `pipeline.suggest_mapping` MCP tool that returns the detected
  schemas + candidate rules, and let the *external* agent (Claude Code / Cursor under the
  existing "Bring Your Own Intelligence" model) propose the final mapping. The platform
  still only **executes** a declarative spec — it never calls an LLM itself.

Recommended: ship the deterministic detector first; add the BYOI suggestion as a follow-up.

### 4.4 Design-time validation

Because every version carries `examplePayload`/`expectedResult`, we can **dry-run the whole
chain on sample data at save time** — run each mapper against the stored samples and confirm
the produced payload satisfies the next step's input schema. This turns "the pipeline breaks
in production" into a red ❌ in the builder before publish. Flip `Pipeline.status` to
`VALIDATED` only when every edge passes.

Note this also gates **new-upload steps**: their `examplePayload`/`expectedResult` only
exist once `build-queue` finishes, so a pipeline containing a `PENDING_BUILD` step stays
`DRAFT` and cannot be validated or run until every step reaches `READY`.

---

## 5. What needs to be added (checklist)

**Backend**
- [ ] `pipelines` module: `Pipeline`, `PipelineStep`, `PipelineEdge`, `PipelineRun`,
      `PipelineStepRun` entities (+ register in `app.module.ts`).
- [ ] `pipeline-queue` + `pipeline.processor.ts` orchestration job.
- [ ] **Refactor** prediction proxy → shared `InferenceClient` service.
- [ ] `SchemaInferenceService` (sample JSON → JSON Schema + semantic roles).
- [ ] `MapperGeneratorService` (schemas → MapperSpec + confidence).
- [ ] `MapperEngine` (safe declarative interpreter).
- [ ] `PipelinesService` + `PipelinesController` (CRUD, validate, run) with `class-validator`
      DTOs (global `ValidationPipe` strips undecorated fields).
- [ ] Wallet integration: pre-authorize estimated total, charge per step, refund on failure.
- [ ] Observability: per-step spans on the existing OTel trace; live logs via the Socket.IO gateway.

**Frontend** (follow [`frontend/CLAUDE.md`](frontend/CLAUDE.md) layering)
- [ ] Pipeline **builder** page (a flow/canvas — e.g. React Flow) under `(dashboard)`.
- [ ] **Node creation, two paths**: (a) **Upload new model** — embed the existing upload form
      so a step can be created from a fresh weights file, then poll build status inside the
      node; (b) **Pick existing** — tabs for "My models" and "Marketplace", with version-pin
      selector. A step shows `PENDING_BUILD → READY` while its new upload containerizes.
- [ ] **Mapper panel**: shows auto-detected mapping, confidence badges, and a manual override
      editor for `NEEDS_REVIEW` edges.
- [ ] **Run/Test panel**: input form (driven by the pipeline `inputSchema`), live per-step
      trace, per-step + total cost, final output.
- [ ] Zod schemas in `src/lib/schemas/`, domain service in `src/lib/services/`, server actions
      for mutations.

**MCP server** (optional, fits existing tooling)
- [ ] `pipeline.get_spec`, `pipeline.suggest_mapping`, `pipeline.validate` tools — all
      deterministic context providers; the external agent does any reasoning.

---

## 6. Improvements — maximizing the gain

These are what turn "chain two models" into a headline feature:

1. **Pipeline-as-a-model.** Expose a published pipeline behind a single
   `POST /pipelines/:id/predict` that looks *identical* to a model predict endpoint. Then a
   pipeline is consumable like any model — **and can itself be a step in another pipeline**
   (composition/recursion). This is the highest-leverage idea here.
2. **Marketplace composite products.** Publish pipelines for sale; split revenue across the
   providers of each constituent model using the existing `providerSharePercent` machinery.
   A pipeline author monetizes orchestration; model owners still get paid per step.
3. **Cost & latency preview.** Before running, show estimated credits and a latency budget
   (sum of step p50s from existing analytics). Block runs that exceed a configured ceiling.
4. **DAG, branches & conditions.** Move from linear chain to a DAG: fan-out (run steps in
   parallel), conditional routing (`PipelineStep.condition`), and bounded loops (max-iteration
   guard) for ag/iterative refinement patterns.
5. **Result caching.** `payloadHash` is already computed per call — cache step outputs keyed
   by `(modelVersionId, mappedInputHash)` in Redis so re-runs and shared sub-chains are free.
6. **Mapper confidence gating.** Don't let a pipeline publish while any edge is
   `NEEDS_REVIEW`; surface a clear "2 mappings need your confirmation" state.
7. **Reproducibility.** `PINNED` steps + immutable `Pipeline.version` mean a run is fully
   reproducible; `LATEST_READY` steps auto-upgrade — let the author choose per step.
8. **Safety on intermediate text.** Run the existing injection scanner on text that flows
   *between* steps, not just at the edge — a chain is a new place for prompt injection to enter.
9. **Warm-path scheduling.** For latency-sensitive pipelines, pre-warm the next step's
   container while the current step is still running (the deploy queue already manages RAM
   eviction, so this is a scheduling hint, not new infra).

---

## 7. Suggested build order

1. `InferenceClient` refactor (no new feature, pure groundwork).
2. Entities + `pipeline-queue` + a **linear, no-mapper** engine (steps must already match).
3. `SchemaInferenceService` + `MapperEngine` (execute hand-written specs).
4. `MapperGeneratorService` (auto-detect) + design-time dry-run validation.
5. Frontend builder + model picker + run trace.
6. Pipeline-as-a-model endpoint + marketplace publishing.
7. DAG, caching, BYOI mapping suggestions.

Ship 1–3 behind a feature flag to get a working end-to-end chain quickly, then layer the
auto-mapper and the marketplace gains on top.

---

### My take

The feature is a strong fit because the platform already exposes every model as a uniform
HTTP predict service with auto-deploy, billing, and logging — so chaining is mostly
orchestration plus JSON reshaping. The **one design decision that matters most** is keeping
the mapper a *declarative, safe-to-execute spec* (no user code, no platform-side LLM),
detected from the `examplePayload`/`expectedResult` samples you already store. That keeps the
"deterministic, zero-LLM, never executes arbitrary code" invariant intact while still giving
users a zero-config "it just wires itself" experience. The biggest multiplier is
**pipeline-as-a-model** (so pipelines compose and sell like models); the biggest risk to
contain early is the **duplicated inference path** — refactor the predict proxy into a shared
client before you write the engine.
