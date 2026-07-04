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
      <div className="flex flex-col items-center justify-center min-h-100 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2" />
        <span>Authenticating administrator credentials...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
          <ScrollText className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">System Logs</h2>
          <p className="text-xs text-slate-400">
            Real-time aggregate platform log search and distributed trace visualizer
          </p>
        </div>
      </div>

      <AdminSystemLogs />
    </div>
  );
}
