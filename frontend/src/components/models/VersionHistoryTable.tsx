import React from "react";
import type { ModelVersion, Deployment } from "@/types";

interface VersionHistoryTableProps {
  versions: ModelVersion[];
  onDeploy: (versionId: string) => void;
  onStop: (deploymentId: string) => void;
  onNavigateToTest: () => void;
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
}: VersionHistoryTableProps) {
  return (
    <div className="overflow-x-auto">
      {versions.length === 0 ? (
        <div className="p-8 text-center text-slate-500">No versions uploaded yet.</div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <th className="px-6 py-4 font-semibold">Version Number</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Created</th>
              <th className="px-6 py-4 font-semibold">Accuracy</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
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
                  displayStatus = latestDeployment.status === "running" ? "deployed" : latestDeployment.status;
                }

                const hasError = v.status === "failed" || (latestDeployment && latestDeployment.status === "failed");
                const errorMessage = v.errorMessage || (latestDeployment && latestDeployment.errorMessage);

                return (
                  <React.Fragment key={i}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-primary-600 mr-2">v{v.versionNumber}</span>
                        <span className="text-slate-400 text-xs">{v.id.substring(0, 8)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              displayStatus === "ready" || displayStatus === "deployed"
                                ? "bg-emerald-500"
                                : displayStatus === "building" || displayStatus === "starting"
                                ? "bg-blue-500"
                                : hasError
                                ? "bg-red-500"
                                : "bg-slate-400"
                            }`}
                          ></div>
                          <span className="font-medium text-slate-700 capitalize">{displayStatus}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{new Date(v.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">--</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {v.status === "ready" && (!latestDeployment || latestDeployment.status !== "running") && (
                            <button
                              onClick={() => onDeploy(v.id)}
                              className="px-4 py-1.5 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700 transition-colors cursor-pointer"
                            >
                              Deploy
                            </button>
                          )}
                          {latestDeployment && latestDeployment.status === "running" && (
                            <button
                              onClick={() => onStop(latestDeployment.id)}
                              className="px-4 py-1.5 border border-red-200 text-red-600 rounded text-xs font-medium hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              Stop
                            </button>
                          )}
                          <button
                            onClick={onNavigateToTest}
                            disabled={displayStatus !== "deployed"}
                            className={`px-4 py-1.5 border rounded text-xs font-medium transition-colors cursor-pointer ${
                              displayStatus === "deployed"
                                ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                                : "border-slate-100 text-slate-300 cursor-not-allowed"
                            }`}
                          >
                            Test
                          </button>
                        </div>
                      </td>
                    </tr>
                    {hasError && errorMessage && (
                      <tr className="bg-red-50 border-b border-red-100">
                        <td colSpan={5} className="px-6 py-3 text-xs text-red-600 font-mono break-words">
                          <span className="font-bold mr-2">Error:</span>
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
