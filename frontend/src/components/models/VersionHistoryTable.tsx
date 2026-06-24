import React from "react";
import type { ModelVersion, Deployment } from "@/types";
import { DeploymentStatus, VersionStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

interface VersionHistoryTableProps {
  versions: ModelVersion[];
  onDeploy: (versionId: string) => void;
  onStop: (deploymentId: string) => void;
  onNavigateToTest: (v: ModelVersion) => void;
  onRebuild?: (versionId: string) => void;
  onDeprecate?: (versionId: string) => void;
  onUndeprecate?: (versionId: string) => void;
  isOwner?: boolean;
  modelId: string;
}

/**
 * Renders the table layout containing the upload version history, statuses,
 * deployment indicators, and control buttons (Deploy/Stop/Test).
 *
 * @param props - VersionHistoryTableProps component properties.
 * @returns The React component table for version control management.
 */
export function VersionHistoryTable({
  versions,
  onDeploy,
  onStop,
  onNavigateToTest,
  onRebuild,
  onDeprecate,
  onUndeprecate,
  isOwner = true,
  modelId,
}: VersionHistoryTableProps) {
  return (
    <div className="overflow-x-auto">
      {versions.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground font-mono text-xs select-none">
          No versions uploaded yet. Click Upload New Version above.
        </div>
      ) : (
        <table className="w-full text-left border-collapse font-mono text-xs text-foreground">
          <thead>
            <tr className="bg-background text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border select-none">
              <th className="px-6 py-4">Version Number</th>
              <th className="px-6 py-4">Status checks</th>
              <th className="px-6 py-4">Pushed</th>
              <th className="px-6 py-4">Endpoint URL</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...versions]
              .sort((a, b) => b.versionNumber - a.versionNumber)
              .map((v: ModelVersion, i: number) => {
                const latestDeployment =
                  v.deployments && v.deployments.length > 0
                    ? [...v.deployments].sort(
                        (a: Deployment, b: Deployment) =>
                          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )[0]
                    : null;

                let displayStatus = v.status as string;
                if (latestDeployment) {
                  displayStatus = latestDeployment.status === DeploymentStatus.RUNNING ? "deployed" : latestDeployment.status;
                }

                // If the version is deprecated, force displayStatus to deprecated (since active deployments should have been stopped)
                if (v.status === VersionStatus.DEPRECATED) {
                  displayStatus = VersionStatus.DEPRECATED;
                }

                const hasError = v.status === VersionStatus.FAILED || (latestDeployment && latestDeployment.status === DeploymentStatus.FAILED);
                const errorMessage = v.errorMessage || (latestDeployment && latestDeployment.errorMessage);

                let badgeClass = "bg-muted text-muted-foreground border-border";
                if (displayStatus === "deployed" || displayStatus === VersionStatus.READY) {
                   badgeClass = "bg-emerald-950/40 text-emerald-400 border-emerald-500/20";
                } else if (displayStatus === VersionStatus.BUILDING || displayStatus === DeploymentStatus.STARTING) {
                  badgeClass = "bg-blue-950/40 text-blue-400 border-blue-500/20";
                } else if (displayStatus === VersionStatus.DEPRECATED) {
                  badgeClass = "bg-amber-950/40 text-amber-450 border-amber-500/20";
                } else if (hasError) {
                  badgeClass = "bg-red-950/40 text-red-400 border-red-500/20";
                }

                const endpointUrl = `http://localhost:5000/api/v1/models/${modelId}/v${v.versionNumber}/predict`;

                return (
                  <React.Fragment key={i}>
                    <tr className="hover:bg-accent/40 transition-colors">
                      <td className="px-6 py-4 font-bold">
                        <span className="text-primary mr-2 font-bold">v{v.versionNumber}</span>
                        <span className="text-muted-foreground text-[10px]">({v.id.substring(0, 8)})</span>
                      </td>
                      <td className="px-6 py-4 select-none">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              displayStatus === VersionStatus.READY || displayStatus === "deployed"
                                ? "bg-emerald-500 animate-pulse"
                                : displayStatus === VersionStatus.BUILDING || displayStatus === DeploymentStatus.STARTING
                                ? "bg-blue-500 animate-spin"
                                : displayStatus === VersionStatus.DEPRECATED
                                ? "bg-amber-500"
                                : hasError
                                ? "bg-red-50"
                                : "bg-muted-foreground"
                            }`}
                          ></div>
                          <Badge className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${badgeClass}`}>
                            {displayStatus}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(v.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {displayStatus === "deployed" ? (
                          <div className="flex items-center gap-2 bg-slate-105 dark:bg-slate-900/60 border border-border px-2.5 py-1 rounded-lg w-fit max-w-[200px] select-none">
                            <span className="truncate text-[10px] text-muted-foreground select-all font-mono">
                              /v{v.versionNumber}/predict
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(endpointUrl);
                                alert("Copied full endpoint URL to clipboard!");
                              }}
                              className="text-[9px] text-primary hover:text-primary/80 cursor-pointer font-bold shrink-0 font-sans"
                              title={endpointUrl}
                            >
                              Copy
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 font-sans font-medium">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {isOwner && v.status === VersionStatus.FAILED && onRebuild && (
                            <button
                              onClick={() => onRebuild(v.id)}
                              className="btn-outline px-3 py-1 text-[11px] border-blue-900/50 bg-blue-950/20 text-blue-400 hover:bg-blue-950/40 hover:text-blue-300"
                            >
                              Rebuild
                            </button>
                          )}
                          {isOwner && v.status === VersionStatus.READY && (!latestDeployment || latestDeployment.status !== DeploymentStatus.RUNNING) && (
                            <button
                              onClick={() => onDeploy(v.id)}
                              className="btn-primary px-3 py-1 text-[11px]"
                            >
                              Deploy
                            </button>
                          )}
                          {isOwner && latestDeployment && latestDeployment.status === DeploymentStatus.RUNNING && (
                            <button
                              onClick={() => onStop(latestDeployment.id)}
                              className="btn-outline px-3 py-1 text-[11px] border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-950/40 hover:text-red-300"
                            >
                              Stop Container
                            </button>
                          )}
                          {isOwner && v.status === VersionStatus.DEPRECATED && onUndeprecate && (
                            <button
                              onClick={() => onUndeprecate(v.id)}
                              className="btn-outline px-3 py-1 text-[11px] border-emerald-900/50 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300"
                            >
                              Activate
                            </button>
                          )}
                          {isOwner && (v.status === VersionStatus.READY || displayStatus === "deployed" || displayStatus === DeploymentStatus.STARTING) && onDeprecate && (
                            <button
                              onClick={() => onDeprecate(v.id)}
                              className="btn-outline px-3 py-1 text-[11px] border-amber-900/50 bg-amber-950/20 text-amber-400 hover:bg-amber-950/40 hover:text-amber-300"
                            >
                              Deprecate
                            </button>
                          )}
                          <button
                            onClick={() => onNavigateToTest(v)}
                            disabled={displayStatus !== "deployed"}
                            className={`btn-outline px-3 py-1 text-[11px] ${
                              displayStatus !== "deployed" ? "opacity-30 cursor-not-allowed border-border text-muted-foreground/50 bg-background" : ""
                            }`}
                          >
                            Playground
                          </button>
                        </div>
                      </td>
                    </tr>
                    {hasError && errorMessage && (
                      <tr className="bg-red-950/25 border-b border-red-900/35">
                        <td colSpan={5} className="px-6 py-3 text-xs text-red-400 font-mono break-words leading-relaxed">
                          <span className="font-bold mr-2 text-[10px] uppercase tracking-wider text-red-300">Run Failure:</span>
                          {errorMessage}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
          </tbody>
        </table>
      )}
    </div>
  );
}
