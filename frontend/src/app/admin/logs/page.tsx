"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "react-hot-toast";
import { Loader2, ScrollText } from "lucide-react";
import { AdminSystemLogs } from "@/components/admin/AdminSystemLogs";

export default function AdminLogsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isAdmin, isLoading: isWorkspaceLoading, fetchWorkspaceDetails } = useWorkspace();

  // Load workspace context on mount
  useEffect(() => {
    if (session) {
      fetchWorkspaceDetails(session);
    }
  }, [session, fetchWorkspaceDetails]);

  // Redirect non-admins
  useEffect(() => {
    if (!isWorkspaceLoading && !isAdmin) {
      toast.error("Access denied: Admin permissions required");
      router.push("/dashboard");
    }
  }, [isAdmin, isWorkspaceLoading, router]);

  if (isWorkspaceLoading || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-foreground font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2.5" />
        <span>Authenticating administrator credentials...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans relative animate-fade-in">
      {/* Decorative background glows */}
      <div className="glow-spot" />
      <div className="glow-spot-secondary" />

      <div className="flex items-center gap-3 border-b border-border/80 pb-5 relative z-10">
        <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-500 border border-purple-500/20 shrink-0">
          <ScrollText className="w-5 h-5" />
        </div>
        <div className="text-left">
          <h2 className="text-xl font-bold text-foreground">System Logs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time aggregate platform log search and distributed trace visualizer
          </p>
        </div>
      </div>

      <div className="relative z-10">
        <AdminSystemLogs />
      </div>
    </div>
  );
}
