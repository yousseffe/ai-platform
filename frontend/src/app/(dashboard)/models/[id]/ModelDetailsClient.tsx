"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  GitBranch,
  Settings,
  Layers,
  Code,
  PlayCircle,
  Plus,
  AlertTriangle,
  Trash2,
  Cpu,
  Coins,
  Server,
  Users,
  Activity,
  Shield,
  BookOpen,
} from "lucide-react";
import { useModelDetails } from "@/hooks/use-model-details";
import type { Model, ModelIntegrationSpec, ModelVersion } from "@/types";
import { DeploymentStatus, VersionStatus } from "@/types";
import { VersionHistoryTable } from "@/components/models/VersionHistoryTable";
import ModelOverview from "@/components/models/ModelOverview";
import ModelPlayground from "@/components/models/ModelPlayground";
import ActionsTerminal from "@/components/models/ActionsTerminal";
import { ModelAnalytics } from "@/components/models/ModelAnalytics";
import { ModelRequestHistoryTable } from "@/components/models/ModelRequestHistoryTable";
import { ModelLogsConsole } from "@/components/models/ModelLogsConsole";
import { CacheSettingsCard } from "@/components/models/CacheSettingsCard";
import { NetworkSecurityCard } from "@/components/models/NetworkSecurityCard";
import { VisibilityToggleCard } from "@/components/models/VisibilityToggleCard";
import { FirewallPolicyCard } from "@/components/models/FirewallPolicyCard";
import { CanaryTrafficPanel } from "@/components/models/CanaryTrafficPanel";
import ModelApiDocs from "@/components/models/ModelApiDocs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deprecateModelVersion,
  undeprecateModelVersion,
} from "@/lib/actions/models.actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ModelDetailsClientProps {
  initialModel: Model;
  modelId: string;
  isOwner?: boolean;
  integrationSpec?: ModelIntegrationSpec | null;
}

/**
 * Client-side layout view for Model Details page in the console.
 * Orchestrates modal controls, deployment actions, version history logs,
 * and prediction playgrounds using a unified tab system.
 */
export default function ModelDetailsClient({
  initialModel,
  modelId,
  isOwner = true,
  integrationSpec = null,
}: ModelDetailsClientProps) {
  const router = useRouter();
  const {
    model,
    versions,
    handleDeploy,
    handleStop,
    handleRebuild,
    handleDeleteModel,
  } = useModelDetails(modelId, initialModel);

  const handleDeprecate = async (versionId: string) => {
    try {
      const res = await deprecateModelVersion(modelId, versionId);
      if (res.success) {
        toast.success("Version deprecated successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to deprecate version");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to deprecate version");
    }
  };

  const handleUndeprecate = async (versionId: string) => {
    try {
      const res = await undeprecateModelVersion(modelId, versionId);
      if (res.success) {
        toast.success("Version activated successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to activate version");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to activate version");
    }
  };

  // Confirmation gate for the Danger Zone's model deletion — replaces window.confirm().
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [settingsSection, setSettingsSection] = useState<
    "general" | "security" | "danger"
  >("general");

  // Track active version in terminal build log viewer
  const [activeVersion, setActiveVersion] = useState<ModelVersion | null>(
    () => {
      const list = initialModel.versions || [];
      if (list.length > 0) {
        return [...list].sort((a, b) => b.versionNumber - a.versionNumber)[0];
      }
      return null;
    },
  );

  const [activeTab, setActiveTab] = useState("overview");
  const totalReleases = versions.length;
  const readyVersionsCount = versions.filter(
    (v) => v.status === VersionStatus.READY,
  ).length;

  const activeDeploymentsCount = versions.reduce((acc, v) => {
    const running =
      v.deployments?.filter((d) => d.status === DeploymentStatus.RUNNING)
        .length || 0;
    return acc + running;
  }, 0);

  const formattedDate = new Date(model.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="w-full space-y-6 animate-fade-in text-foreground font-sans">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden border border-border bg-card rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/2.5 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            {/* Tag Badges */}
            <div className="flex items-center gap-2 select-none text-[10px] font-bold tracking-wider uppercase font-mono">
              <span
                className={`px-2.5 py-0.5 rounded-md border ${
                  model.isPublic
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                }`}
              >
                {model.isPublic ? "public marketplace" : "private registry"}
              </span>
              <span className="px-2.5 py-0.5 rounded-md border border-border bg-secondary text-muted-foreground">
                stable
              </span>
            </div>

            {/* Model Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {model.name}
                </h1>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  ID: {model.id}
                </p>
              </div>
            </div>
          </div>

          {/* Action triggers */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs select-none">
            <DropdownMenu>
              <DropdownMenuTrigger className="h-9 group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-border/80 hover:border-primary/40 bg-secondary/30 hover:bg-secondary/60 text-foreground cursor-pointer transition-all outline-none select-none px-4 font-bold font-mono text-[11px] gap-2 shadow-sm font-sans">
                <GitBranch className="w-3.5 h-3.5 text-primary" />
                <span>
                  Tag: v{activeVersion ? activeVersion.versionNumber : "latest"}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border border-border shadow-xl rounded-lg p-1.5 w-44 text-foreground">
                {versions.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground p-2 block">
                    No version tags
                  </span>
                ) : (
                  [...versions]
                    .sort((a, b) => b.versionNumber - a.versionNumber)
                    .map((v) => (
                      <DropdownMenuItem
                        key={v.id}
                        onClick={() => {
                          setActiveVersion(v);
                        }}
                        className={`text-xs hover:bg-accent p-2 rounded cursor-pointer ${
                          activeVersion?.id === v.id
                            ? "bg-primary/10 font-bold text-primary"
                            : ""
                        }`}
                      >
                        v{v.versionNumber} ({v.id.substring(0, 8)})
                      </DropdownMenuItem>
                    ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {isOwner && (
              <Button
                onClick={() => router.push(`/models/${modelId}/upload`)}
                className="h-9 px-4 font-bold gap-1.5 shadow-md bg-primary hover:bg-primary/95 text-white rounded-lg transition-all active:scale-95 animate-fade-in text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Push Version
              </Button>
            )}
          </div>
        </div>

        {/* Quick-Stats Grid */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 ${isOwner ? "lg:grid-cols-6" : "lg:grid-cols-5"} gap-4 mt-8 pt-6 border-t border-border/50`}
        >
          <div className="p-4 rounded-xl border border-border/60 bg-secondary/20 border-l-4 border-l-blue-500 shadow-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider font-mono">
              <Cpu className="w-3.5 h-3.5 text-blue-500" /> Engine Spec
            </div>
            <span className="block text-foreground font-bold mt-1.5 text-sm">
              {model.framework || "Custom"}
            </span>
            <span className="block text-muted-foreground text-[10px] mt-0.5 capitalize">
              {model.tier?.toLowerCase() || "Standard"} Serving
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-secondary/20 border-l-4 border-l-violet-500 shadow-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider font-mono">
              <GitBranch className="w-3.5 h-3.5 text-violet-500" /> Release
              Count
            </div>
            <span className="block text-foreground font-bold mt-1.5 text-sm">
              {totalReleases} {totalReleases === 1 ? "Version" : "Versions"}
            </span>
            <span className="block text-muted-foreground text-[10px] mt-0.5">
              {readyVersionsCount} Active / Build Ready
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-secondary/20 border-l-4 border-l-amber-500 shadow-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider font-mono">
              <Coins className="w-3.5 h-3.5 text-amber-500" /> Prediction cost
            </div>
            <span className="block text-foreground font-bold mt-1.5 text-sm">
              ${Number(model.costPerRequest || 0).toFixed(4)}
            </span>
            <span className="block text-muted-foreground text-[10px] mt-0.5">
              per single REST request
            </span>
          </div>

          {isOwner && (
            <div className="p-4 rounded-xl border border-border/60 bg-secondary/20 border-l-4 border-l-emerald-600 shadow-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider font-mono">
                <Coins className="w-3.5 h-3.5 text-emerald-600" /> Total
                Earnings
              </div>
              <span className="block text-foreground font-bold mt-1.5 text-sm">
                {Number(model.totalEarnings || 0).toFixed(4)} EGP
              </span>
              <span className="block text-muted-foreground text-[10px] mt-0.5">
                provider EGP revenue share
              </span>
            </div>
          )}

          <div className="p-4 rounded-xl border border-border/60 bg-secondary/20 border-l-4 border-l-rose-500 shadow-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider font-mono">
              <Users className="w-3.5 h-3.5 text-rose-500" /> Active Consumers
            </div>
            <span className="block text-foreground font-bold mt-1.5 text-sm">
              {model.uniqueUsersCount !== undefined
                ? model.uniqueUsersCount
                : 0}
            </span>
            <span className="block text-muted-foreground text-[10px] mt-0.5 font-sans">
              unique users invoking model
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-secondary/20 border-l-4 border-l-emerald-500 shadow-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider font-mono">
              <Server className="w-3.5 h-3.5 text-emerald-500" /> Deployments
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  activeDeploymentsCount > 0
                    ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : "bg-muted"
                }`}
              ></span>
              <span className="text-foreground font-bold text-sm">
                {activeDeploymentsCount} Running
              </span>
            </div>
            <span className="block text-muted-foreground text-[10px] mt-0.5">
              Created: {formattedDate}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-10! bg-secondary/60 border border-border p-1 rounded-xl mb-6 gap-1.5 select-none flex flex-row w-fit shadow-sm items-center">
          <TabsTrigger
            value="overview"
            className="h-full cursor-pointer font-bold px-4 text-xs transition-all rounded-lg text-muted-foreground hover:text-foreground data-active:bg-primary data-active:text-primary-foreground dark:data-active:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground data-active:hover:text-primary-foreground data-[state=active]:hover:text-primary-foreground data-active:shadow-md data-[state=active]:shadow-md"
          >
            <Code className="w-3.5 h-3.5 mr-1.5" /> Overview
          </TabsTrigger>
          <TabsTrigger
            value="versions"
            className="h-full cursor-pointer font-bold px-4 text-xs transition-all rounded-lg text-muted-foreground hover:text-foreground data-active:bg-primary data-active:text-primary-foreground dark:data-active:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground data-active:hover:text-primary-foreground data-[state=active]:hover:text-primary-foreground data-active:shadow-md data-[state=active]:shadow-md"
          >
            <GitBranch className="w-3.5 h-3.5 mr-1.5" /> Version Registry
          </TabsTrigger>
          <TabsTrigger
            value="sandbox"
            className="h-full cursor-pointer font-bold px-4 text-xs transition-all rounded-lg text-muted-foreground hover:text-foreground data-active:bg-primary data-active:text-primary-foreground dark:data-active:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground data-active:hover:text-primary-foreground data-[state=active]:hover:text-primary-foreground data-active:shadow-md data-[state=active]:shadow-md"
          >
            <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Playground
          </TabsTrigger>
          <TabsTrigger
            value="docs"
            className="h-full cursor-pointer font-bold px-4 text-xs transition-all rounded-lg text-muted-foreground hover:text-foreground data-active:bg-primary data-active:text-primary-foreground dark:data-active:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground data-active:hover:text-primary-foreground data-[state=active]:hover:text-primary-foreground data-active:shadow-md data-[state=active]:shadow-md"
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Docs
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger
              value="monitoring"
              className="h-full cursor-pointer font-bold px-4 text-xs transition-all rounded-lg text-muted-foreground hover:text-foreground data-active:bg-primary data-active:text-primary-foreground dark:data-active:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground data-active:hover:text-primary-foreground data-[state=active]:hover:text-primary-foreground data-active:shadow-md data-[state=active]:shadow-md"
            >
              <Activity className="w-3.5 h-3.5 mr-1.5" /> Monitoring & Logs
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger
              value="settings"
              className="h-full cursor-pointer font-bold px-4 text-xs transition-all rounded-lg text-muted-foreground hover:text-foreground data-active:bg-primary data-active:text-primary-foreground dark:data-active:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground data-active:hover:text-primary-foreground data-[state=active]:hover:text-primary-foreground data-active:shadow-md data-[state=active]:shadow-md"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Settings
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Overview README & Code Snippets */}
        <TabsContent value="overview">
          <ModelOverview
            model={model}
            selectedVersionNumber={activeVersion?.versionNumber}
          />
        </TabsContent>

        {/* Tab 2: Version History & Actions Log Terminal */}
        <TabsContent value="versions" className="space-y-6">
          {isOwner && (
            <CanaryTrafficPanel versions={versions} modelId={modelId} />
          )}

          <div className="border border-border bg-card rounded-xl p-0 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-background flex items-center justify-between select-none">
              <h3 className="font-bold text-foreground text-xs font-mono">
                Deployment Checkpoint Runs
              </h3>
            </div>
            <VersionHistoryTable
              versions={versions}
              onDeploy={handleDeploy}
              onStop={handleStop}
              onNavigateToTest={(v) => {
                setActiveVersion(v);
                setActiveTab("sandbox");
              }}
              onRebuild={handleRebuild}
              onDeprecate={handleDeprecate}
              onUndeprecate={handleUndeprecate}
              isOwner={isOwner}
              modelId={modelId}
            />
          </div>

          {/* GitHub Actions build logs console */}
          {activeVersion && (
            <ActionsTerminal
              modelId={modelId}
              versionId={activeVersion.id}
              versionNumber={activeVersion.versionNumber}
              status={activeVersion.status}
              buildLogs={activeVersion.buildLogs}
            />
          )}
        </TabsContent>

        {/* Tab 3: Sandbox Playground */}
        <TabsContent value="sandbox">
          <ModelPlayground
            model={model}
            selectedVersionNumber={activeVersion?.versionNumber}
          />
        </TabsContent>

        <TabsContent value="docs">
          <ModelApiDocs model={model} integrationSpec={integrationSpec} />
        </TabsContent>

        {/* Tab 4: Monitoring & Logs */}
        {isOwner && (
          <TabsContent value="monitoring" className="space-y-6">
            <ModelAnalytics modelId={modelId} />
            <ModelRequestHistoryTable modelId={modelId} />
            {activeVersion?.deployments?.find(
              (d) => d.status === DeploymentStatus.RUNNING,
            ) ? (
              <ModelLogsConsole
                deploymentId={
                  activeVersion.deployments.find(
                    (d) => d.status === DeploymentStatus.RUNNING,
                  )!.id
                }
              />
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                <p className="font-semibold text-slate-850 dark:text-slate-200">
                  No Running Deployment
                </p>
                <p className="text-xs max-w-md text-center mt-1 text-slate-550 dark:text-slate-400">
                  Logs are only available for running deployments. Please deploy
                  version v{activeVersion?.versionNumber} to stream container
                  logs.
                </p>
              </div>
            )}
          </TabsContent>
        )}

        {/* Tab 5: Settings (Danger Zone Card) */}
        {isOwner && (
          <TabsContent value="settings" className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
              {/* Sidebar Menu */}
              <div className="flex flex-row md:flex-col gap-1 p-1 bg-secondary/35 border border-border/80 rounded-xl md:p-1.5 md:w-full overflow-x-auto select-none shrink-0 md:overflow-x-visible">
                <button
                  onClick={() => setSettingsSection("general")}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold font-sans transition-all w-full text-left whitespace-nowrap cursor-pointer ${
                    settingsSection === "general"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>General & Cache</span>
                </button>
                <button
                  onClick={() => setSettingsSection("security")}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold font-sans transition-all w-full text-left whitespace-nowrap cursor-pointer ${
                    settingsSection === "security"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Security & Firewall</span>
                </button>
                <button
                  onClick={() => setSettingsSection("danger")}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold font-sans transition-all w-full text-left whitespace-nowrap cursor-pointer ${
                    settingsSection === "danger"
                      ? "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold"
                      : "text-muted-foreground hover:text-red-500 hover:bg-red-500/5"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Danger Zone</span>
                </button>
              </div>

              {/* Settings Content Area */}
              <div className="md:col-span-3 space-y-6">
                {settingsSection === "general" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <VisibilityToggleCard model={model} modelId={modelId} />
                    <CacheSettingsCard model={model} modelId={modelId} />
                  </div>
                )}

                {settingsSection === "security" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <NetworkSecurityCard model={model} modelId={modelId} />
                    <FirewallPolicyCard modelId={modelId} />
                  </div>
                )}

                {settingsSection === "danger" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-6 space-y-6 shadow-sm">
                      <div className="flex items-center gap-3 text-red-500 font-bold text-sm select-none">
                        <AlertTriangle className="w-5 h-5" />
                        <div>
                          <h3 className="font-sans font-bold text-sm text-foreground">
                            Danger Zone
                          </h3>
                          <p className="text-muted-foreground text-[11px] font-sans font-normal mt-0.5">
                            Critical operations that can cause permanent data
                            loss.
                          </p>
                        </div>
                      </div>
                      <div className="w-full h-px bg-red-500/10" />

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 leading-relaxed font-sans">
                        <div className="space-y-1">
                          <h4 className="font-bold text-foreground text-xs">
                            Delete this Model Repository
                          </h4>
                          <p className="text-muted-foreground text-[11px] max-w-xl font-normal leading-relaxed">
                            This action will permanently delete the model
                            repository, all version histories, weight
                            checkpoints stored in MinIO, and terminate any
                            active serverless deployments.
                          </p>
                        </div>
                        <Button
                          onClick={() => setShowDeleteConfirm(true)}
                          variant="outline"
                          className="border-red-500/30 hover:border-red-500 text-red-500 hover:bg-red-500/10 flex items-center gap-1.5 shrink-0 font-bold text-xs cursor-pointer shadow-sm rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Repository
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete this model repository"
        description={`Permanently delete "${model.name}", all version histories, and weight checkpoints, and terminate any active deployments. This can't be undone.`}
        confirmLabel="Delete repository"
        onConfirm={handleDeleteModel}
      />
    </div>
  );
}
