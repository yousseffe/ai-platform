# Pipelines

A pipeline is a reusable chain of model-calling steps. Each step calls one deployed model
version; the output of some steps feeds into the input of others through a **mapper** — a
declarative, non-code rule set. This document explains the data model, how execution works
(including parallel branches), and how the builder UI maps onto it.

## Core concepts

| Concept | What it is |
|---|---|
| **Pipeline** | The reusable definition: name, description, `type` (a label, see below), `status` (`draft` / `validated` / `archived`), a set of steps and edges. |
| **Stage** (`PipelineStep.order`) | A 0-based index. All steps sharing the same `order` run **concurrently**, as parallel branches of that stage. Stages themselves run in ascending order. |
| **Step** | One model call within a stage. Has a `label` (display name) and, when its stage has more than one step, a **`role`** — a short name (`"summarizer"`, `"classifier"`, …) that disambiguates it from its siblings. |
| **Edge / Mapper** | The transform applied to the payload flowing from one step (or the pipeline's external input) into another step (or the pipeline's external output). Holds a `spec: { rules: MapperRule[] }` interpreted by a safe, non-code engine — never `eval`. |
| **Run** | One execution of a pipeline: input payload, final output, status, cost, and a per-step trace (`PipelineStepRun[]`). |

There is **one execution engine**. It doesn't special-case "sequential" vs "parallel" — every
pipeline is walked stage by stage, and a stage with one step behaves exactly like the old
strictly-linear chain did. A stage with multiple steps is what makes it parallel. Nothing else
changes.

## Pipeline "type" — label only, no restrictions

When creating a pipeline you pick one of three presets:

- **Sequential (Chain)** — one step at a time, each step's output maps into the next.
- **Context-Augmented** — later steps pull fields from several earlier steps, not just the one
  immediately before them.
- **Parallel** — multiple steps run at once, then a join step combines their outputs.

**This is metadata only.** It is stored on the `Pipeline` row and used in exactly two places: the
create-dialog's initial selection and a badge on the pipeline detail page. It is **never** read by
the execution engine or by `validatePipeline()`. Picking "Sequential" does not stop you from later
adding a second step into an existing stage (a parallel branch) — nothing checks the pipeline's
`type` before allowing it. The selector exists so a new user has a starting mental model instead
of a blank canvas, and so a pipeline's shape is visible at a glance without opening it. If you want
it to actually restrict or warn (e.g. flag a "Sequential" pipeline that grew a parallel stage),
that's a deliberate follow-up, not something already wired in.

The only real structural rule the backend enforces is independent of `type`: **a stage with more
than one step requires every one of those steps to have a distinct, non-null `role`.** This is
checked when you click "Validate" (`PipelinesService.validatePipeline` →
`assertStageRolesAreUnambiguous`), not at every edit, so you can build incrementally.

## How a run executes

Implemented in [`pipeline-step-loop.service.ts`](../backend/src/modules/pipelines/services/pipeline-step-loop.service.ts)
and [`pipeline-runner.service.ts`](../backend/src/modules/pipelines/services/pipeline-runner.service.ts):

1. Steps are grouped into stages by `order`, ascending.
2. Each stage's steps run **concurrently** (`Promise.all`). A stage fully completes (success or
   failure, per step) before the next stage starts.
3. For each step, every inbound edge **targeting that step** is applied independently, each
   against its own upstream step's output, and the results are **shallow-merged** into that
   step's input. This is the whole mechanism behind fan-in: a "join" step downstream of a
   parallel stage just has more than one inbound edge, each with its own from/to mapper writing
   to a different field — no separate "parallel mode" logic, it's the same mapper applied
   multiple times.
4. If a step has **no** inbound edge, it falls back to the old convenient default: the single
   immediately-prior stage's output (or the pipeline's raw input, for the first stage). This is
   why plain sequential pipelines never needed explicit edges before, and still don't.
5. If any step in a stage fails, execution stops before the next stage. The run is marked
   `PARTIAL` if at least one step anywhere succeeded, else `FAILED`.
6. The pipeline's final output is resolved the exact same way, treating "pipeline output" as a
   virtual target: every edge with `toStep = null` is applied and merged. With zero such edges it
   defaults to the last stage's output (if that stage was a single step).

### Addressing branches in mapper rules

A rule's `from` (or a `{{template}}` token) is a dotted path into one of three namespaces:

- `input.*` — the pipeline run's original external input.
- `previous.*` — *this edge's own* upstream step's output (or `input` if the edge's source is the
  pipeline's external input). Unambiguous per-edge, even for join steps with several inbound edges.
- `steps.<order>.*` — any earlier stage's output.
  - If that stage had exactly one step: `steps.<order>.fieldName` (flat, unchanged from before).
  - If that stage had multiple parallel steps: `steps.<order>.<role>.fieldName` — nested one level
    by each step's `role` so you can pick one specific branch.

Example: a stage 1 with two parallel steps, roles `summarizer` and `classifier`, feeding a stage-2
join step. The join step gets two inbound edges:

```
edge A: from = Step(role: summarizer), to = join step
  rules: [{ op: "copy", from: "previous.summary", to: "summary" }]

edge B: from = Step(role: classifier), to = join step
  rules: [{ op: "copy", from: "previous.label", to: "category" }]
```

The join step's input ends up as `{ "summary": "...", "category": "..." }` — each branch wrote its
own field, with its own from/to mapper, exactly as described. A downstream step (or the pipeline's
output) could also reach further back with `steps.1.summarizer.summary` / `steps.1.classifier.label`
directly, without needing an edge at all, since `steps.<order>.*` is available everywhere.

## Building each shape in the UI

- **Sequential**: Add Step repeatedly, always choosing **"New Stage"** in the stage selector. No
  `role` needed (each stage has one step). Add mappers as needed, or skip them — no-edge steps
  auto-inherit the previous step's output.
- **Context-Augmented**: Same as sequential for adding steps, but when building a mapper for a
  later step, pick `steps.<N>` for an earlier (non-adjacent) stage's output in the source namespace
  dropdown, instead of only `previous`.
- **Parallel**: Add the first branch as a new stage. Add the second (and further) branches by
  choosing **"Parallel branch of Stage N"** in the stage selector — the dialog then requires a
  `role`. Add a downstream step as a new stage, then add one mapper edge per branch feeding it
  (Mappers panel → Add Mapper → From = the branch step, To = the join step).

## Where this lives in the code

**Backend** (`backend/src/modules/pipelines/`):
- `enums/pipeline-type.enum.ts` — the three type presets.
- `entities/pipeline.entity.ts` — adds `type`.
- `entities/pipeline-step.entity.ts` — adds `role`; `order` JSDoc redefined as "stage index."
- `entities/pipeline-edge.entity.ts` — doc updated to describe fan-in/fan-out.
- `interfaces/mapper-spec.interface.ts` — `MapperContext.steps` documents the flat-vs-role-nested
  dual shape.
- `services/pipeline-step-loop.service.ts` — the stage-grouped, concurrent execution rewrite;
  also exposes `resolveMappedInput()`, reused by the runner for the final output.
- `services/pipeline-runner.service.ts` — final-output resolution via the same merge logic.
- `services/pipelines.service.ts` — `assertStageRolesAreUnambiguous()` validation.
- `dto/*` — `type` on pipeline DTOs, `role` on step DTOs.

**Frontend** (`frontend/src/`):
- `types/pipelines/index.ts`, `lib/schemas/pipelines/index.ts` — `PipelineType` enum, `role` field.
- `lib/utils/pipelines.ts` — `groupByStage()` and `stepNamespacePath()`, shared by every panel below.
- `components/pipelines/CreatePipelineDialog.tsx` — the type selector.
- `components/pipelines/PipelineStepsPanel.tsx` + `PipelineStageGroup.tsx` + `PipelineStepCard.tsx`
  — stage-grouped step list, parallel stages rendered side by side.
- `components/pipelines/AddPipelineStepDialog.tsx` — the Stage + Role controls.
- `components/pipelines/PipelineEdgesPanel.tsx` — mappers grouped by target step, so fan-in joins
  cluster visually.
- `components/pipelines/MapperEdgeDialog.tsx` — offers `steps.<order>.<role>` path suggestions once
  a stage has siblings.
- `components/pipelines/PipelineRunDetailDialog.tsx` — groups the run trace by stage, so parallel
  step runs render side by side.
- `app/(dashboard)/pipelines/[id]/PipelineDetailsClient.tsx` — the `type` badge on the header.
