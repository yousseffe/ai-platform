"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { ModelVersion } from "@/types";
import { SchemaDetectionStatus } from "@/types/enums";
import { confirmSchemaDetection } from "@/lib/services/models.service";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface SchemaReviewBannerProps {
  version: ModelVersion;
  modelId: string;
}

/**
 * Reminder banner shown on a model's page when its active version's sample
 * request/response schema was auto-detected during the build pipeline (or
 * failed to auto-detect) and hasn't been reviewed by the provider yet.
 * Renders nothing once the schema is manually supplied or confirmed.
 *
 * @param props - The active model version and its parent model's ID.
 * @returns The banner element, or null if no review is needed.
 */
export function SchemaReviewBanner({ version, modelId }: SchemaReviewBannerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [examplePayload, setExamplePayload] = useState(version.examplePayload || "");
  const [expectedResult, setExpectedResult] = useState(version.expectedResult || "");

  const status = version.schemaDetectionStatus;
  if (status !== SchemaDetectionStatus.AUTO_DETECTED && status !== SchemaDetectionStatus.NEEDS_ATTENTION) {
    return null;
  }

  const needsAttention = status === SchemaDetectionStatus.NEEDS_ATTENTION;

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await confirmSchemaDetection(
        version.id,
        examplePayload.trim() || undefined,
        expectedResult.trim() || undefined,
      );
      toast.success("Schema confirmed.");
      setIsOpen(false);
      router.refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(`Failed to confirm schema: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`border rounded-xl p-4 flex items-start gap-3 text-xs font-sans ${
        needsAttention
          ? "border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10"
          : "border-sky-500/30 bg-sky-50/50 dark:bg-sky-950/10"
      }`}
    >
      {needsAttention ? (
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      ) : (
        <Sparkles className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 space-y-1.5">
        <p className="font-semibold text-foreground">
          {needsAttention
            ? "Schema auto-detection failed or found nothing"
            : "Schema was auto-detected during build"}
        </p>
        <p className="text-muted-foreground">
          {needsAttention
            ? "Please provide a sample request/response manually so the API docs and pipeline builder show accurate data."
            : "Please review it to make sure it matches your model before consumers rely on it."}
        </p>
      </div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Button
          variant={needsAttention ? "default" : "outline"}
          size="sm"
          onClick={() => setIsOpen(true)}
        >
          Review &amp; Confirm
        </Button>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review model schema</DialogTitle>
            <DialogDescription>
              Confirm or edit the sample request payload and expected result for this version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="review-example-payload">Example payload</Label>
              <Textarea
                id="review-example-payload"
                value={examplePayload}
                onChange={(e) => setExamplePayload(e.target.value)}
                className="font-mono text-xs h-32"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-expected-result">Expected result</Label>
              <Textarea
                id="review-expected-result"
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                className="font-mono text-xs h-32"
                spellCheck={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
