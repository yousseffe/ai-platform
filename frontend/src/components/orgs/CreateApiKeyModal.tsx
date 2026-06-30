"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle, AlertTriangle, KeyRound, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { createApiKey, CreatedApiKey } from "@/lib/services/projects.service";
import { getPublicModels } from "@/lib/services/models.service";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { Model } from "@/types";

interface CreateApiKeyModalProps {
  orgId: string;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Two-phase modal for generating a new API key.
 *
 * Phase 1 — Input: user enters a label.
 * Phase 2 — Reveal: full raw key is shown ONCE with a copy button and security warning.
 *
 * @param orgId - UUID of the organization.
 * @param projectId - UUID of the project.
 * @param open - Whether the modal is visible.
 * @param onClose - Callback to close the modal.
 * @param onCreated - Fires after successful key creation to refresh the list.
 * @returns The React modal component.
 */
export default function CreateApiKeyModal({
  orgId,
  projectId,
  open,
  onClose,
  onCreated,
}: CreateApiKeyModalProps) {
  const [label, setLabel] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || createdKey) return;

    let active = true;

    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const [publicModels, orgModels] = await Promise.all([
          getPublicModels().catch(() => []),
          smartFetch<Model[]>(`/organizations/${orgId}/models`, {
            cache: "no-store",
          }).catch(() => []),
        ]);

        if (!active) return;

        const deduped = new Map<string, Model>();
        [...publicModels, ...orgModels].forEach((model) => {
          deduped.set(model.id, model);
        });

        const mergedModels = Array.from(deduped.values()).sort((a, b) =>
          a.name.localeCompare(b.name),
        );

        setAvailableModels(mergedModels);
        setSelectedModelId((current) =>
          current && deduped.has(current)
            ? current
            : mergedModels[0]?.id ?? "",
        );
      } catch (error) {
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load models",
          );
        }
      } finally {
        if (active) {
          setIsLoadingModels(false);
        }
      }
    };

    void loadModels();

    return () => {
      active = false;
    };
  }, [open, createdKey, orgId]);

  const handleCreate = async () => {
    if (!label.trim()) {
      toast.error("Please enter a label for this key");
      return;
    }
    if (!selectedModelId) {
      toast.error("Please select which model this key should access");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createApiKey(orgId, projectId, label.trim(), selectedModelId);
      setCreatedKey(result);
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create API key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!createdKey?.rawKey) return;
    navigator.clipboard
      .writeText(createdKey.rawKey)
      .then(() => {
        setCopied(true);
        toast.success("API key copied");
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(() => toast.error("Failed to copy"));
  };

  const handleClose = () => {
    setLabel("");
    setSelectedModelId("");
    setCreatedKey(null);
    setCopied(false);
    onClose();
  };

  const selectedModel = availableModels.find((model) => model.id === selectedModelId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {createdKey ? "Key Created" : "Generate API Key"}
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                {createdKey
                  ? "Copy your key now — it won't be shown again."
                  : "Give this key a label and choose the model it should be allowed to call."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Phase 1: Label input */}
        {!createdKey && (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm leading-6 text-muted-foreground">
              Good labels make rotation and auditing easier later. A clear pattern like <code className="font-mono text-foreground">Production API</code> or <code className="font-mono text-foreground">Staging Worker</code> works well.
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="key-label" className="text-sm font-medium">Key Label</Label>
              <Input
                id="key-label"
                placeholder="e.g. Production App, CI/CD Pipeline"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="key-model" className="text-sm font-medium">Allowed Model</Label>
              <select
                id="key-model"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={isSubmitting || isLoadingModels || availableModels.length === 0}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                {isLoadingModels ? (
                  <option value="">Loading models...</option>
                ) : availableModels.length === 0 ? (
                  <option value="">No available models found</option>
                ) : (
                  availableModels.map((model) => {
                    const ownerLabel = model.organization?.name
                      ? ` · ${model.organization.name}`
                      : model.isPublic
                        ? " · Marketplace"
                        : "";
                    return (
                      <option key={model.id} value={model.id}>
                        {model.name}{ownerLabel}
                      </option>
                    );
                  })
                )}
              </select>
              <p className="text-xs leading-5 text-muted-foreground">
                This key will only work for the selected model.
                {selectedModel ? ` Current selection: ${selectedModel.name}.` : ""}
              </p>
            </div>
          </div>
        )}

        {/* Phase 2: Key reveal */}
        {createdKey && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                <strong>Save this key now.</strong> It will not be shown again after you close this dialog.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Label</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{createdKey.label}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Visibility</p>
                <p className="mt-2 text-sm font-semibold text-foreground">Shown once only</p>
              </div>
            </div>
            {createdKey.model && (
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Allowed Model</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{createdKey.model.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[createdKey.model.framework, createdKey.model.type].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Your API Key</Label>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted p-3">
                <code className="flex-1 text-xs font-mono text-foreground break-all select-all">
                  {createdKey.rawKey}
                </code>
                <button
                  onClick={handleCopy}
                  title="Copy API key"
                  className="shrink-0 p-1.5 rounded hover:bg-secondary transition-colors"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" strokeWidth={2} />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-background/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Request Auth</p>
              <p className="mt-2 text-xs leading-5 text-foreground">
                Send this key as <code className="font-mono">Authorization: Bearer &lt;key&gt;</code> or <code className="font-mono">x-api-key: &lt;key&gt;</code>.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!createdKey ? (
            <>
              <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={
                  isSubmitting ||
                  isLoadingModels ||
                  !label.trim() ||
                  !selectedModelId
                }
              >
                {isSubmitting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                ) : (
                  "Generate Key"
                )}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleClose} className="w-full">
              {copied ? (
                <><CheckCircle className="w-3.5 h-3.5" /> Done - Key Saved</>
              ) : (
                "I've copied the key"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
