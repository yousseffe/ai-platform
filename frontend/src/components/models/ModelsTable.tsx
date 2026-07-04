"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Server, Plus, Filter } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface RegistryModelItem {
  id: string;
  initials: string;
  name: string;
  time: string;
  type: string;
  version: string;
  prevVersion: string;
  status: string;
}

interface ModelsTableProps {
  models: RegistryModelItem[];
}

const PAGE_SIZE = 8;
const STATUS_FILTER_OPTIONS = ["All statuses", "Deployed", "Ready", "Building", "Uploaded", "Draft", "Deprecated", "Failed"];

/**
 * Renders the tabular list of models registered in the system,
 * complete with type badges, version numbers, a status filter, an empty
 * state with a publish CTA, and functional client-side pagination.
 *
 * @param props - ModelsTable component properties.
 * @returns The React component rendering the models table interface.
 */
export function ModelsTable({ models }: ModelsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All statuses");

  // Simple helper to get framework color dot
  const getFrameworkDot = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes("torch") || desc.includes("pytorch")) return "bg-orange-500";
    if (desc.includes("tensor") || desc.includes("tensorflow")) return "bg-yellow-500";
    if (desc.includes("onnx")) return "bg-blue-500";
    if (desc.includes("scikit") || desc.includes("sklearn")) return "bg-cyan-500";
    return "bg-purple-500";
  };

  const filteredModels = useMemo(() => {
    if (statusFilter === "All statuses") {
      return models;
    }
    return models.filter((m) => m.status.toLowerCase() === statusFilter.toLowerCase());
  }, [models, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredModels.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const visibleModels = filteredModels.slice(startIndex, startIndex + PAGE_SIZE);

  const handleStatusFilterChange = (value: string | null) => {
    setStatusFilter(value ?? "All statuses");
    setCurrentPage(1);
  };

  return (
    <div className="border border-border bg-card rounded-xl p-0 overflow-hidden mb-8 shadow-sm">
      {models.length > 0 && (
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-background/40">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="overflow-x-auto">
        {filteredModels.length === 0 ? (
          models.length === 0 ? (
            <EmptyState
              icon={<Server />}
              title="No models registered yet"
              description="Upload a model artifact to publish your first ML endpoint to the registry."
              action={
                <Link href="/models/upload" className="btn-primary">
                  <Plus className="w-4 h-4" /> New Model
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<Filter />}
              title="No models match this filter"
              description={`No models are currently in "${statusFilter}" status.`}
            />
          )
        ) : (
          <table className="w-full text-left border-collapse font-mono text-xs text-foreground">
            <thead>
              <tr className="bg-background text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border select-none">
                <th className="px-6 py-4">Repository Name</th>
                <th className="px-6 py-4">Architecture</th>
                <th className="px-6 py-4">Version Tags</th>
                <th className="px-6 py-4">Checks</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleModels.map((m) => (
                <tr key={m.id} className="hover:bg-accent/40 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/models/${m.id}`} className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded border border-border bg-background flex items-center justify-center font-bold text-muted-foreground group-hover:border-primary/50 group-hover:text-primary transition-colors">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground group-hover:text-primary transition-colors text-sm">
                          {m.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Created: {m.time}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 select-none">
                      <span className={`w-2.5 h-2.5 rounded-full ${getFrameworkDot(m.type)}`} />
                      <span className="capitalize text-muted-foreground">{m.type.split(" ")[0]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-mono select-none">
                      <span className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-bold text-[10px]">
                        {m.version}
                      </span>
                      {m.prevVersion && (
                        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border font-bold text-[10px]">
                          {m.prevVersion}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 select-none">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          m.status.toLowerCase() === "deployed" || m.status.toLowerCase() === "ready"
                            ? "bg-emerald-500 animate-pulse"
                            : m.status.toLowerCase() === "building" || m.status.toLowerCase() === "uploaded"
                            ? "bg-blue-500 animate-pulse"
                            : m.status.toLowerCase() === "draft"
                            ? "bg-muted-foreground"
                            : m.status.toLowerCase() === "deprecated"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                      ></div>
                      <span className="font-semibold text-foreground capitalize">{m.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/models/${m.id}`}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {filteredModels.length > 0 && (
        <div className="px-6 py-4 border-t border-border bg-background/50 flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>
            Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredModels.length)} of {filteredModels.length} assets
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              disabled={safePage === 1}
              className="p-1.5 border border-border bg-card text-foreground rounded hover:bg-accent cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              disabled={safePage === totalPages}
              className="p-1.5 border border-border bg-card text-foreground rounded hover:bg-accent cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
