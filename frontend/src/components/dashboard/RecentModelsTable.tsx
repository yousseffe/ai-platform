import React from "react";
import { Server, RefreshCw, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
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
  // Simple helper to get framework color dot
  const getFrameworkDot = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes("torch") || desc.includes("pytorch")) return "bg-orange-500";
    if (desc.includes("tensor") || desc.includes("tensorflow")) return "bg-yellow-500";
    if (desc.includes("onnx")) return "bg-blue-500";
    if (desc.includes("scikit") || desc.includes("sklearn")) return "bg-cyan-500";
    return "bg-purple-500";
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "LIVE":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "READY":
        return <CheckCircle2 className="w-4 h-4 text-blue-400" />;
      case "BUILDING":
        return <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />;
      case "FAILED":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <HelpCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="lg:col-span-2 overflow-hidden flex flex-col border border-border bg-card p-0">
      <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-bold text-foreground text-sm font-mono">Recent Repositories</CardTitle>
        <Link href="/models" className="text-xs text-primary font-semibold hover:underline font-mono">
          View all repositories &gt;
        </Link>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {recentModels.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs font-mono">
            No active repositories. Upload a model weight artifact to begin.
          </div>
        ) : (
          <Table className="w-full text-left border-collapse font-mono">
            <TableHeader>
              <TableRow className="bg-background border-b border-border hover:bg-background">
                <TableHead className="px-5 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-auto">Repository</TableHead>
                <TableHead className="px-5 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-auto">Engine</TableHead>
                <TableHead className="px-5 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-auto">Checks</TableHead>
                <TableHead className="px-5 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-auto">Pushed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border text-xs text-foreground">
              {recentModels.map((m, i) => {
                const badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
                let badgeClass = "bg-muted text-muted-foreground border-border";

                if (m.status === "LIVE") {
                  badgeClass = "bg-emerald-950/40 text-emerald-400 border-emerald-500/20";
                } else if (m.status === "READY") {
                  badgeClass = "bg-blue-950/40 text-blue-400 border-blue-500/20";
                } else if (m.status === "BUILDING") {
                  badgeClass = "bg-amber-950/40 text-amber-400 border-amber-500/20";
                }

                return (
                  <TableRow key={i} className="hover:bg-accent/40 transition-colors border-b border-border">
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded border border-border bg-background flex items-center justify-center text-muted-foreground">
                          <Server className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <Link href={`/models/${m.id}`} className="font-bold text-foreground hover:text-primary transition-colors">
                            {m.name}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${getFrameworkDot(m.type)}`} />
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {m.type.split(" ")[0]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-muted-foreground select-none max-w-[150px] truncate">
                      {m.type.toLowerCase().includes("class") ? "Classification" : "Regression"}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-2 select-none">
                        {getStatusIcon(m.status)}
                        <Badge variant={badgeVariant} className={`text-[9px] font-bold tracking-wider py-0.5 px-2 uppercase rounded border ${badgeClass}`}>
                          {m.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-muted-foreground font-mono">{m.time}</TableCell>
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
