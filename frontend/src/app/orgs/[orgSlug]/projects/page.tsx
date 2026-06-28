"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useOrgContext } from "@/hooks/use-org-context";
import { OrgAction } from "@/types";
import { listProjects, createProject, deleteProject, Project } from "@/lib/services/projects.service";
import {
  FolderKanban,
  Plus,
  Loader2,
  Key,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * Projects list page — all projects in the org.
 * OWNER/MAINTAINER can create and delete. All roles can browse.
 *
 * @returns The React page component.
 */
export default function OrgProjectsPage() {
  const { org, can } = useOrgContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!org) return;
    setIsLoading(true);
    try {
      setProjects(await listProjects(org.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, [org]);

  useEffect(() => {
    Promise.resolve().then(fetchProjects);
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!org || !newName.trim()) return;
    setIsCreating(true);
    try {
      await createProject(org.id, newName.trim(), newDesc.trim() || undefined);
      toast.success("Project created");
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      await fetchProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!org || !confirm(`Delete "${projectName}" and revoke all its API keys?`)) return;
    try {
      await deleteProject(org.id, projectId);
      toast.success("Project deleted");
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete project");
    }
  };

  if (!org) return null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize consumer applications, API keys, and model access by project.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex h-9 items-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-muted-foreground">
            {projects.length} active
          </div>
          {can(OrgAction.CREATE_PROJECT) && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              New Project
            </Button>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Project Directory</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">All consumer projects</h2>
          </div>
          <div className="text-xs text-muted-foreground">
            One project per app, environment, or external client is the recommended structure.
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" strokeWidth={1.5} />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/70 px-6 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary/10 text-primary">
                <FolderKanban className="w-7 h-7" strokeWidth={1.6} />
              </div>
              <h3 className="mt-5 text-lg font-bold text-foreground">No projects yet</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {can(OrgAction.CREATE_PROJECT)
                  ? "Create your first project to separate API keys, keep usage organized, and give each application its own workspace."
                  : "No projects have been created for this organization yet."}
              </p>
              {can(OrgAction.CREATE_PROJECT) && (
                <Button size="sm" className="mt-5" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Create First Project
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="group relative overflow-hidden rounded-xl border border-border bg-background/75 p-5 transition-all hover:border-primary/20 hover:shadow-sm"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-sky-500/60 to-emerald-500/60 opacity-80" />
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/10">
                        <FolderKanban className="w-5 h-5" strokeWidth={1.6} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-foreground">{project.name}</h3>
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Project Workspace
                        </p>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                          {project.description || "No description added yet. Use this project to isolate one consumer application or integration."}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 lg:min-w-[320px] lg:items-end">
                      {can(OrgAction.DELETE_PROJECT) && (
                        <button
                          onClick={() => handleDelete(project.id, project.name)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-destructive/20 hover:bg-destructive/8 hover:text-destructive"
                          title="Delete project"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.6} />
                        </button>
                      )}
                      <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-[320px]">
                        <div className="rounded-lg border border-border bg-card/80 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Access</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">Scoped Keys</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card/80 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Created</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {new Date(project.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="rounded-lg border border-border/80 bg-card px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Access</p>
                      <p className="mt-1 text-xs text-muted-foreground">Manage credentials for this project from its dedicated API key area.</p>
                    </div>
                    <Link
                      href={`/orgs/${org.slug}/projects/${project.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                    >
                      <Key className="w-3.5 h-3.5" strokeWidth={1.7} />
                      API Keys
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Create Project</DialogTitle>
            <DialogDescription>
              Set up a dedicated workspace for one application, environment, or client integration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-primary/15 bg-primary/8 px-4 py-3">
              <p className="text-sm font-medium text-foreground">What this project will hold</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Each project gets its own API keys and keeps usage separated from other apps inside the organization.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Good Examples</p>
                <p className="mt-2 text-xs leading-5 text-foreground">
                  Production App
                  <br />
                  Staging Dashboard
                  <br />
                  Client A Integration
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Best Practice</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Use one project per app or environment so API keys and usage stay easy to manage.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-name" className="text-sm font-medium">Project Name</Label>
              <Input id="project-name" placeholder="e.g. Production App" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={isCreating} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-desc" className="text-sm font-medium text-muted-foreground">Description <span className="text-xs">(optional)</span></Label>
              <Input id="project-desc" placeholder="Short description of the app or integration" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} disabled={isCreating} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={isCreating}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={isCreating || !newName.trim()}>
              {isCreating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
