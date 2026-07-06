"use client";

import React from "react";
import Link from "next/link";
import { Workflow } from "lucide-react";
import { Pipeline, PipelineStatus } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";
import { CreatePipelineDialog } from "./CreatePipelineDialog";

interface PipelinesTableProps {
  pipelines: Pipeline[];
}

/**
 * Maps a pipeline's lifecycle status to a status-dot color, mirroring the
 * Models Registry table's status indicator convention.
 *
 * @param status - The pipeline's current status.
 * @returns A Tailwind background-color class for the status dot.
 */
function getStatusDotClass(status: PipelineStatus): string {
  if (status === PipelineStatus.VALIDATED) return "bg-emerald-500 animate-pulse";
  if (status === PipelineStatus.ARCHIVED) return "bg-muted-foreground";
  return "bg-blue-500";
}

/**
 * Renders the tabular list of pipelines registered by the user, complete
 * with step counts, status indicators, and a link into the builder/run view.
 *
 * @param props - PipelinesTable component properties.
 * @returns The React component rendering the pipelines table interface.
 */
export function PipelinesTable({ pipelines }: PipelinesTableProps) {
  return (
    <div className="border border-border bg-card rounded-xl p-0 overflow-hidden mb-8 shadow-sm">
      <div className="overflow-x-auto">
        {pipelines.length === 0 ? (
          <EmptyState
            icon={<Workflow />}
            title="No pipelines yet"
            description="Chain your deployed models together — the output of one step feeds into the next."
            action={<CreatePipelineDialog />}
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs text-foreground">
            <thead>
              <tr className="bg-background text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border select-none">
                <th className="px-6 py-4">Pipeline</th>
                <th className="px-6 py-4">Steps</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Version</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pipelines.map((p) => (
                <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/pipelines/${p.id}`} className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded border border-border bg-background flex items-center justify-center font-bold text-muted-foreground group-hover:border-primary/50 group-hover:text-primary transition-colors">
                        <Workflow className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground group-hover:text-primary transition-colors text-sm">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Created: {new Date(p.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-muted-foreground">{p.steps?.length ?? 0} step{p.steps?.length === 1 ? "" : "s"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 select-none font-sans">
                      {p.status === PipelineStatus.VALIDATED ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Validated
                        </span>
                      ) : p.status === PipelineStatus.ARCHIVED ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border bg-secondary/50 text-muted-foreground text-[9px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/45"></span> Archived
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Draft
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-bold text-[10px]">
                      v{p.version}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/pipelines/${p.id}`} className="text-xs font-bold text-primary hover:underline">
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
