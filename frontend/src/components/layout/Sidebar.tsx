"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
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
} from "lucide-react";
import { useWorkspace, Workspace } from "@/hooks/use-workspace";
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

/**
 * Platform navigation Sidebar component.
 * Integrates Shadcn Dropdown switcher for workspaces, dual role layout toggles,
 * active status details, and OTP verification challenge overlays.
 * Styled in the premium Expo Go console theme.
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
    isProviderModeEnabled,
    triggerWorkspaceSwitch,
    confirmWorkspaceSwitch,
    isOtpModalOpen,
    setOtpModalOpen,
    switchingWorkspace,
    setViewMode,
    isAdmin,
  } = useWorkspace();

  const [otpCode, setOtpCode] = React.useState("");
  const [otpError, setOtpError] = React.useState("");
  const [verifyingOtp, setVerifyingOtp] = React.useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const linkClass = (path: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all text-xs ${
      isActive(path)
        ? "bg-primary/10 text-primary font-semibold shadow-sm"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;

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
        <Link href="/dashboard" className="flex items-center gap-2 text-primary font-bold text-sm tracking-tight">
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
          <DropdownMenuTrigger className="w-full flex items-center justify-between p-2 h-9 rounded-lg border border-border bg-background hover:bg-secondary hover:text-foreground transition-all cursor-pointer text-left focus:outline-none text-[11px] font-sans">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center shrink-0">
                {activeWorkspace ? getWorkspaceInitials(activeWorkspace.name) : "ML"}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[11px] font-semibold text-foreground truncate leading-none">
                  {activeWorkspace ? activeWorkspace.name : "Loading..."}
                </span>
                <span className="text-[8px] text-muted-foreground font-medium tracking-wide mt-0.5 uppercase">
                  {activeWorkspace?.type === OwnerType.USER ? "Personal" : `Org • ${activeWorkspace?.role}`}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-[216px] mt-1 bg-card border border-border shadow-xl rounded-lg p-1 flex flex-col gap-0.5 max-h-[240px] overflow-y-auto z-40 text-foreground font-sans">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                Organizations
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border my-0.5" />
              {workspaces.map((ws: Workspace) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => triggerWorkspaceSwitch(ws)}
                  className={`w-full flex items-center gap-2 p-1.5 rounded-md text-left text-xs transition-colors hover:bg-secondary cursor-pointer ${
                    activeWorkspace?.id === ws.id ? "bg-primary/5 font-semibold text-primary" : ""
                  }`}
                >
                  <div className="w-5 h-5 rounded bg-muted text-muted-foreground font-bold text-[9px] flex items-center justify-center shrink-0">
                    {getWorkspaceInitials(ws.name)}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-foreground text-xs truncate leading-none">{ws.name}</span>
                    <span className="text-[7px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                      {ws.type === OwnerType.USER ? "Personal" : ws.role}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border my-1" />
            <DropdownMenuItem className="p-0">
              <Link
                href="/workspaces/create"
                className="w-full flex items-center gap-2 p-1.5 rounded-md text-left text-xs font-semibold text-primary hover:bg-primary/5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create Organization
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Role view toggle (Consumer Mode vs Provider Mode) */}
      {isProviderModeEnabled && (
        <div className="px-3 py-2 border-b border-border bg-secondary/30 flex flex-col gap-1.5">
          <div className="flex bg-muted rounded-md p-0.5 border border-border/50">
            <button
              onClick={() => setViewMode(WalletType.CONSUMER)}
              className={`flex-1 py-1 rounded text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === WalletType.CONSUMER
                  ? "bg-card text-primary shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Coins className="w-3 h-3" /> Consumer
            </button>
            <button
              onClick={() => setViewMode(WalletType.PROVIDER)}
              className={`flex-1 py-1 rounded text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === WalletType.PROVIDER
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="w-3 h-3" /> Provider
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          <LayoutGrid className="w-4 h-4" />
          Dashboard Overview
        </Link>

        {isAdmin && (
          <Link href="/admin" className={linkClass("/admin")}>
            <Shield className="w-4 h-4" />
            Admin Console
          </Link>
        )}

        {viewMode === WalletType.PROVIDER && (
          <Link href="/models" className={linkClass("/models")}>
            <Layers className="w-4 h-4" />
            Models Registry
          </Link>
        )}

        <Link href="/settings" className={linkClass("/settings")}>
          <Settings className="w-4 h-4" />
          Workspace Settings
        </Link>
      </div>

      {/* Ledger widget */}
      <div className="px-3 pb-3">
        {viewMode === WalletType.PROVIDER ? (
          <Link href="/models/upload" className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg font-semibold transition-all w-full shadow-sm text-xs cursor-pointer">
            + Publish Model
          </Link>
        ) : (
          <div className="border border-border rounded-lg p-2.5 bg-secondary/20 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Credits Balance</p>
                <p className="text-sm font-bold text-foreground mt-0.5">${balance.toFixed(2)}</p>
              </div>
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center py-1 bg-background hover:bg-secondary border border-border text-foreground rounded-md text-[10px] font-bold transition-all cursor-pointer shadow-sm"
            >
              Top Up Credits
            </Link>
          </div>
        )}
      </div>

      {/* Footer Links */}
      <div className="p-2 border-t border-border flex flex-col gap-0.5 bg-secondary/10">
        <button className="flex items-center gap-2.5 px-3 py-1.5 rounded-md font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors w-full text-left cursor-pointer text-xs">
          <BookOpen className="w-4 h-4" />
          Documentation
        </button>
        <button className="flex items-center gap-2.5 px-3 py-1.5 rounded-md font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors w-full text-left cursor-pointer text-xs">
          <HelpCircle className="w-4 h-4" />
          Support
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-md font-medium text-red-500 hover:bg-red-500/10 dark:hover:bg-red-950/20 transition-colors w-full text-left mt-1 cursor-pointer text-xs"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
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
