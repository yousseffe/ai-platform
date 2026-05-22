import React from "react";
import { Server, MoreVertical } from "lucide-react";
import Link from "next/link";

export interface RecentModelItem {
  id: string;
  name: string;
  type: string;
  status: string;
  time: string;
}

interface RecentModelsTableProps {
  recentModels: RecentModelItem[];
}

/**
 * Renders a clean listing table showing recently registered models,
 * with status indicators, creation dates, and administrative links.
 *
 * @param props - Component properties for RecentModelsTable.
 * @returns The React component rendering the model preview table.
 */
export function RecentModelsTable({ recentModels }: RecentModelsTableProps) {
  return (
    <div className="lg:col-span-2 card p-0 overflow-hidden flex flex-col">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-800">Recent Models</h3>
        <Link href="/models" className="text-sm text-primary-600 font-medium hover:underline">
          View all &gt;
        </Link>
      </div>
      <div className="overflow-x-auto">
        {recentModels.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No models registered yet. Click Upload Model to get started.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Last Trained</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {recentModels.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <Link href={`/models/${m.id}`} className="flex items-center gap-3 hover:text-primary-600">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <Server className="w-4 h-4" />
                      </div>
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-500 truncate max-w-[150px]">{m.type}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`badge ${
                        m.status === "LIVE"
                          ? "badge-success"
                          : m.status === "READY"
                          ? "badge-info"
                          : m.status === "BUILDING"
                          ? "badge-warning"
                          : "badge-neutral"
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{m.time}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/models/${m.id}`} className="text-slate-400 hover:text-slate-600 inline-block p-1">
                      <MoreVertical className="w-4 h-4" />
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
