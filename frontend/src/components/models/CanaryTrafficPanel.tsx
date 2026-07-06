"use client";

import React, { useState } from "react";
import { Split, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ModelVersion } from "@/types";
import { VersionStatus, DeploymentStatus } from "@/types";
import {
  deployCanaryVersion,
  updateTrafficWeight,
  promoteDeployment,
} from "@/lib/actions/deployments.actions";

interface CanaryTrafficPanelProps {
  versions: ModelVersion[];
  modelId: string;
}

interface RunningRow {
  deploymentId: string;
  versionId: string;
  versionNumber: number;
  trafficWeight: number;
}

/**
 * Traffic-split panel for a model's concurrently RUNNING deployments. Lets
 * the owner start a new version as a low-weight canary alongside an
 * already-serving version, adjust each deployment's traffic weight, and
 * promote one to 100% (stopping the rest) — either to complete a rollout or
 * to roll back to a previous version.
 */
export function CanaryTrafficPanel({ versions, modelId }: CanaryTrafficPanelProps) {
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [canaryVersionId, setCanaryVersionId] = useState("");
  const [canaryWeight, setCanaryWeight] = useState("10");
  const [busy, setBusy] = useState(false);

  const running: RunningRow[] = versions.flatMap((v) =>
    (v.deployments || [])
      .filter((d) => d.status === DeploymentStatus.RUNNING)
      .map((d) => ({
        deploymentId: d.id,
        versionId: v.id,
        versionNumber: v.versionNumber,
        trafficWeight: d.trafficWeight ?? 100,
      }))
  );

  const deployableVersions = versions.filter(
    (v) =>
      v.status === VersionStatus.READY &&
      !running.some((r) => r.versionId === v.id)
  );

  if (running.length === 0) return null;

  const handleUpdateWeight = async (deploymentId: string) => {
    const raw = weights[deploymentId];
    const value = raw !== undefined ? Number(raw) : undefined;
    if (value === undefined || Number.isNaN(value)) return;
    setBusy(true);
    try {
      await updateTrafficWeight(deploymentId, value, modelId);
    } finally {
      setBusy(false);
    }
  };

  const handlePromote = async (deploymentId: string) => {
    setBusy(true);
    try {
      await promoteDeployment(deploymentId, modelId);
    } finally {
      setBusy(false);
    }
  };

  const handleDeployCanary = async () => {
    if (!canaryVersionId) return;
    setBusy(true);
    try {
      await deployCanaryVersion(canaryVersionId, Number(canaryWeight) || 0, modelId);
      setCanaryVersionId("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-border bg-card rounded-xl p-0 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border bg-background flex items-center gap-2 select-none">
        <Split className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-foreground text-xs font-mono">
          Traffic Split (Canary Deployments)
        </h3>
      </div>

      <div className="divide-y divide-border">
        {running.map((row) => (
          <div
            key={row.deploymentId}
            className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
          >
            <span className="font-bold text-primary">v{row.versionNumber}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                className="w-20"
                defaultValue={row.trafficWeight}
                onChange={(e) =>
                  setWeights((prev) => ({ ...prev, [row.deploymentId]: e.target.value }))
                }
              />
              <span className="text-muted-foreground">% weight</span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => handleUpdateWeight(row.deploymentId)}
                className="text-[11px] cursor-pointer"
              >
                Update
              </Button>
              {running.length > 1 && (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => handlePromote(row.deploymentId)}
                  className="text-[11px] font-bold cursor-pointer"
                >
                  Promote to 100%
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {deployableVersions.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-secondary/10 flex flex-wrap items-center gap-2 text-xs font-mono">
          <Rocket className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Select
            value={canaryVersionId || "SELECT_VERSION"}
            onValueChange={(val) => setCanaryVersionId(val === "SELECT_VERSION" || !val ? "" : val)}
          >
            <SelectTrigger className="h-8 w-60 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 text-xs">
              <SelectValue placeholder="Select a version to canary..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SELECT_VERSION">Select a version to canary...</SelectItem>
              {deployableVersions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  v{v.versionNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            max={100}
            className="w-20"
            value={canaryWeight}
            onChange={(e) => setCanaryWeight(e.target.value)}
          />
          <span className="text-muted-foreground">% weight</span>
          <Button
            size="sm"
            disabled={busy || !canaryVersionId}
            onClick={handleDeployCanary}
            className="text-[11px] font-bold cursor-pointer"
          >
            Deploy as Canary
          </Button>
        </div>
      )}
    </div>
  );
}
