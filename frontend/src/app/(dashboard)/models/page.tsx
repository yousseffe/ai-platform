import React from "react";
import { Metadata } from "next";
import { Plus, Layers } from "lucide-react";
import Link from "next/link";
import { getModels } from "@/lib/actions/models.actions";
import { RegistryStatsOverview } from "@/components/models/RegistryStatsOverview";
import { ModelsTable } from "@/components/models/ModelsTable";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Models Registry - Qantara",
  description: "Browse, version, and manage machine learning models, preprocess scalers, and custom scripts in the Qantara model catalog.",
};

export default async function ModelsRegistryPage() {
  const models = await getModels();

  return (
    <div className="w-full pb-12 animate-in fade-in duration-500 text-foreground space-y-6 text-left font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-3xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">Models Registry</h1>
            <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
              Manage, version, and deploy your machine learning assets across environments.
            </p>
          </div>
        </div>
        
        <Link
          href="/models/upload"
          className={cn(
            buttonVariants({ variant: "default" }),
            "h-9 px-4 text-xs font-bold gap-1.5 shrink-0 w-fit shadow-md shadow-primary/10 active:scale-[0.98] transition-transform"
          )}
        >
          <Plus className="w-4 h-4" /> New Model
        </Link>
      </div>

      {/* Registry Specific Status Metric Cards */}
      <RegistryStatsOverview models={models} />

      {/* Models Interactive Registry Table */}
      <ModelsTable models={models} />
    </div>
  );
}
