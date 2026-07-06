"use client";

import React from "react";
import { Trash2, Copy, GitBranch, Settings2, Code } from "lucide-react";
import { MapperRuleRow } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
 * Renders one row in the visual mapper rule builder: operation selector,
 * source namespace + field-path picker with datalist suggestions, target
 * field picker, and op-specific extras.
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

  // Operator specific icon helpers
  const getOpIcon = (op: string) => {
    switch (op) {
      case "copy":
        return <Copy className="w-3.5 h-3.5 text-muted-foreground mr-1.5" />;
      case "cast":
        return <GitBranch className="w-3.5 h-3.5 text-muted-foreground mr-1.5 rotate-90" />;
      case "default":
        return <Settings2 className="w-3.5 h-3.5 text-muted-foreground mr-1.5" />;
      case "template":
        return <Code className="w-3.5 h-3.5 text-muted-foreground mr-1.5" />;
      default:
        return null;
    }
  };

  return (
    <div className="border border-border/80 rounded-xl p-4 bg-slate-50/15 dark:bg-zinc-900/5 space-y-4 font-sans text-xs">
      {/* Top row: op selector + remove button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Select
            value={rule.op}
            onValueChange={(val) => onChange(index, { op: val as MapperRuleRow["op"] })}
          >
            <SelectTrigger className="w-36 h-9 text-xs bg-card border-border/80 rounded-xl font-semibold capitalize flex items-center justify-between">
              <div className="flex items-center">
                {getOpIcon(rule.op)}
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="copy">Copy</SelectItem>
              <SelectItem value="cast">Cast</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="template">Template</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-muted-foreground text-[11px] leading-normal flex-1">
            {rule.op === "copy" && "Copy a field value from source to target"}
            {rule.op === "cast" && "Copy and convert to a different type"}
            {rule.op === "default" && "Set a fixed default value when field is absent"}
            {rule.op === "template" && "Build a string using {{namespace.path}} tokens"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/50 bg-card/65 transition-colors cursor-pointer shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Inputs container */}
      <div className="space-y-3 pt-1">
        {/* Source: namespace dropdown + field path input */}
        {needsFrom && (
          <div className="flex gap-2 items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-10 shrink-0">from</span>
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <Select
                value={rule.namespace}
                onValueChange={(val) => onChange(index, { namespace: val })}
              >
                <SelectTrigger className="w-full sm:w-44 h-9 text-xs bg-card border-border/80 rounded-xl font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {namespaceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex-1 flex items-center border border-border/80 bg-card rounded-xl overflow-hidden h-9 px-0 shadow-xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <input
                  list={fromSuggestionsId}
                  value={rule.fromPath}
                  onChange={(e) => onChange(index, { fromPath: e.target.value })}
                  placeholder="field.path[0]"
                  className="flex-1 bg-transparent px-3 text-xs outline-none border-none font-mono text-foreground"
                />
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground font-mono text-xs px-2.5 cursor-pointer border-l border-border h-full flex items-center justify-center bg-secondary/20 hover:bg-secondary/50 transition-colors"
                >
                  {"{}"}
                </button>
                <datalist id={fromSuggestionsId}>
                  {fromSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>
        )}

        {/* Template string */}
        {needsTemplate && (
          <div className="flex gap-2 items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-10 shrink-0">tmpl</span>
            <div className="flex-1 flex items-center border border-border/80 bg-card rounded-xl overflow-hidden h-9 px-0 shadow-xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <input
                value={rule.template}
                onChange={(e) => onChange(index, { template: e.target.value })}
                placeholder='e.g. "Classify: {{previous.text}}"'
                className="flex-1 bg-transparent px-3 text-xs outline-none border-none font-mono text-foreground"
              />
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground font-mono text-xs px-2.5 cursor-pointer border-l border-border h-full flex items-center justify-center bg-secondary/20 hover:bg-secondary/50 transition-colors"
              >
                {"{}"}
              </button>
            </div>
          </div>
        )}

        {/* Default literal value */}
        {needsValue && (
          <div className="flex gap-2 items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-10 shrink-0">val</span>
            <div className="flex-1 flex items-center border border-border/80 bg-card rounded-xl overflow-hidden h-9 px-0 shadow-xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <input
                value={rule.value}
                onChange={(e) => onChange(index, { value: e.target.value })}
                placeholder="literal value — string, number, or valid JSON"
                className="flex-1 bg-transparent px-3 text-xs outline-none border-none font-mono text-foreground"
              />
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground font-mono text-xs px-2.5 cursor-pointer border-l border-border h-full flex items-center justify-center bg-secondary/20 hover:bg-secondary/50 transition-colors"
              >
                {"{}"}
              </button>
            </div>
          </div>
        )}

        {/* Target field + optional cast type */}
        <div className="flex gap-2 items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-10 shrink-0">to</span>
          <div className="flex-1 flex gap-2">
            <div className="flex-1 flex items-center border border-border/80 bg-card rounded-xl overflow-hidden h-9 px-0 shadow-xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <input
                list={toSuggestionsId}
                value={rule.to}
                onChange={(e) => onChange(index, { to: e.target.value })}
                placeholder="output field name"
                className="flex-1 bg-transparent px-3 text-xs outline-none border-none font-mono text-foreground"
              />
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground font-mono text-xs px-2.5 cursor-pointer border-l border-border h-full flex items-center justify-center bg-secondary/20 hover:bg-secondary/50 transition-colors"
              >
                {"{}"}
              </button>
              <datalist id={toSuggestionsId}>
                {toSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            {rule.op === "cast" && (
              <Select
                value={rule.as}
                onValueChange={(val) => onChange(index, { as: val as MapperRuleRow["as"] })}
              >
                <SelectTrigger className="w-28 h-9 text-xs bg-card border-border/80 rounded-xl font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAST_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      as {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
