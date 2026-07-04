"use client";

import React, { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { PipelineStep, PipelineEdge, MapperRule } from "@/types";
import { MapperRuleRow } from "@/lib/schemas";
import { pathsFromJsonSample } from "@/lib/utils/json-paths";
import { groupByStage, stepNamespacePath } from "@/lib/utils/pipelines";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapperRuleRowEditor, NamespaceOption } from "./MapperRuleRow";

const BOUNDARY = "__boundary__";

const EMPTY_RULE: MapperRuleRow = {
  op: "copy",
  namespace: "input",
  fromPath: "",
  to: "",
  as: "string",
  value: "",
  template: "",
};

/**
 * Tailwind classes for a native `<select>` styled to match the design system.
 * `bg-background` (not `bg-transparent`) is required so the OS renders the
 * native dropdown option list with the correct dark-mode background instead
 * of the browser's default white.
 */
const nativeSelectCls =
  "w-full h-8 rounded-lg border border-input bg-background text-foreground px-2.5 text-xs transition-colors focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 cursor-pointer font-mono";

/**
 * Serialises a {@link MapperRuleRow} into the backend-facing {@link MapperRule}.
 * Combines namespace + path into a single `from` string (`namespace.path`).
 *
 * @param row - The form row to serialise.
 * @returns A valid MapperRule, or null if required fields are missing.
 */
function serialiseRow(row: MapperRuleRow): MapperRule | null {
  const to = row.to.trim();
  if (!to) return null;
  const from = `${row.namespace}.${row.fromPath.trim()}`;
  switch (row.op) {
    case "copy":
      return row.fromPath.trim() ? { op: "copy", from, to } : null;
    case "cast":
      return row.fromPath.trim() ? { op: "cast", from, to, as: row.as } : null;
    case "default": {
      let parsed: unknown = row.value;
      try {
        parsed = JSON.parse(row.value);
      } catch {
        /* keep as string literal */
      }
      return row.value.trim() ? { op: "default", to, value: parsed } : null;
    }
    case "template":
      return row.template.trim() ? { op: "template", to, template: row.template } : null;
  }
}

/**
 * Builds the list of selectable source namespaces for a mapper targeting
 * `toStepOrder` — every step's context is available except steps at or after
 * the target, since those haven't run yet.
 *
 * @param sortedSteps - All pipeline steps, ordered by stage.
 * @param toStepOrder - The order of the edge's target step, or `Infinity` for the pipeline output.
 * @returns The namespace dropdown options.
 */
function buildNamespaceOptions(sortedSteps: PipelineStep[], toStepOrder: number): NamespaceOption[] {
  const stages = groupByStage(sortedSteps);
  const stageSizeByOrder = new Map(stages.map((stage) => [stage[0].order, stage.length]));
  return [
    { value: "input", label: "Pipeline Input" },
    { value: "previous", label: "Previous Step" },
    ...sortedSteps
      .filter((s) => s.order < toStepOrder)
      .map((s) => {
        const path = stepNamespacePath(s, stageSizeByOrder.get(s.order) ?? 1);
        return {
          value: path,
          label: `${path} — ${s.modelVersion?.model?.name ?? `Step ${s.order}`}`,
        };
      }),
  ];
}

/**
 * Reconstructs a form row from a persisted {@link MapperRule}, splitting its
 * combined `namespace.path` source string back into the two form fields by
 * matching the longest known namespace value.
 *
 * @param rule - The persisted mapper rule.
 * @param namespaceOptions - The namespace options valid for this rule's edge target.
 * @returns The equivalent MapperRuleRow for the rule-builder form.
 */
function deserialiseRule(rule: MapperRule, namespaceOptions: NamespaceOption[]): MapperRuleRow {
  const row: MapperRuleRow = { ...EMPTY_RULE, op: rule.op, to: rule.to };

  if (rule.op === "default") {
    row.value = typeof rule.value === "string" ? rule.value : JSON.stringify(rule.value);
    return row;
  }
  if (rule.op === "template") {
    row.template = rule.template;
    return row;
  }

  // copy / cast: `from` is a combined "namespace.path" string.
  const from = rule.from;
  const matchingNamespaces = namespaceOptions
    .map((opt) => opt.value)
    .filter((ns) => from === ns || from.startsWith(`${ns}.`))
    .sort((a, b) => b.length - a.length);
  const namespace = matchingNamespaces[0] ?? "input";
  row.namespace = namespace;
  row.fromPath = from === namespace ? "" : from.slice(namespace.length + 1);
  if (rule.op === "cast") row.as = rule.as;
  return row;
}

/**
 * Builds a human-readable step label showing the step index and model name.
 *
 * @param step - The pipeline step to label.
 * @returns A readable label string.
 */
function stepOptionLabel(step: PipelineStep): string {
  const modelName = step.modelVersion?.model?.name;
  const roleSuffix = step.role ? ` [${step.role}]` : "";
  return modelName
    ? `Step ${step.order}${roleSuffix} — ${modelName} v${step.modelVersion?.versionNumber ?? ""}`
    : `Step ${step.order}${roleSuffix}${step.label ? ` (${step.label})` : ""}`;
}

interface MapperEdgeDialogProps {
  steps: PipelineStep[];
  isSubmitting: boolean;
  onUpsert: (
    fromStepId: string | undefined,
    toStepId: string | undefined,
    spec: { rules: MapperRule[] },
  ) => Promise<boolean>;
  /** When provided, the dialog opens pre-filled with this edge's from/to/rules for editing instead of creating a new mapper. */
  initialEdge?: PipelineEdge;
}

/**
 * "Add / Replace Mapper" dialog. Provides a structured rule-builder UI:
 * step-to-step selectors, per-rule operation + source namespace + field-path
 * pickers, all using native `<select>` / `<datalist>` so they work reliably
 * inside a Dialog without portal z-index conflicts. When `initialEdge` is
 * given, the dialog opens in edit mode, pre-filling the form from that
 * edge's existing configuration — including renaming a wrong output key by
 * changing an existing rule's `to` field.
 *
 * @param props - MapperEdgeDialog component properties.
 * @returns The React component rendering the trigger button + dialog.
 */
export function MapperEdgeDialog({ steps, isSubmitting, onUpsert, initialEdge }: MapperEdgeDialogProps) {
  const isEditMode = Boolean(initialEdge);
  const [open, setOpen] = useState(false);
  const [fromStepId, setFromStepId] = useState<string>(initialEdge?.fromStep?.id ?? BOUNDARY);
  const [toStepId, setToStepId] = useState<string>(initialEdge?.toStep?.id ?? BOUNDARY);
  const [rules, setRules] = useState<MapperRuleRow[]>(() => {
    if (!initialEdge || initialEdge.spec.rules.length === 0) return [{ ...EMPTY_RULE }];
    const targetOrder = initialEdge.toStep
      ? (steps.find((s) => s.id === initialEdge.toStep?.id)?.order ?? Infinity)
      : Infinity;
    const nsOptions = buildNamespaceOptions([...steps].sort((a, b) => a.order - b.order), targetOrder);
    return initialEdge.spec.rules.map((rule) => deserialiseRule(rule, nsOptions));
  });
  const [error, setError] = useState("");

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
  const toStepOrder =
    toStepId === BOUNDARY
      ? Infinity
      : (sortedSteps.find((s) => s.id === toStepId)?.order ?? Infinity);

  const namespaceOptions: NamespaceOption[] = buildNamespaceOptions(sortedSteps, toStepOrder);

  const fromSuggestionsForNamespace = (ns: string): string[] => {
    if (ns === "input") {
      return pathsFromJsonSample(sortedSteps[0]?.modelVersion?.examplePayload);
    }
    if (ns === "previous") {
      const prevStep = [...sortedSteps].reverse().find((s) => s.order < toStepOrder);
      return pathsFromJsonSample(prevStep?.modelVersion?.expectedResult);
    }
    const [, orderStr, roleOrId] = ns.split(".");
    const step = sortedSteps.find(
      (s) => String(s.order) === orderStr && (!roleOrId || (s.role ?? s.id) === roleOrId),
    );
    return pathsFromJsonSample(step?.modelVersion?.expectedResult);
  };

  const toStep = toStepId !== BOUNDARY ? sortedSteps.find((s) => s.id === toStepId) : null;
  const toSuggestions = pathsFromJsonSample(toStep?.modelVersion?.examplePayload);

  const handleRuleChange = (i: number, patch: Partial<MapperRuleRow>) => {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async () => {
    setError("");
    const serialised = rules.map(serialiseRow);
    const incomplete = serialised.findIndex((r) => r === null);
    if (incomplete !== -1) {
      setError(`Rule ${incomplete + 1} is incomplete — fill in all required fields.`);
      return;
    }
    const spec = { rules: serialised.filter(Boolean) as MapperRule[] };
    const ok = await onUpsert(
      fromStepId === BOUNDARY ? undefined : fromStepId,
      toStepId === BOUNDARY ? undefined : toStepId,
      spec,
    );
    if (ok) {
      setOpen(false);
      if (!isEditMode) {
        setRules([{ ...EMPTY_RULE }]);
        setFromStepId(BOUNDARY);
        setToStepId(BOUNDARY);
      }
    }
  };

  /** Restores the form to its starting point — the source edge's saved state in edit mode, or blank in create mode. */
  const resetDialog = () => {
    setError("");
    if (isEditMode && initialEdge) {
      setFromStepId(initialEdge.fromStep?.id ?? BOUNDARY);
      setToStepId(initialEdge.toStep?.id ?? BOUNDARY);
      const targetOrder = initialEdge.toStep
        ? (steps.find((s) => s.id === initialEdge.toStep?.id)?.order ?? Infinity)
        : Infinity;
      const nsOptions = buildNamespaceOptions([...steps].sort((a, b) => a.order - b.order), targetOrder);
      setRules(
        initialEdge.spec.rules.length === 0
          ? [{ ...EMPTY_RULE }]
          : initialEdge.spec.rules.map((rule) => deserialiseRule(rule, nsOptions)),
      );
      return;
    }
    setRules([{ ...EMPTY_RULE }]);
    setFromStepId(BOUNDARY);
    setToStepId(BOUNDARY);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetDialog();
      }}
    >
      <DialogTrigger
        className={
          isEditMode
            ? "p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer shrink-0"
            : "btn-outline text-xs"
        }
      >
        {isEditMode ? (
          <Pencil className="w-3.5 h-3.5" />
        ) : (
          <>
            <Plus className="w-3.5 h-3.5" /> Add Mapper
          </>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[580px] bg-card border border-border text-foreground font-sans p-5 rounded-xl shadow-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-sm font-bold text-foreground">
            {isEditMode ? "Edit Mapper" : "Add / Replace Mapper"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose which steps this edge connects, then build field rules.
            Paths use{" "}
            <code className="bg-secondary px-1 rounded text-[10px]">input.x</code>{" "}
            <code className="bg-secondary px-1 rounded text-[10px]">previous.x</code>{" "}
            <code className="bg-secondary px-1 rounded text-[10px]">steps.0.x</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* From / To step selectors — native <select> to avoid portal conflicts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Edge From
              </Label>
              <select
                className={nativeSelectCls}
                value={fromStepId}
                onChange={(e) => setFromStepId(e.target.value)}
              >
                <option value={BOUNDARY}>Pipeline Input</option>
                {sortedSteps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {stepOptionLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Edge To
              </Label>
              <select
                className={nativeSelectCls}
                value={toStepId}
                onChange={(e) => setToStepId(e.target.value)}
              >
                <option value={BOUNDARY}>Pipeline Output</option>
                {sortedSteps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {stepOptionLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {steps.length === 0 && (
            <p className="text-xs text-amber-500 font-mono border border-amber-500/30 bg-amber-500/10 rounded-lg px-3 py-2">
              No steps added yet — add steps to this pipeline first before configuring mappers.
            </p>
          )}

          {/* Field rules */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Field Rules
              </Label>
              <button
                type="button"
                onClick={() => setRules((prev) => [...prev, { ...EMPTY_RULE }])}
                className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
              >
                + Add Rule
              </button>
            </div>

            {rules.map((rule, i) => (
              <MapperRuleRowEditor
                key={i}
                rule={rule}
                index={i}
                namespaceOptions={namespaceOptions}
                fromSuggestions={fromSuggestionsForNamespace(rule.namespace)}
                toSuggestions={toSuggestions}
                onChange={handleRuleChange}
                onRemove={(idx) => setRules((prev) => prev.filter((_, j) => j !== idx))}
              />
            ))}

            {rules.length === 0 && (
              <p className="text-xs text-muted-foreground font-mono text-center py-2">
                No rules — empty mapper passes the previous step&apos;s output through unchanged.
              </p>
            )}
          </div>

          {error && (
            <p className="text-[10px] text-destructive font-semibold">{error}</p>
          )}
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Mapper"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
