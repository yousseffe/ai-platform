"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "react-hot-toast";
import {
  LayoutGrid,
  Layers,
  Settings,
  BookOpen,
  HelpCircle,
  LogOut,
  ChevronDown,
  Plus,
  TrendingUp,
  Coins,
  Shield,
  CreditCard,
  User,
  Key,
  Plug,
  Workflow,
} from "lucide-react";
import { useWorkspace, Workspace } from "@/hooks/use-workspace";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { OwnerType, WalletType } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Helper component rendering a sidebar link with a left-indicator line.
 */
interface SidebarLinkProps {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SidebarLink({ href, active, icon, children }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium transition-all text-sm select-none ${
        active
          ? "bg-primary/[0.06] text-primary font-semibold shadow-xs"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
      }`}
    >
      {active && (
        <span className="absolute left-1 top-2.5 bottom-2.5 w-0.75 rounded-full bg-primary" />
      )}
      <span className={`transition-colors ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}>
        {icon}
      </span>
      {children}
    </Link>
  );
}

/**
 * Platform navigation Sidebar component.
 * Integrates Shadcn Dropdown switcher for workspaces, dual role layout toggles,
 * active status details, and OTP verification challenge overlays.
 * Refactored to include a collapsible Settings menu for sub-routing settings tabs.
 *
 * @returns The React component rendering the sidebar.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const {
    activeWorkspace,
    workspaces,
    viewMode,
    balance,
    canAccessBilling,
    isProviderModeEnabled,
    triggerWorkspaceSwitch,
    confirmWorkspaceSwitch,
    isOtpModalOpen,
    setOtpModalOpen,
    switchingWorkspace,
    setViewMode,
    isAdmin,
    refreshData,
  } = useWorkspace();

  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const status = searchParams.get("status");
    const pendingOrgId = searchParams.get("pending_org");

    if (status !== "org_success" || !pendingOrgId) {
      return;
    }

    let cancelled = false;

    /**
     * Polls the backend until the Stripe webhook finishes organization creation.
     */
    const waitForOrganizationCreation = async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
          const checkoutState = await smartFetch<{
            status: "pending" | "completed" | "expired";
            organization?: { id: string; name: string; slug: string };
          }>(`/organizations/checkout-status/${pendingOrgId}`);

          if (cancelled) {
            return;
          }

          if (checkoutState.status === "completed" && checkoutState.organization) {
            await refreshData();
            toast.success("Workspace created successfully!");
            router.replace(`/orgs/${checkoutState.organization.slug}/overview`);
            return;
          }

          if (checkoutState.status === "expired") {
            toast.error("Workspace payment succeeded, but creation status expired. Please refresh and check your organizations.");
            router.replace("/dashboard");
            return;
          }
        } catch (error) {
          if (cancelled) {
            return;
          }

          if (attempt === 9) {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to confirm workspace creation";
            toast.error(message);
            router.replace("/dashboard");
            return;
          }
        }

        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }

      if (!cancelled) {
        toast.error("Workspace creation is taking longer than expected. Please refresh your dashboard in a moment.");
        router.replace("/dashboard");
      }
    };

    waitForOrganizationCreation().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [searchParams, pathname, router, refreshData]);

  const [otpCode, setOtpCode] = React.useState("");
  const [otpError, setOtpError] = React.useState("");
  const [verifyingOtp, setVerifyingOtp] = React.useState(false);

  // Collapsible Settings menu state
  const isSettingsActive = pathname.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = React.useState(isSettingsActive);

  // Keep menu expanded if settings page route is loaded directly
  const [prevPathname, setPrevPathname] = React.useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (isSettingsActive) {
      setSettingsOpen(true);
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const getWorkspaceInitials = (name: string) => {
    return name.replace(/\(Personal\)/gi, "").trim().substring(0, 2).toUpperCase();
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setVerifyingOtp(true);
    try {
      const res = await confirmWorkspaceSwitch(otpCode);
      if (res.success) {
        setOtpCode("");
      } else {
        setOtpError(res.error || "Verification failed");
      }
    } catch {
      setOtpError("An unexpected error occurred");
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="w-60 bg-card border-r border-border flex flex-col h-screen shrink-0 relative z-30 font-sans">
      {/* Logo Area */}
      <div className="h-14 flex items-center px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 text-primary font-bold text-sm tracking-tight hover:opacity-90 transition-opacity">
          <div className="w-7 h-7 relative flex items-center justify-center shrink-0">
            <Image
              src="/logo.png"
              alt="MLHub Logo"
              width={26}
              height={26}
              className="object-contain"
              style={{ width: "auto" }}
            />
          </div>
          <span className="font-sans text-sm font-bold text-foreground tracking-tight">MLHub Console</span>
        </Link>
      </div>

      {/* Workspace Switcher */}
      <div className="px-3 py-3 border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center justify-between px-2.5 py-1.5 h-10 rounded-lg border border-border bg-background/50 hover:bg-secondary/80 hover:border-border transition-all cursor-pointer text-left focus:outline-none text-[11px] font-sans shadow-xs font-normal">
            <div className="flex items-center gap-2.5 overflow-hidden text-left">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-primary-600 text-primary-foreground font-bold text-[10px] flex items-center justify-center shrink-0 shadow-sm">
                {activeWorkspace ? getWorkspaceInitials(activeWorkspace.name) : "ML"}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[11px] font-semibold text-foreground truncate leading-none">
                  {activeWorkspace ? activeWorkspace.name : "Loading..."}
                </span>
                <span className="text-[8px] text-muted-foreground font-semibold tracking-wider mt-1 uppercase">
                  {activeWorkspace?.type === OwnerType.USER ? "Personal" : `Org • ${activeWorkspace?.role}`}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-60 transition-opacity ml-auto" strokeWidth={1.5} />
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-[216px] mt-1 bg-card border border-border shadow-lg rounded-xl p-1.5 flex flex-col gap-0.5 max-h-[280px] overflow-y-auto z-40 text-foreground font-sans">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2.5 py-1.5">
                Organizations
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/60 my-1" />
              {workspaces.map((ws: Workspace) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => {
                    if (ws.type === OwnerType.USER) {
                      triggerWorkspaceSwitch(ws);
                    } else {
                      router.push(`/orgs/${ws.slug}/overview`);
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left text-xs transition-colors cursor-pointer outline-none ${
                    activeWorkspace?.id === ws.id 
                      ? "bg-primary/10 font-semibold text-primary" 
                      : "hover:bg-secondary focus:bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="w-5.5 h-5.5 rounded bg-muted text-muted-foreground font-bold text-[9px] flex items-center justify-center shrink-0">
                    {getWorkspaceInitials(ws.name)}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-foreground text-xs truncate leading-none font-medium">{ws.name}</span>
                    <span className="text-[7.5px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                      {ws.type === OwnerType.USER ? "Personal" : ws.role}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border/60 my-1" />
            <DropdownMenuItem className="p-0">
              <Link
                href="/workspaces/create"
                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-semibold text-primary hover:bg-primary/5 focus:bg-primary/5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Create Organization
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Role view toggle (Consumer Mode vs Provider Mode) */}
      {isProviderModeEnabled && (
        <div className="px-3 py-2.5 border-b border-border bg-secondary/15 flex flex-col gap-1.5">
          <div className="flex bg-muted/65 rounded-lg p-1 border border-border/70">
            <Button
              variant={viewMode === WalletType.CONSUMER ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode(WalletType.CONSUMER)}
              className={`flex-1 text-[10px] font-semibold h-7 cursor-pointer ${
                viewMode === WalletType.CONSUMER
                  ? "bg-card text-primary shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/30"
              }`}
            >
              <Coins className="w-3.5 h-3.5" strokeWidth={1.5} /> Consumer
            </Button>
            <Button
              variant={viewMode === WalletType.PROVIDER ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode(WalletType.PROVIDER)}
              className={`flex-1 text-[10px] font-semibold h-7 cursor-pointer ${
                viewMode === WalletType.PROVIDER
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/95"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/30"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.5} /> Provider
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
        <SidebarLink href="/dashboard" active={isActive("/dashboard")} icon={<LayoutGrid className="w-4 h-4" strokeWidth={1.5} />}>
          Dashboard Overview
        </SidebarLink>

        {isAdmin && (
          <SidebarLink href="/admin" active={isActive("/admin")} icon={<Shield className="w-4 h-4" strokeWidth={1.5} />}>
            Admin Console
          </SidebarLink>
        )}

        {viewMode === WalletType.PROVIDER && (
          <SidebarLink href="/models" active={isActive("/models")} icon={<Layers className="w-4 h-4" strokeWidth={1.5} />}>
            Models Registry
          </SidebarLink>
        )}
        {viewMode === WalletType.PROVIDER && (
        <SidebarLink href="/pipelines" active={isActive("/pipelines")} icon={<Workflow className="w-4 h-4" strokeWidth={1.5} />}>
          Pipelines
        </SidebarLink>
        )}
        {/* Collapsible settings button link */}
        <div className="flex flex-col">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`group relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg font-medium transition-all text-sm cursor-pointer text-left focus:outline-none select-none ${
              isSettingsActive
                ? "bg-primary/[0.06] text-primary font-semibold"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            {isSettingsActive && (
              <span className="absolute left-1 top-2.5 bottom-2.5 w-0.75 rounded-full bg-primary" />
            )}
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
              Settings
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-all duration-200 ${settingsOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
          </button>

          {settingsOpen && (
            <div className="pl-3 flex flex-col gap-1 mt-1 border-l border-border/70 ml-5.5 py-0.5 select-none">
              <Link
                href="/settings/profile"
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  pathname === "/settings/profile"
                    ? "text-primary font-semibold bg-primary/[0.04]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                }`}
              >
                <User className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                Profile & Role
              </Link>
              {canAccessBilling && (
                <Link
                  href="/settings/billing"
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    pathname === "/settings/billing"
                      ? "text-primary font-semibold bg-primary/[0.04]"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                  }`}
                >
                  <Coins className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                  Billing & Wallet
                </Link>
              )}
              <Link
                href="/settings/api"
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  pathname === "/settings/api"
                    ? "text-primary font-semibold bg-primary/[0.04]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                }`}
              >
                <Key className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                API Credentials
              </Link>
              <Link
                href="/settings/mcp-tokens"
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  pathname === "/settings/mcp-tokens"
                    ? "text-primary font-semibold bg-primary/[0.04]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                }`}
              >
                <Plug className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                MCP Access Tokens
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Ledger widget */}
      <div className="px-3 pb-3">
        {viewMode === WalletType.PROVIDER ? (
          <Link
            href="/models/upload"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-primary-foreground shadow-sm hover:shadow-md active:translate-y-0.5 cursor-pointer h-8 text-xs font-semibold gap-1.5 px-2.5"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Publish Model
          </Link>
        ) : canAccessBilling ? (
          <Card size="sm" className="border border-border bg-gradient-to-br from-secondary/50 via-card to-secondary/15 shadow-xs">
            <CardContent className="flex flex-col gap-2.5 p-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Credits Balance</p>
                  <p className="text-base font-extrabold text-foreground mt-1">{Math.round(balance)}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary shadow-xs">
                  <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                </div>
              </div>
              <Link
                href="/settings/billing"
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 dark:border-input dark:bg-input/30 dark:hover:bg-input/50 w-full text-foreground hover:text-primary border-border shadow-xs hover:border-primary/30 cursor-pointer h-7 text-[10px] font-bold gap-1 px-2.5"
              >
                Top Up Credits
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card size="sm" className="border border-border bg-secondary/20 shadow-xs">
            <CardContent className="p-0 text-[10px] text-muted-foreground leading-relaxed">
              Billing data is limited to organization owners for shared workspaces.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer Links */}
      <div className="p-2 border-t border-border flex flex-col gap-0.5 bg-secondary/5">
        <Button
          variant="ghost"
          className="group w-full justify-start gap-2.5 px-3 h-9 rounded-lg text-muted-foreground hover:bg-secondary/70 hover:text-foreground text-sm cursor-pointer select-none font-medium"
        >
          <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
          Documentation
        </Button>
        <Button
          variant="ghost"
          className="group w-full justify-start gap-2.5 px-3 h-9 rounded-lg text-muted-foreground hover:bg-secondary/70 hover:text-foreground text-sm cursor-pointer select-none font-medium"
        >
          <HelpCircle className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
          Support
        </Button>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="group w-full justify-start gap-2.5 px-3 h-9 rounded-lg text-red-500 hover:bg-red-500/10 dark:hover:bg-red-950/20 text-sm mt-1 cursor-pointer select-none font-medium"
        >
          <LogOut className="w-4 h-4 text-red-500 transition-colors" strokeWidth={1.5} />
          Logout
        </Button>
      </div>

      {/* Workspace Switch OTP Verification Modal */}
      <Dialog open={isOtpModalOpen} onOpenChange={(open) => {
        setOtpModalOpen(open);
        if (!open) {
          setOtpCode("");
          setOtpError("");
        }
      }}>
        <DialogContent className="sm:max-w-[340px] bg-card border border-border text-foreground font-sans p-5 rounded-xl shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm font-bold text-foreground">Workspace Access Verification</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              A 6-digit OTP code has been sent to confirm access to workspace <strong className="text-foreground font-semibold">{switchingWorkspace?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOtpVerify} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="access-otp" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Verification Code
              </label>
              <Input
                id="access-otp"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="h-9 text-center tracking-widest text-sm font-bold bg-background border-border focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary rounded-lg"
                disabled={verifyingOtp}
              />
              {otpError && (
                <p className="text-[10px] text-destructive mt-1 font-semibold">{otpError}</p>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOtpModalOpen(false)}
                className="py-1.5 h-8 text-[11px] flex-1 cursor-pointer rounded-lg"
                disabled={verifyingOtp}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground py-1.5 h-8 text-[11px] flex-1 cursor-pointer font-bold rounded-lg"
                disabled={verifyingOtp || otpCode.length < 6}
              >
                {verifyingOtp ? "Verifying..." : "Confirm Access"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
