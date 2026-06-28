"use client";

import React, { useState } from "react";
import { useOrgContext } from "@/hooks/use-org-context";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { Settings, Loader2, AlertTriangle, Building2, Globe2, ShieldCheck, Upload, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";

/**
 * Org Settings page — OWNER-only form to update org name, description, and avatar URL.
 * Includes a danger zone placeholder for destructive actions.
 *
 * @returns The React page component.
 */
export default function OrgSettingsPage() {
  const { org, loadOrg } = useOrgContext();

  const [name, setName] = useState(org?.name ?? "");
  const [description, setDescription] = useState(org?.description ?? "");
  const [avatarUrl, setAvatarUrl] = useState(org?.avatarUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  if (!org) return null;

  const effectiveLogo = avatarUrl || org.avatarUrl;

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    setIsUploadingLogo(true);
    try {
      const updated = await smartFetch<{ avatarUrl: string | null }>(`/organizations/${org.id}/logo`, {
        method: "POST",
        body: formData,
      });
      setAvatarUrl(updated.avatarUrl ?? "");
      toast.success("Organization logo uploaded");
      await loadOrg(org.slug);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await smartFetch(`/organizations/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || org.name,
          description: description.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
        }),
      });
      toast.success("Organization updated");
      await loadOrg(org.slug);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update organization");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl animate-fade-in">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage organization identity, visibility, and workspace metadata.</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center text-primary">
          <Settings className="w-4 h-4" strokeWidth={1.8} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-foreground">Organization Profile</h2>
            <p className="text-xs text-muted-foreground mt-1">These details are shown across the organization console.</p>
          </div>
          <div className="rounded-xl border border-dashed border-border bg-background/60 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card">
                {effectiveLogo ? (
                  <img src={effectiveLogo} alt={`${org.name} logo`} className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-8 w-8 text-muted-foreground" strokeWidth={1.6} />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Organization Logo</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload a clean brand mark so your workspace feels like your company, not a generic console.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Label htmlFor="org-logo-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/60">
                    {isUploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />}
                    {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                  </Label>
                  <input id="org-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                  <span className="text-[11px] text-muted-foreground">PNG, JPG, SVG, or WebP up to 5MB.</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-name" className="text-sm font-medium">Organization Name</Label>
              <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" disabled={isSaving} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-avatar" className="text-sm font-medium">Logo URL <span className="text-xs font-normal text-muted-foreground">(optional fallback)</span></Label>
              <Input id="org-avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://example.com/logo.png" disabled={isSaving} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-desc" className="text-sm font-medium">Description <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="org-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this organization do?" disabled={isSaving} />
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 space-y-5">
          <div className="flex items-center gap-3">
            {effectiveLogo ? (
              <img src={effectiveLogo} alt={`${org.name} logo`} className="h-11 w-11 rounded-lg border border-primary/15 object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/15 text-primary flex items-center justify-center font-extrabold">
                {(name || org.name).slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate">{name || org.name}</h2>
              <p className="text-xs text-muted-foreground truncate">{description || "No description"}</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Globe2 className="w-3.5 h-3.5" /> Slug
              </span>
              <span className="font-mono text-xs text-foreground truncate">{org.slug}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-3.5 h-3.5" /> Type
              </span>
              <span className="text-xs font-semibold text-foreground">{org.type}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5" /> Status
              </span>
              <span className="text-xs font-semibold text-emerald-600">{org.status}</span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Destructive actions are intentionally disabled in this build. Contact platform support for suspension or deletion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
