"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, Globe, EyeOff, Trash2, Eye, Server, RefreshCw, Database, Coins } from "lucide-react";
import { useSession } from "next-auth/react";
import { useWorkspace } from "@/hooks/use-workspace";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { AdminModel } from "@/types";

/**
 * Platform Models Registry Administration page.
 * Restricts access to global admins, listing all models registered in the system.
 * Provides capabilities to toggle public marketplace visibility and force purge model entries.
 *
 * @returns The React component rendering the models management dashboard.
 */
export default function AdminModelsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isAdmin, isLoading: isWorkspaceLoading, fetchWorkspaceDetails } = useWorkspace();

  const [models, setModels] = useState<AdminModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modelPendingDelete, setModelPendingDelete] = useState<AdminModel | null>(null);

  // Load workspace context on mount
  useEffect(() => {
    if (session) {
      fetchWorkspaceDetails(session);
    }
  }, [session, fetchWorkspaceDetails]);

  // Redirect non-admins
  useEffect(() => {
    if (!isWorkspaceLoading && !isAdmin) {
      toast.error("Access denied: Admin permissions required");
      router.push("/dashboard");
    }
  }, [isAdmin, isWorkspaceLoading, router]);

  const loadModels = async (showToast = false) => {
    setLoading(true);
    try {
      const data = await smartFetch<AdminModel[]>("/admin/models");
      setModels(data || []);
      if (showToast) {
        toast.success("Models catalog loaded!");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load platform models");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadModels(false);
    }
  }, [isAdmin]);

  const toggleVisibility = async (modelId: string) => {
    try {
      const res = await smartFetch<{ success: boolean; isPublic: boolean }>(`/admin/models/${modelId}/toggle-visibility`, {
        method: "PATCH",
      });
      if (res.success) {
        toast.success(`Marketplace visibility ${res.isPublic ? "activated (Public)" : "revoked (Private)"}!`);
        setModels((prev) =>
          prev.map((m) => (m.id === modelId ? { ...m, isPublic: res.isPublic } : m))
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle model visibility");
    }
  };

  const deleteModel = async (model: AdminModel) => {
    try {
      const res = await smartFetch<{ success: boolean }>(`/admin/models/${model.id}`, {
        method: "DELETE",
      });
      if (res.success) {
        toast.success("Model registry entry deleted successfully!");
        setModels((prev) => prev.filter((m) => m.id !== model.id));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete model");
    } finally {
      setModelPendingDelete(null);
    }
  };

  if (isWorkspaceLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-foreground font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2.5 text-xs">Authenticating Admin Access...</span>
      </div>
    );
  }

  const filteredModels = models.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute live models stats
  const totalModels = models.length;
  const publicModels = models.filter((m) => m.isPublic).length;
  const activeServers = models.filter((m) => m.status === "ACTIVE").length;
  const avgCost = totalModels > 0
    ? models.reduce((sum, m) => sum + (typeof m.costPerRequest === "string" ? parseFloat(m.costPerRequest) : m.costPerRequest || 0), 0) / totalModels
    : 0;

  return (
    <div className="w-full space-y-6 text-foreground font-mono text-xs animate-fade-in">
      <PageHeader
        title={<><Shield /> Model Registry Console</>}
        description="Overseeing registered Machine Learning model artifacts, editing public marketplace listings, and deleting model entries."
        className="mb-0"
        actions={
          <Button
            variant="outline"
            onClick={() => loadModels(true)}
            disabled={loading}
            className="gap-1.5 cursor-pointer font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Model Catalog Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<Database />} label="Catalog Registrations" value={totalModels} caption="ML Artifacts" />
        <StatCard icon={<Globe />} label="Public Listings" value={publicModels} caption="In Marketplace" />
        <StatCard icon={<Server />} label="Active Telemetry" value={activeServers} caption="Containers live" />
        <StatCard icon={<Coins />} label="Average Pricing Rate" value={`$${avgCost.toFixed(2)}`} caption="Per prediction request" tone="primary" />
      </div>

      {/* Models Directory Card */}
      <Card className="border border-border bg-card shadow-xs p-0 overflow-hidden">
        <CardHeader className="p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">System Models Catalog</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
              Manage developer-registered models, override marketplace visibility listings, and force purge entries.
            </CardDescription>
          </div>
          <div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, description, owner..."
              className="w-64 h-8 px-3 rounded-md border border-border bg-background text-foreground text-xs font-mono placeholder:text-muted-foreground/60 outline-hidden focus:border-primary transition-all"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              <span>Fetching system models directory...</span>
            </div>
          ) : filteredModels.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="w-full text-left border-collapse">
                <TableHeader>
                  <TableRow className="bg-muted/10 border-b border-border">
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Model details</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Tier Level</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Marketplace Visibility</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Price (Credits)</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Payout Splits</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Telemetry State</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border text-xs font-mono">
                  {filteredModels.map((model) => {
                    const isActive = model.status === "ACTIVE";
                    const costVal = typeof model.costPerRequest === "string" ? parseFloat(model.costPerRequest) : model.costPerRequest;
                    return (
                      <TableRow key={model.id} className="hover:bg-muted/30 border-b border-border">
                        <TableCell className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-xs">{model.name}</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 max-w-xs truncate font-sans">{model.description || "No description provided."}</span>
                            <span className="text-[8px] text-muted-foreground/60 select-all mt-0.5">Owner: {model.owner}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary border border-primary/20">
                            {model.tier.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold inline-flex items-center gap-1 font-sans ${
                              model.isPublic
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
                            }`}
                          >
                            {model.isPublic ? (
                              <>
                                <Globe className="w-3 h-3" />
                                Public (Marketplace)
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" />
                                Private (Hidden)
                              </>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-3.5 font-bold text-foreground">
                          ${costVal.toFixed(2)} / req
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-muted-foreground">
                          {model.providerSharePercent}% Provider / {100 - model.providerSharePercent}% Platform
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <span
                            className={`badge ${
                              isActive ? "badge-success" : "badge-neutral"
                            }`}
                          >
                            <span className="badge-dot" />
                            {model.status}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={model.isPublic ? "Hide from Marketplace" : "Publish to Marketplace"}
                              onClick={() => toggleVisibility(model.id)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {model.isPublic ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Inspect Active Container"
                              onClick={() => router.push("/admin/deployments")}
                              className="h-7 w-7 text-primary hover:text-primary-foreground hover:bg-primary cursor-pointer"
                            >
                              <Server className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Model Registry"
                              onClick={() => setModelPendingDelete(model)}
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={<Database />}
              title="No matching models"
              description="No registered model registries found matching your search query."
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!modelPendingDelete}
        onOpenChange={(open) => !open && setModelPendingDelete(null)}
        title="Delete model registry entry"
        description={`Permanently delete "${modelPendingDelete?.name}" and its full version history? This can't be undone.`}
        confirmLabel="Delete model"
        onConfirm={async () => {
          if (modelPendingDelete) {
            await deleteModel(modelPendingDelete);
          }
        }}
      />
    </div>
  );
}
