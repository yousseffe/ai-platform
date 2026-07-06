"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  /** Whether the confirmation dialog is currently visible. */
  open: boolean;
  /** Invoked when the dialog should open or close (cancel, backdrop click, escape). */
  onOpenChange: (open: boolean) => void;
  /** Short dialog heading, e.g. "Delete API key". */
  title: string;
  /** One or two sentence explanation of what this action does and whether it can be undone. */
  description: string;
  /** Label for the confirming button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Styles the confirm button and icon as a destructive (red) action versus a neutral one. */
  variant?: "danger" | "default";
  /** Called when the user confirms. May be async; the dialog shows a pending state and stays open until it resolves. */
  onConfirm: () => void | Promise<void>;
}

/**
 * Shared confirmation dialog for destructive or otherwise consequential actions
 * (deleting a resource, revoking a key, removing a member). Replaces native
 * `window.confirm()` popups, which break out of the app's styling and can't
 * show any context beyond a single line of plain text.
 *
 * @param props - Dialog open state, copy, and the confirm handler.
 * @returns The React component rendering the confirmation dialog.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isConfirming && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader className="flex flex-row items-start gap-4 select-none pr-6">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
            <AlertTriangle className="h-5.5 w-5.5" strokeWidth={2} />
          </div>
          <div className="space-y-1">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">{description}</DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="flex sm:flex-row gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-9 font-bold text-xs"
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "destructive" : "default"}
            onClick={handleConfirm}
            className="flex-1 h-9 font-bold text-xs"
            disabled={isConfirming}
          >
            {isConfirming ? "Working..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
