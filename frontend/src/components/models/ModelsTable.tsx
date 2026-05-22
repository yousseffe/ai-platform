import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  return (
    <div className="card p-0 overflow-hidden mb-8">
      <div className="overflow-x-auto">
        {models.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No models registered yet. Click &quot;New Model&quot; to deploy your first ML model.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="px-6 py-4 font-semibold">Model Name</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Versions</th>
                <th className="px-6 py-4 font-semibold">Latest Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {models.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/models/${m.id}`} className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs tracking-wider group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                        {m.initials}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                          {m.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{m.time}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`badge ${
                        m.type.toLowerCase().includes("class")
                          ? "badge-info bg-indigo-50 text-indigo-700"
                          : m.type.toLowerCase().includes("regress")
                          ? "badge-warning bg-amber-50 text-amber-700"
                          : "badge-neutral bg-slate-100 text-slate-600"
                      }`}
                    >
                      {m.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-medium">
                        {m.version}
                      </span>
                      {m.prevVersion && (
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-xs flex items-center justify-center font-medium">
                          {m.prevVersion}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          m.status === "Deployed" || m.status.toLowerCase() === "ready"
                            ? "bg-emerald-500"
                            : m.status.toLowerCase() === "building"
                            ? "bg-blue-500"
                            : "bg-red-500"
                        }`}
                      ></div>
                      <span className="font-medium text-slate-700 capitalize">{m.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/models/${m.id}`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
        <span>Showing {models.length} models</span>
        <div className="flex gap-2">
          <button type="button" className="p-1 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" className="p-1 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
