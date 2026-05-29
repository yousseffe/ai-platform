import React from "react";
import { Server, MoreVertical } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
 * Renders a listing table showing recently registered models using Shadcn UI components.
 * Consists of status indicators, creation dates, and administrative links.
 *
 * @param props - Component properties containing the models array.
 * @returns The React component rendering the model preview table card.
 */
export function RecentModelsTable({ recentModels }: RecentModelsTableProps) {
  return (
    <Card className="lg:col-span-2 overflow-hidden flex flex-col border border-slate-200 shadow-sm p-0">
      <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-bold text-slate-800 text-base">Recent Models</CardTitle>
        <Link href="/models" className="text-sm text-primary-600 font-medium hover:underline">
          View all &gt;
        </Link>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {recentModels.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No models registered yet. Click Upload Model to get started.
          </div>
        ) : (
          <Table className="w-full text-left border-collapse">
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-100 hover:bg-slate-50">
                <TableHead className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-slate-500 h-auto">Name</TableHead>
                <TableHead className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-slate-500 h-auto">Type</TableHead>
                <TableHead className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-slate-500 h-auto">Status</TableHead>
                <TableHead className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-slate-500 h-auto">Last Trained</TableHead>
                <TableHead className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-slate-500 text-right h-auto">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 text-sm">
              {recentModels.map((m, i) => {
                const badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
                let badgeClass = "bg-slate-100 text-slate-600 border-slate-200";

                if (m.status === "LIVE") {
                  badgeClass = "bg-emerald-50 text-emerald-700 border-none";
                } else if (m.status === "READY") {
                  badgeClass = "bg-blue-50 text-blue-700 border-none";
                } else if (m.status === "BUILDING") {
                  badgeClass = "bg-amber-50 text-amber-700 border-none";
                }

                return (
                  <TableRow key={i} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                    <TableCell className="px-6 py-4 font-medium text-slate-900">
                      <Link href={`/models/${m.id}`} className="flex items-center gap-3 hover:text-primary-600">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <Server className="w-4 h-4" />
                        </div>
                        {m.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-slate-500 truncate max-w-[150px]">{m.type}</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant={badgeVariant} className={`text-[10px] font-bold tracking-wider py-0.5 px-2 uppercase rounded-full border-0 ${badgeClass}`}>
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-slate-500">{m.time}</TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Link href={`/models/${m.id}`} className="text-slate-400 hover:text-slate-600 inline-block p-1">
                        <MoreVertical className="w-4 h-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
