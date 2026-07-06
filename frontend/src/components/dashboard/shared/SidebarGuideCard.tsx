import React from "react";
import { LucideIcon, Copy, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GuideStep {
  title: string;
  description: string;
  code?: string;
}

interface SidebarGuideCardProps {
  title: string;
  icon: LucideIcon;
  steps: GuideStep[];
  color?: "primary" | "amber" | "emerald" | "blue";
  actionLabel?: string;
  actionHref?: string;
}

export default function SidebarGuideCard({
  title,
  icon: Icon,
  steps,
  color = "primary",
  actionLabel,
  actionHref,
}: SidebarGuideCardProps) {
  const borderClasses = {
    primary: "border-l-primary hover:border-primary/35",
    amber: "border-l-amber-500 hover:border-amber-500/35",
    emerald: "border-l-emerald-500 hover:border-emerald-500/35",
    blue: "border-l-blue-500 hover:border-blue-500/35",
  };

  const textColors = {
    primary: "text-primary",
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    blue: "text-blue-500",
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied code payload!", {
      id: "copy-toast",
      duration: 1500,
    });
  };

  return (
    <Card className={cn(
      "border border-border bg-card border-l-4 p-5 text-left flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 rounded-xl select-none relative overflow-hidden",
      borderClasses[color]
    )}>
      {/* Background flare */}
      <div className="absolute right-0 top-0 w-20 h-20 bg-primary/2 rounded-full blur-xl pointer-events-none" />

      <div className="space-y-4">
        <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
          <Icon className={cn("w-4 h-4", textColors[color])} strokeWidth={2} />
          {title}
        </h3>
        
        <div className="space-y-4 text-xs leading-relaxed text-muted-foreground font-sans">
          {steps.map((step, idx) => (
            <div key={idx} className="space-y-1.5">
              <p className="font-bold text-foreground text-[11.5px]">{idx + 1}. {step.title}</p>
              <p className="text-[11px] leading-relaxed">{step.description}</p>
              {step.code && (
                <div className="relative group/code">
                  <pre className="bg-[#121316] text-[#ededed] border border-[#222326] p-2 pr-8 rounded-lg text-[10px] font-mono overflow-x-auto select-all max-w-full">
                    {step.code}
                  </pre>
                  <button
                    onClick={() => handleCopy(step.code!)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors opacity-0 group-hover/code:opacity-100 cursor-pointer"
                    title="Copy code"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {actionLabel && actionHref && (
        <div className="pt-4.5 mt-4 border-t border-border">
          <Link
            href={actionHref}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-bold text-foreground transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
          >
            {actionLabel} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </Card>
  );
}
