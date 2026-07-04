"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, UserCheck, UserX, Trash2, DollarSign, Users as UsersIcon, Award, Sparkles, Coins, RefreshCw, Eye } from "lucide-react";
import { useSession } from "next-auth/react";
import { useWorkspace } from "@/hooks/use-workspace";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import AdjustBalanceModal from "@/components/admin/AdjustBalanceModal";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  isAdmin: boolean;
  providerMode: boolean;
  createdAt: string;
  consumerBalance: number;
  providerBalance: number;
  apiKey: string | null;
  models: Array<{
    id: string;
    name: string;
    framework: string;
    costPerRequest: number;
    isPublic: boolean;
  }>;
}

/**
 * Platform User Accounts Management page.
 * Restricts access to global admins and exposes lists of all users,
 * controls to toggle platform roles, manual wallet adjustment, and account purge capabilities.
 *
 * @returns The React component rendering the user registry page.
 */
export default function AdminUsersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isAdmin, isLoading: isWorkspaceLoading, fetchWorkspaceDetails } = useWorkspace();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userPendingDelete, setUserPendingDelete] = useState<AdminUser | null>(null);
  const [userPendingAdminToggle, setUserPendingAdminToggle] = useState<AdminUser | null>(null);

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

  const loadUsers = async (showToast = false) => {
    setLoading(true);
    try {
      const data = await smartFetch<AdminUser[]>("/admin/users");
      setUsers(data || []);
      if (showToast) {
        toast.success("User registry data synced!");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load platform user accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers(false);
    }
  }, [isAdmin]);

  const toggleAdmin = async (userId: string) => {
    try {
      const res = await smartFetch<{ success: boolean; isAdmin: boolean }>(`/admin/users/${userId}/toggle-admin`, {
        method: "PATCH",
      });
      if (res.success) {
        toast.success(`Admin status ${res.isAdmin ? "granted" : "revoked"} successfully!`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isAdmin: res.isAdmin } : u))
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle role");
    }
  };

  const toggleProvider = async (userId: string) => {
    try {
      const res = await smartFetch<{ success: boolean; providerMode: boolean }>(`/admin/users/${userId}/toggle-provider`, {
        method: "PATCH",
      });
      if (res.success) {
        toast.success(`Provider mode status ${res.providerMode ? "activated" : "deactivated"} successfully!`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, providerMode: res.providerMode } : u))
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle role");
    }
  };

  const deleteUser = async (user: AdminUser) => {
    try {
      const res = await smartFetch<{ success: boolean }>(`/admin/users/${user.id}`, {
        method: "DELETE",
      });
      if (res.success) {
        toast.success("User account purged successfully!");
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setUserPendingDelete(null);
    }
  };

  const openAdjustModal = (user: AdminUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  if (isWorkspaceLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-foreground font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2.5 text-xs">Authenticating Admin Access...</span>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute live user stats details
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.isAdmin).length;
  const providerCount = users.filter((u) => u.providerMode).length;
  const totalCreditsCirculating = users.reduce((sum, u) => sum + u.consumerBalance, 0);

  return (
    <div className="w-full space-y-6 text-foreground font-mono text-xs animate-fade-in">
      <PageHeader
        title={<><Shield /> User Registry Console</>}
        description="Overseeing registered developer accounts, administrative authorization privileges, and manual balance adjustments."
        className="mb-0"
        actions={
          <Button
            variant="outline"
            onClick={() => loadUsers(true)}
            disabled={loading}
            className="gap-1.5 cursor-pointer font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* User Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<UsersIcon />} label="Developer Registries" value={totalUsers} caption="Active profiles" />
        <StatCard icon={<Award />} label="Administrators" value={adminCount} caption="Auth controllers" />
        <StatCard icon={<Sparkles />} label="Service Providers" value={providerCount} caption="Hosts enabled" />
        <StatCard icon={<Coins />} label="Circulating Credits" value={Math.round(totalCreditsCirculating)} caption="In consumer wallets" tone="primary" />
      </div>

      {/* Main content table */}
      <Card className="border border-border bg-card shadow-xs p-0 overflow-hidden">
        <CardHeader className="p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Registered User Directory</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
              Manage credentials, assign system roles, adjust account balances, and delete user contexts.
            </CardDescription>
          </div>
          <div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email or ID..."
              className="w-64 h-8 px-3 rounded-md border border-border bg-background text-foreground text-xs font-mono placeholder:text-muted-foreground/60 outline-hidden focus:border-primary transition-all"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              <span>Fetching developer registries...</span>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="w-full text-left border-collapse">
                <TableHeader>
                  <TableRow className="bg-muted/10 border-b border-border">
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Developer Details</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Platform Roles</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Consumer Balance</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Provider Balance</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Created Date</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border text-xs font-mono">
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30 border-b border-border">
                      <TableCell
                        className="px-5 py-3.5 cursor-pointer hover:bg-secondary/40 transition-colors"
                        onClick={() => router.push(`/admin/users/${user.id}`)}
                        title="Click to view full developer credentials and models"
                      >
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-foreground text-xs hover:text-primary transition-colors">
                            {user.fullName}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5 font-sans">{user.email}</span>
                          <span className="text-[8px] text-muted-foreground/60 select-all mt-0.5">{user.id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-left">
                        <div className="flex flex-wrap gap-1.5 font-sans">
                          {user.isAdmin && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                              ADMIN
                            </span>
                          )}
                          {user.providerMode && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              PROVIDER
                            </span>
                          )}
                          {!user.isAdmin && !user.providerMode && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-muted text-muted-foreground border border-border">
                              CONSUMER
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-left font-bold text-primary">
                        {Math.round(user.consumerBalance)} Credits
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-left font-bold text-emerald-600 dark:text-emerald-400">
                        {user.providerBalance.toFixed(2)} EGP
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-left text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Credentials & Models"
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={user.isAdmin ? "Revoke Admin Status" : "Promote to Admin"}
                            onClick={() => setUserPendingAdminToggle(user)}
                            className={`h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer ${
                              user.isAdmin ? "text-red-500 hover:text-red-600 bg-red-500/5 hover:bg-red-500/15" : ""
                            }`}
                          >
                            {user.isAdmin ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={user.providerMode ? "Revoke Provider Access" : "Grant Provider Access"}
                            onClick={() => toggleProvider(user.id)}
                            className={`h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer ${
                              user.providerMode ? "text-emerald-500 hover:text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/15" : ""
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Adjust Balances"
                            onClick={() => openAdjustModal(user)}
                            className="h-7 w-7 text-primary hover:text-primary-foreground hover:bg-primary cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete Account"
                            disabled={user.email.toLowerCase().includes("admin")}
                            onClick={() => setUserPendingDelete(user)}
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={<UsersIcon />}
              title="No matching accounts"
              description="No registered user accounts found matching your search query."
            />
          )}
        </CardContent>
      </Card>

      {/* Adjust Balance Modal */}
      <AdjustBalanceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={() => loadUsers(false)}
      />

      <ConfirmDialog
        open={!!userPendingDelete}
        onOpenChange={(open) => !open && setUserPendingDelete(null)}
        title="Delete user account"
        description={`Permanently delete "${userPendingDelete?.fullName}"? This purges their account, models, and API keys and can't be undone.`}
        confirmLabel="Delete account"
        onConfirm={async () => {
          if (userPendingDelete) {
            await deleteUser(userPendingDelete);
          }
        }}
      />

      <ConfirmDialog
        open={!!userPendingAdminToggle}
        onOpenChange={(open) => !open && setUserPendingAdminToggle(null)}
        title={userPendingAdminToggle?.isAdmin ? "Revoke admin access" : "Grant admin access"}
        description={
          userPendingAdminToggle?.isAdmin
            ? `Remove admin privileges from "${userPendingAdminToggle?.fullName}"? They'll lose access to this console immediately.`
            : `Grant "${userPendingAdminToggle?.fullName}" full admin access, including user management and platform configuration.`
        }
        variant={userPendingAdminToggle?.isAdmin ? "danger" : "default"}
        confirmLabel={userPendingAdminToggle?.isAdmin ? "Revoke access" : "Grant access"}
        onConfirm={async () => {
          if (userPendingAdminToggle) {
            await toggleAdmin(userPendingAdminToggle.id);
          }
          setUserPendingAdminToggle(null);
        }}
      />
    </div>
  );
}
