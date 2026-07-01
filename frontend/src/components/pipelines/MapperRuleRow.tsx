"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { MapperRuleRow } from "@/lib/schemas";
import { Input } from "@/components/ui/input";

/** A namespace option shown in the source namespace dropdown. */
export interface NamespaceOption {
  value: string;
  label: string;
}

interface MapperRuleRowProps {
  rule: MapperRuleRow;
  index: number;
  namespaceOptions: NamespaceOption[];
  /** Leaf-path suggestions for the chosen source namespace. */
  fromSuggestions: string[];
  /** Leaf-path suggestions for the target step's expected input. */
  toSuggestions: string[];
  onChange: (index: number, patch: Partial<MapperRuleRow>) => void;
  onRemove: (index: number) => void;
}

const CAST_TYPES: MapperRuleRow["as"][] = ["string", "number", "boolean"];

/**
 * Native-select classes that match the design system's input styling.
 * `bg-background` is required for dark mode — `bg-transparent` causes the
 * OS to render the option dropdown in its default light colours.
 */
const selectCls =
  "h-7 rounded-lg border border-input bg-background text-foreground px-2 text-xs transition-colors focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 cursor-pointer font-mono";

/**
 * Renders one row in the visual mapper rule builder: operation selector,
 * source namespace + field-path picker with datalist suggestions, target
 * field picker, and op-specific extras. All dropdowns use native `<select>`
 * so they work reliably inside parent dialogs without portal z-index conflicts.
 *
 * @param props - MapperRuleRow component properties.
 * @returns The React component rendering one rule row.
 */
export function MapperRuleRowEditor({
  rule,
  index,
  namespaceOptions,
  fromSuggestions,
  toSuggestions,
  onChange,
  onRemove,
}: MapperRuleRowProps) {
  const fromSuggestionsId = `from-suggestions-${index}`;
  const toSuggestionsId = `to-suggestions-${index}`;
  const needsFrom = rule.op === "copy" || rule.op === "cast";
  const needsTemplate = rule.op === "template";
  const needsValue = rule.op === "default";

  return (
    <div className="border border-border rounded-lg p-3 bg-background space-y-2 font-mono text-xs">
      {/* Top row: op selector + remove button */}
      <div className="flex items-center gap-2">
        <select
          className={`${selectCls} w-28`}
          value={rule.op}
          onChange={(e) => onChange(index, { op: e.target.value as MapperRuleRow["op"] })}
        >
          <option value="copy">copy</option>
          <option value="cast">cast</option>
          <option value="default">default</option>
          <option value="template">template</option>
        </select>

        <span className="text-muted-foreground text-[10px] flex-1">
          {rule.op === "copy" && "Copy a field value from source to target"}
          {rule.op === "cast" && "Copy and convert to a different type"}
          {rule.op === "default" && "Set a fixed default value when field is absent"}
          {rule.op === "template" && "Build a string using {{namespace.path}} tokens"}
        </span>

        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Source: namespace dropdown + field path input */}
      {needsFrom && (
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-muted-foreground w-8 shrink-0">from</span>
          <select
            className={`${selectCls} w-40 shrink-0`}
            value={rule.namespace}
            onChange={(e) => onChange(index, { namespace: e.target.value })}
          >
            {namespaceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="flex-1">
            <Input
              list={fromSuggestionsId}
              value={rule.fromPath}
              onChange={(e) => onChange(index, { fromPath: e.target.value })}
              placeholder="field.path[0]"
              className="h-7 text-xs font-mono"
            />
            <datalist id={fromSuggestionsId}>
              {fromSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </div>
      )}

      {/* Template string */}
      {needsTemplate && (
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-muted-foreground w-8 shrink-0">tmpl</span>
          <Input
            value={rule.template}
            onChange={(e) => onChange(index, { template: e.target.value })}
            placeholder='e.g. "Classify: {{previous.text}}"'
            className="flex-1 h-7 text-xs font-mono"
          />
        </div>
      )}

      {/* Default literal value */}
      {needsValue && (
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-muted-foreground w-8 shrink-0">val</span>
          <Input
            value={rule.value}
            onChange={(e) => onChange(index, { value: e.target.value })}
            placeholder="literal value — string, number, or valid JSON"
            className="flex-1 h-7 text-xs font-mono"
          />
        </div>
      )}

      {/* Target field + optional cast type */}
      <div className="flex gap-2 items-center">
        <span className="text-[10px] text-muted-foreground w-8 shrink-0">→ to</span>
        <div className="flex-1">
          <Input
            list={toSuggestionsId}
            value={rule.to}
            onChange={(e) => onChange(index, { to: e.target.value })}
            placeholder="output field name"
            className="h-7 text-xs font-mono"
          />
          <datalist id={toSuggestionsId}>
            {toSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        {rule.op === "cast" && (
          <select
            className={`${selectCls} w-24 shrink-0`}
            value={rule.as}
            onChange={(e) => onChange(index, { as: e.target.value as MapperRuleRow["as"] })}
          >
            {CAST_TYPES.map((t) => (
              <option key={t} value={t}>
                as {t}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
