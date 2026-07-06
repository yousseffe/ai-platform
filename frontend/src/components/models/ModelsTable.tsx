"use client";

import React, { useMemo, useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Server, 
  Plus, 
  Filter, 
  Star, 
  Check, 
  Loader2, 
  X, 
  Search, 
  MoreVertical, 
  Grid, 
  List,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Layers,
  ChevronDown,
  Eye,
  Terminal,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { deleteModel } from "@/lib/actions/models.actions";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Model, ModelVersion, DeploymentStatus, VersionStatus } from "@/types";

interface ModelsTableProps {
  models: Model[];
}

export function ModelsTable({ models }: ModelsTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [archFilter, setArchFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  
  // Interactive client-side star styling state
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete the model "${name}"?`)) {
      try {
        await deleteModel(id);
        toast.success(`Model "${name}" deleted successfully.`);
        router.refresh();
      } catch (error) {
        toast.error("Failed to delete the model. Please try again.");
      }
    }
  };

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Helper to extract latest version status
  const getLatestStatus = (m: Model): string => {
    const versions = m.versions || [];
    if (!versions.length) return "Draft";
    const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
    const latest = sorted[0];
    if (latest.status === VersionStatus.READY) {
      const activeDeployment = latest.deployments?.find(
        (d) => d.status === DeploymentStatus.RUNNING
      );
      if (activeDeployment) return "Deployed";
      return "Ready";
    }
    return String(latest.status);
  };

  // Helper to extract details of the model framework/architecture
  const getFrameworkDetails = (framework?: string) => {
    const f = (framework || "custom").toLowerCase();
    if (f.includes("pytorch") || f.includes("torch")) {
      return { dot: "bg-orange-500", label: "PyTorch", type: "Neural Network" };
    }
    if (f.includes("tensorflow") || f.includes("keras")) {
      return { dot: "bg-yellow-500", label: "TensorFlow", type: "Deep Learning" };
    }
    if (f.includes("sklearn") || f.includes("scikit")) {
      return { dot: "bg-cyan-500", label: "Scikit-Learn", type: "Classical ML" };
    }
    if (f.includes("onnx")) {
      return { dot: "bg-blue-500", label: "ONNX Runtime", type: "Inference Engine" };
    }
    if (f.includes("xgboost") || f.includes("lightgbm")) {
      return { dot: "bg-teal-500", label: "XGBoost", type: "Gradient Boosting" };
    }
    return { dot: "bg-purple-500", label: "Custom/Python", type: "Custom Script" };
  };

  // Get dynamic mock file size based on type / framework
  const getModelSize = (m: Model) => {
    const f = (m.framework || "").toLowerCase();
    const t = (m.type || "").toLowerCase();
    if (f.includes("pytorch") || t.includes("vision") || t.includes("diffusion")) {
      return "452.8 MB";
    }
    if (f.includes("tensorflow") || t.includes("nlp")) {
      return "184.2 MB";
    }
    if (t.includes("tabular") || f.includes("sklearn")) {
      return "12.4 MB";
    }
    return "2.3 GB"; // default standard model size
  };

  // Get verification checks state
  const getChecksDetails = (status: string) => {
    const s = status.toLowerCase();
    if (s === "ready" || s === "deployed") {
      return { label: "All checks passed", fraction: "3 / 3", icon: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
    }
    if (s === "building" || s === "uploaded") {
      return { label: "Checks running...", fraction: "1 / 3", icon: "text-blue-500 animate-pulse bg-blue-500/10 border-blue-500/20" };
    }
    if (s === "failed") {
      return { label: "Checks failed", fraction: "0 / 3", icon: "text-red-500 bg-red-500/10 border-red-500/20" };
    }
    return { label: "Checks pending", fraction: "0 / 3", icon: "text-muted-foreground bg-secondary border-border" };
  };

  // Format creation or update date
  const formatUpdatedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }) + " " + d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return "Jul 5, 2026 10:45 AM";
    }
  };

  // Filter model list reactively
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      // 1. Text Search matching name, description, tags, or architecture details
      const matchesSearch =
        !searchText ||
        m.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (m.description || "").toLowerCase().includes(searchText.toLowerCase()) ||
        (m.framework || "").toLowerCase().includes(searchText.toLowerCase());

      // 2. Status dropdown filtering
      const s = getLatestStatus(m).toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        s === statusFilter.toLowerCase();

      // 3. Architecture dropdown filtering
      const f = (m.framework || "custom").toLowerCase();
      const matchesArch =
        archFilter === "all" ||
        f.includes(archFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesArch;
    });
  }, [models, searchText, statusFilter, archFilter]);

  // Compute pagination bounds
  const totalPages = Math.max(1, Math.ceil(filteredModels.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleModels = filteredModels.slice(startIndex, startIndex + pageSize);

  const resetFilters = () => {
    setSearchText("");
    setStatusFilter("all");
    setArchFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5 font-sans">
      
      {/* Search and Filters Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 select-none">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 max-w-4xl">
          
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, tags, or architecture..."
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-card/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground transition-all font-medium text-foreground"
            />
            {searchText && (
              <button 
                type="button" 
                onClick={() => setSearchText("")} 
                className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Architecture Selector */}
          <Select 
            value={archFilter} 
            onValueChange={(val) => {
              setArchFilter(val || "all");
              setCurrentPage(1);
            }}
            items={[
              { value: "all", label: "All Architectures" },
              { value: "pytorch", label: "PyTorch" },
              { value: "sklearn", label: "Scikit-Learn" },
              { value: "tensorflow", label: "TensorFlow" },
              { value: "onnx", label: "ONNX Runtime" },
              { value: "custom", label: "Custom/Python" }
            ]}
          >
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs font-semibold border-border bg-card/60">
              <SelectValue placeholder="All Architectures" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Architectures</SelectItem>
              <SelectItem value="pytorch">PyTorch</SelectItem>
              <SelectItem value="sklearn">Scikit-Learn</SelectItem>
              <SelectItem value="tensorflow">TensorFlow</SelectItem>
              <SelectItem value="onnx">ONNX Runtime</SelectItem>
              <SelectItem value="custom">Custom/Python</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Selector */}
          <Select 
            value={statusFilter} 
            onValueChange={(val) => {
              setStatusFilter(val || "all");
              setCurrentPage(1);
            }}
            items={[
              { value: "all", label: "All Statuses" },
              { value: "deployed", label: "Deployed" },
              { value: "ready", label: "Ready" },
              { value: "building", label: "Building" },
              { value: "uploaded", label: "Uploaded" },
              { value: "draft", label: "Draft" },
              { value: "failed", label: "Failed" }
            ]}
          >
            <SelectTrigger className="w-full sm:w-40 h-9 text-xs font-semibold border-border bg-card/60">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="deployed">Deployed</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="building">Building</SelectItem>
              <SelectItem value="uploaded">Uploaded</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters Trigger */}
          {(searchText || statusFilter !== "all" || archFilter !== "all") && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-9 px-3 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Filter className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}

        </div>

        {/* View Layout Toggle button group */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-secondary/35 border border-border p-0.5 rounded-lg select-none">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md cursor-pointer transition-all ${
                viewMode === "list"
                  ? "bg-card text-foreground shadow-3xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md cursor-pointer transition-all ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-3xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table or Grid View Container */}
      {visibleModels.length === 0 ? (
        models.length === 0 ? (
          <div className="border border-border/80 bg-card/45 backdrop-blur-xs rounded-2xl overflow-hidden shadow-2xs">
            <EmptyState
              icon={<Server />}
              title="No models registered yet"
              description="Upload a model weights artifact and pre-processing script to build your first live endpoint."
              action={
                <Link href="/models/upload" className="h-9 px-4 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center rounded-xl shadow-md shadow-primary/10">
                  <Plus className="w-4 h-4" /> New Model
                </Link>
              }
            />
          </div>
        ) : (
          <div className="border border-border/80 bg-card/45 backdrop-blur-xs rounded-2xl overflow-hidden shadow-2xs">
            <EmptyState
              icon={<Filter />}
              title="No matching models"
              description="Try adjusting your keywords, architecture or deployment status filters."
              action={
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-9 px-4 text-xs font-bold border border-border bg-background hover:bg-secondary rounded-xl cursor-pointer"
                >
                  Clear all filters
                </button>
              }
            />
          </div>
        )
      ) : viewMode === "list" ? (
        /* List View */
        <div className="border border-border/80 bg-card/45 backdrop-blur-xs rounded-2xl overflow-hidden shadow-2xs animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-foreground font-sans">
              <thead>
                <tr className="bg-secondary/15 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 border-b border-border/70 select-none font-mono">
                  <th className="px-5 py-3.5">Model</th>
                  <th className="px-5 py-3.5">Architecture</th>
                  <th className="px-5 py-3.5">Version & Tags</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Checks</th>
                  <th className="px-5 py-3.5">Updated</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {visibleModels.map((m) => {
                  const latestStatus = getLatestStatus(m);
                  const isStarred = starredIds.has(m.id);
                  const arch = getFrameworkDetails(m.framework);
                  const size = getModelSize(m);
                  const checks = getChecksDetails(latestStatus);
                  const initials = m.name.substring(0, 2).toUpperCase();
                  
                  const versions = m.versions || [];
                  const latestVersionNumber = versions.length
                    ? Math.max(...versions.map((v) => v.versionNumber))
                    : 1;

                  return (
                    <tr key={m.id} className="hover:bg-secondary/10 transition-colors group">
                      
                      {/* 1. Model Identity Column */}
                      <td className="px-5 py-4.5">
                        <Link href={`/models/${m.id}`} className="flex items-center gap-3.5 group/link min-w-0">
                          
                          {/* Star Toggle icon */}
                          <button
                            type="button"
                            onClick={(e) => toggleStar(m.id, e)}
                            className="text-muted-foreground/45 hover:text-amber-500 cursor-pointer shrink-0 transition-colors"
                          >
                            <Star 
                              className={`w-4 h-4 ${isStarred ? "text-amber-500 fill-amber-500" : ""}`} 
                            />
                          </button>

                          {/* Avatar Initials Bubble */}
                          <div className="w-8.5 h-8.5 rounded-lg border border-border bg-background/50 flex items-center justify-center font-bold text-[11px] text-muted-foreground shrink-0 group-hover/link:border-primary/50 group-hover/link:text-primary transition-colors font-mono select-none shadow-3xs">
                            {initials}
                          </div>

                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-foreground group-hover/link:text-primary transition-colors text-sm truncate">
                                {m.name}
                              </span>
                              <span className="text-[9.5px] font-bold text-muted-foreground/60 font-mono">v{latestVersionNumber}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground/80 mt-0.5 leading-none flex items-center gap-1.5 flex-wrap">
                              <span>Created by you</span>
                              <span className="text-muted-foreground/30">•</span>
                              <span className="font-mono text-[9px]">{size}</span>
                            </div>
                          </div>

                        </Link>
                      </td>

                      {/* 2. Architecture / Framework Column */}
                      <td className="px-5 py-4.5">
                        <div className="text-left">
                          <div className="flex items-center gap-1.5 select-none font-semibold text-foreground">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${arch.dot}`} />
                            <span className="capitalize">{arch.label}</span>
                          </div>
                          <span className="text-[9.5px] text-muted-foreground mt-0.5 block font-mono leading-none">{arch.type}</span>
                        </div>
                      </td>

                      {/* 3. Version & Tags Column */}
                      <td className="px-5 py-4.5">
                        <div className="flex items-center gap-1.5 select-none font-mono">
                          <span className="px-1.5 py-0.5 rounded border border-primary/25 bg-primary/10 text-primary font-bold text-[9.5px]">
                            v{latestVersionNumber}
                          </span>
                          {(latestStatus === "Ready" || latestStatus === "Deployed") && (
                            <span className="px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[9.5px]">
                              production
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Live Running Status Column */}
                      <td className="px-5 py-4.5">
                        <div className="text-left select-none">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                latestStatus === "Deployed" || latestStatus === "Ready"
                                  ? "bg-emerald-500 animate-pulse"
                                  : latestStatus === "BUILDING"
                                  ? "bg-blue-500 animate-pulse"
                                  : latestStatus === "FAILED"
                                  ? "bg-red-500"
                                  : "bg-muted-foreground/60"
                              }`} 
                            />
                            <span className="font-bold text-foreground capitalize">
                              {latestStatus === "READY" ? "Ready" : latestStatus}
                            </span>
                          </div>
                          <span className="text-[9.5px] text-muted-foreground mt-0.5 block leading-none font-medium">
                            {latestStatus === "Deployed" 
                              ? "Production live" 
                              : latestStatus === "Ready" 
                              ? "Ready to serve"
                              : latestStatus === "BUILDING"
                              ? "Building container..."
                              : latestStatus === "FAILED"
                              ? "Compilation error"
                              : "Draft state"}
                          </span>
                        </div>
                      </td>

                      {/* 5. Verification Checks Column */}
                      <td className="px-5 py-4.5">
                        <div className="flex items-center gap-2 select-none">
                          <div className={`px-2 py-0.5 rounded-full border text-[9.5px] font-bold font-mono ${checks.icon}`}>
                            {checks.fraction}
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[110px]">
                            {checks.label}
                          </span>
                        </div>
                      </td>

                      {/* 6. Updated Timestamp Column */}
                      <td className="px-5 py-4.5">
                        <span className="text-muted-foreground/90 font-medium font-mono">
                          {formatUpdatedDate(m.updatedAt)}
                        </span>
                      </td>

                      {/* 7. Dropdown / Inline Actions Column */}
                      <td className="px-5 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-1 select-none">
                          <Link
                            href={`/models/${m.id}`}
                            className="h-7 px-3 text-[10px] font-extrabold border border-border hover:bg-secondary/80 hover:border-border text-foreground flex items-center justify-center rounded-lg transition-colors cursor-pointer"
                          >
                            Manage <ChevronDown className="w-3 h-3 text-muted-foreground ml-1.5" />
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none focus:outline-none flex items-center justify-center"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 font-sans">
                              <div className="px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono select-none">
                                Quick Actions
                              </div>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => router.push(`/models/${m.id}`)}
                                className="cursor-pointer text-xs flex items-center gap-2"
                              >
                                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>View Dashboard</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => router.push(`/models/${m.id}/test`)}
                                className="cursor-pointer text-xs flex items-center gap-2"
                              >
                                <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Model Playground</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => router.push(`/models/${m.id}/upload`)}
                                className="cursor-pointer text-xs flex items-center gap-2"
                              >
                                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Deploy New Version</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(m.id, m.name)}
                                className="cursor-pointer text-xs text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-500/10 dark:focus:text-red-400 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Model</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 animate-in fade-in duration-300">
          {visibleModels.map((m) => {
            const latestStatus = getLatestStatus(m);
            const isStarred = starredIds.has(m.id);
            const arch = getFrameworkDetails(m.framework);
            const size = getModelSize(m);
            const checks = getChecksDetails(latestStatus);
            const initials = m.name.substring(0, 2).toUpperCase();
            
            const versions = m.versions || [];
            const latestVersionNumber = versions.length
              ? Math.max(...versions.map((v) => v.versionNumber))
              : 1;

            return (
              <div 
                key={m.id} 
                className="bg-card/45 border border-border/80 p-5 rounded-2xl flex flex-col justify-between shadow-2xs hover:border-primary/50 hover:shadow-xs hover:translate-y-[-2px] transition-all duration-300 text-left relative group/card"
              >
                
                {/* Header: Name, Avatar, Star, Menu */}
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/models/${m.id}`} className="flex items-center gap-3 group/link min-w-0 flex-1">
                    <div className="w-8.5 h-8.5 rounded-lg border border-border bg-background/50 flex items-center justify-center font-bold text-[11px] text-muted-foreground shrink-0 group-hover/link:border-primary/50 group-hover/link:text-primary transition-colors font-mono shadow-3xs select-none">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-foreground group-hover/link:text-primary transition-colors text-sm truncate">
                          {m.name}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground/60 font-mono">v{latestVersionNumber}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/80 mt-0.5 leading-none">Created by you</p>
                    </div>
                  </Link>

                  {/* Star & Actions Menu */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => toggleStar(m.id, e)}
                      className="text-muted-foreground/45 hover:text-amber-500 cursor-pointer p-1 rounded-md hover:bg-secondary transition-colors"
                    >
                      <Star 
                        className={`w-3.5 h-3.5 ${isStarred ? "text-amber-500 fill-amber-500" : ""}`} 
                      />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none focus:outline-none flex items-center justify-center"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 font-sans">
                        <div className="px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono select-none">
                          Quick Actions
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => router.push(`/models/${m.id}`)}
                          className="cursor-pointer text-xs flex items-center gap-2"
                        >
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>View Dashboard</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => router.push(`/models/${m.id}/test`)}
                          className="cursor-pointer text-xs flex items-center gap-2"
                        >
                          <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Model Playground</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => router.push(`/models/${m.id}/upload`)}
                          className="cursor-pointer text-xs flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Deploy New Version</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(m.id, m.name)}
                          className="cursor-pointer text-xs text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-500/10 dark:focus:text-red-400 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Model</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Tags & Framework Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3 select-none">
                  <span className="px-1.5 py-0.5 rounded border border-primary/20 bg-primary/10 text-primary font-bold text-[9px] font-mono">
                    v{latestVersionNumber}
                  </span>
                  {(latestStatus === "Ready" || latestStatus === "Deployed") && (
                    <span className="px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] font-mono">
                      production
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded border border-border bg-secondary/40 text-muted-foreground font-semibold text-[9px] font-mono">
                    {size}
                  </span>
                </div>

                {/* Card Divider Line */}
                <div className="h-px bg-border/60 my-4" />

                {/* Specs / Architecture */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Architecture</span>
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <span className={`w-2 h-2 rounded-full ${arch.dot}`} />
                      <span>{arch.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Type</span>
                    <span className="font-mono text-[9.5px] text-foreground font-semibold">{arch.type}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Checks</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.25 rounded-full border text-[9px] font-bold font-mono ${checks.icon}`}>
                        {checks.fraction}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[120px]">{checks.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Status</span>
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <span 
                        className={`w-1.5 h-1.5 rounded-full ${
                          latestStatus === "Deployed" || latestStatus === "Ready"
                            ? "bg-emerald-500 animate-pulse"
                            : latestStatus === "BUILDING"
                            ? "bg-blue-500 animate-pulse"
                            : latestStatus === "FAILED"
                            ? "bg-red-500"
                            : "bg-muted-foreground/60"
                        }`}
                      />
                      <span>{latestStatus === "READY" ? "Ready" : latestStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Card Divider Line */}
                <div className="h-px bg-border/60 my-4" />

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[9.5px] text-muted-foreground/80 font-medium font-mono select-none">
                    Updated: {new Date(m.updatedAt).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/models/${m.id}`}
                    className="h-7 px-3.5 text-[10px] font-extrabold bg-primary hover:bg-primary/95 text-primary-foreground flex items-center justify-center gap-1 rounded-lg transition-all active:scale-[0.98]"
                  >
                    Manage Model <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {filteredModels.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground select-none font-mono">
          <span>
            Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filteredModels.length)} of {filteredModels.length} models
          </span>
          <div className="flex items-center gap-3">
            
            {/* Page Count selection */}
            <div className="flex items-center gap-2">
              <Select 
                value={String(pageSize)} 
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
                items={[
                  { value: "5", label: "5 per page" },
                  { value: "10", label: "10 per page" },
                  { value: "25", label: "25 per page" },
                  { value: "50", label: "50 per page" }
                ]}
              >
                <SelectTrigger size="sm" className="w-32 font-bold font-sans bg-card/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-sans">
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5 font-sans">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={safePage === 1}
                className="h-8 w-8 p-0 rounded-lg border-border hover:bg-secondary cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="h-8 min-w-8 px-2 rounded-lg border border-primary/35 bg-primary/10 text-primary font-extrabold flex items-center justify-center select-none text-xs font-mono">
                {safePage}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                disabled={safePage === totalPages}
                className="h-8 w-8 p-0 rounded-lg border-border hover:bg-secondary cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Platform Marketing Info Banner */}
      <div className="p-4 bg-secondary/15 border border-border/80 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Layers className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Build. Deploy. Scale.</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal font-medium">
              Deploy your models to production and start serving predictions via our secure, scalable infrastructure.
            </p>
          </div>
        </div>
        
        <Link
          href="/docs"
          target="_blank"
          className="h-8.5 px-3.5 text-xs font-bold border border-border hover:bg-secondary/80 bg-background text-foreground flex items-center justify-center gap-1.5 rounded-xl shrink-0 w-fit active:scale-[0.98] transition-transform"
        >
          <BookOpen className="w-3.5 h-3.5 text-primary" /> View Documentation
        </Link>
      </div>

    </div>
  );
}
