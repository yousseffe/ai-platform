"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Settings, Layers, Code, PlayCircle, Plus, AlertTriangle, Trash2 } from "lucide-react";
import { useModelDetails } from "@/hooks/use-model-details";
import type { Model, ModelVersion } from "@/types";
import { VersionHistoryTable } from "@/components/models/VersionHistoryTable";
import ModelOverview from "@/components/models/ModelOverview";
import ModelPlayground from "@/components/models/ModelPlayground";
import ActionsTerminal from "@/components/models/ActionsTerminal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deprecateModelVersion, undeprecateModelVersion } from "@/lib/actions/models.actions";

interface ModelDetailsClientProps {
  initialModel: Model;
  modelId: string;
  isOwner?: boolean;
}

/**
 * Client-side layout view for Model Details page.
 * Orchestrates modal controls, deployment actions, version history logs,
 * and prediction playgrounds using a unified tab system.
 */
export default function ModelDetailsClient({ initialModel, modelId, isOwner = true }: ModelDetailsClientProps) {
  const router = useRouter();
  const {
    model,
    versions,
    handleDeploy,
    handleStop,
    handleRebuild,
  } = useModelDetails(modelId, initialModel);

  const handleDeprecate = async (versionId: string) => {
    try {
      const res = await deprecateModelVersion(modelId, versionId);
      if (res.success) {
        alert("Version deprecated successfully!");
        router.refresh();
      } else {
        alert(res.error || "Failed to deprecate version");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to deprecate version");
    }
  };

  const handleUndeprecate = async (versionId: string) => {
    try {
      const res = await undeprecateModelVersion(modelId, versionId);
      if (res.success) {
        alert("Version activated successfully!");
        router.refresh();
      } else {
        alert(res.error || "Failed to activate version");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to activate version");
    }
  };

  // Track active version in terminal build log viewer
  const [activeVersion, setActiveVersion] = useState<ModelVersion | null>(() => {
    const list = initialModel.versions || [];
    if (list.length > 0) {
      return [...list].sort((a, b) => b.versionNumber - a.versionNumber)[0];
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in text-foreground">
      {/* Repository Style Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-border gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-muted-foreground" />
            <span className="text-primary font-mono text-sm hover:underline cursor-pointer">
              {model.name.toLowerCase().replace(/\s+/g, "-")}
            </span>
          </div>
          <div className="flex items-center gap-2 select-none">
            <span className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 text-[9px] font-bold tracking-wider uppercase font-mono">
              public
            </span>
            <span className="px-2 py-0.5 rounded border border-primary/20 bg-primary/10 text-primary text-[9px] font-bold tracking-wider uppercase font-mono">
              stable
            </span>
          </div>
        </div>

        {/* Branch / Version Swapper select dropdown */}
        <div className="flex items-center gap-3 font-mono text-xs select-none">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-foreground cursor-pointer transition-colors focus:outline-none text-[11px] font-bold">
              <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
              <span>tag: v{activeVersion ? activeVersion.versionNumber : "latest"}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card border border-border shadow-xl rounded-lg p-1.5 w-44 text-foreground">
              {versions.length === 0 ? (
                <span className="text-[10px] text-muted-foreground p-2 block">No version tags</span>
              ) : (
                [...versions]
                  .sort((a, b) => b.versionNumber - a.versionNumber)
                  .map((v) => (
                    <DropdownMenuItem
                      key={v.id}
                      onClick={() => setActiveVersion(v)}
                      className={`text-xs hover:bg-accent p-2 rounded cursor-pointer ${
                        activeVersion?.id === v.id ? "bg-primary/10 font-bold" : ""
                      }`}
                    >
                      v{v.versionNumber} ({v.id.substring(0, 8)})
                    </DropdownMenuItem>
                  ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {isOwner && (
            <button
              onClick={() => router.push(`/models/${model.id}/upload`)}
              className="btn-primary flex items-center gap-1.5 font-bold"
            >
              <Plus className="w-4.5 h-4.5" /> Push Version
            </button>
          )}
        </div>
      </div>

      {/* Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList variant="line" className="border-b border-border w-full justify-start rounded-none px-0 mb-6 gap-6 select-none">
          <TabsTrigger value="overview" className="pb-2 text-xs font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-active:after:hidden">
            <Code className="w-3.5 h-3.5 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="versions" className="pb-2 text-xs font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-active:after:hidden">
            <GitBranch className="w-3.5 h-3.5 mr-1" /> Version Registry
          </TabsTrigger>
          <TabsTrigger value="sandbox" className="pb-2 text-xs font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-active:after:hidden">
            <PlayCircle className="w-3.5 h-3.5 mr-1" /> Playground
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="settings" className="pb-2 text-xs font-bold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-active:after:hidden">
              <Settings className="w-3.5 h-3.5 mr-1" /> Settings
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Overview README & Code Snippets */}
        <TabsContent value="overview">
          <ModelOverview model={model} selectedVersionNumber={activeVersion?.versionNumber} />
        </TabsContent>

        {/* Tab 2: Version History & Actions Log Terminal */}
        <TabsContent value="versions" className="space-y-6">
          <div className="border border-border bg-card rounded-xl p-0 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-background flex items-center justify-between select-none">
              <h3 className="font-bold text-foreground text-xs font-mono">Deployment Checkpoint Runs</h3>
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
              versionId={activeVersion.id}
              versionNumber={activeVersion.versionNumber}
              status={activeVersion.status}
            />
          )}
        </TabsContent>

        {/* Tab 3: Sandbox Playground */}
        <TabsContent value="sandbox">
          <ModelPlayground model={model} selectedVersionNumber={activeVersion?.versionNumber} />
        </TabsContent>

        {/* Tab 4: Settings (GitHub Danger Zone Style) */}
        {isOwner && (
          <TabsContent value="settings" className="font-mono text-xs text-foreground space-y-6">
            <div className="border border-red-500/30 bg-red-950/10 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm select-none">
                <AlertTriangle className="w-4.5 h-4.5 text-red-500" /> Danger Zone
              </div>
              <div className="w-full h-px bg-red-500/20" />
              <div className="flex items-center justify-between gap-6 leading-relaxed">
                <div>
                  <h4 className="font-bold text-foreground text-xs">Delete this Model</h4>
                  <p className="text-muted-foreground text-[11px] mt-1">
                    Once deleted, the weights, version logs, and API execution endpoints cannot be recovered.
                  </p>
                </div>
                <button className="btn-outline border-red-500/30 text-red-400 hover:bg-red-950/30 flex items-center gap-1.5 shrink-0 font-bold select-none cursor-pointer">
                  <Trash2 className="w-4 h-4" /> Delete Repository
                </button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>


    </div>
  );
}
