import React from "react";
import { ChevronLeft, ChevronRight, Server } from "lucide-react";
import Link from "next/link";

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

/**
 * Renders the tabular list of models registered in the system,
 * complete with type badges, versions numbers, and pagination triggers.
 *
 * @param props - ModelsTable component properties.
 * @returns The React component rendering the models table interface.
 */
export function ModelsTable({ models }: ModelsTableProps) {
  // Simple helper to get framework color dot
  const getFrameworkDot = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes("torch") || desc.includes("pytorch")) return "bg-orange-500";
    if (desc.includes("tensor") || desc.includes("tensorflow")) return "bg-yellow-500";
    if (desc.includes("onnx")) return "bg-blue-500";
    if (desc.includes("scikit") || desc.includes("sklearn")) return "bg-cyan-500";
    return "bg-purple-500";
  };

  return (
    <div className="border border-border bg-card rounded-xl p-0 overflow-hidden mb-8 shadow-sm">
      <div className="overflow-x-auto">
        {models.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground font-mono text-xs">
            No models registered yet. Click &quot;New Model&quot; to deploy your first ML model.
          </div>
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
              {models.map((m, i) => (
                <tr key={i} className="hover:bg-accent/40 transition-colors">
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
                            : m.status.toLowerCase() === "building"
                            ? "bg-blue-500 animate-spin"
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
      <div className="px-6 py-4 border-t border-border bg-background/50 flex items-center justify-between text-xs text-muted-foreground font-mono">
        <span>Showing {models.length} active assets</span>
        <div className="flex gap-2">
          <button type="button" className="p-1.5 border border-border bg-card text-foreground rounded hover:bg-accent cursor-pointer transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button type="button" className="p-1.5 border border-border bg-card text-foreground rounded hover:bg-accent cursor-pointer transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
