"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Shield,
  Server,
  LogOut,
  LayoutGrid,
  Users,
  Cpu,
  Sliders,
  ScrollText,
  Bell,
  Bot,
  ShieldAlert,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";


interface SidebarLinkProps {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Sidebar link component displaying active indicators for paths.
 * 
 * @param props - Component props including href, active state, icon, and label.
 * @returns React node for navigation link.
 */
function SidebarLink({ href, active, icon, children }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium transition-all text-sm select-none ${
        active
          ? "bg-primary/8 text-primary font-semibold shadow-sm"
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
 * Custom Admin Portal Sidebar component.
 * Exposes core administration sub-routing links including overview stats,
 * serverless deployment, user management, models, and configuration.
 *
 * @returns React node rendering the admin sidebar dashboard.
 */
export default function AdminSidebar() {
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col shrink-0">
      {/* Branding Header */}
      <div className="h-16 px-6 border-b border-border flex items-center gap-2.5 select-none bg-secondary/5 backdrop-blur-xs">
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
        <span className="font-sans text-sm font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
          MLHub
          <span className="text-primary text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 font-bold font-mono">
            ADMIN
          </span>
        </span>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 py-6 px-4 space-y-4 font-sans overflow-y-auto">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2 font-mono select-none">
          System Console
        </div>

        <div className="space-y-1">
          <SidebarLink href="/admin" active={pathname === "/admin"} icon={<LayoutGrid className="w-4 h-4" />}>
            <span>Overview Dashboard</span>
          </SidebarLink>

          <SidebarLink href="/admin/deployments" active={pathname === "/admin/deployments"} icon={<Server className="w-4 h-4" />}>
            <span>Active Deployments</span>
          </SidebarLink>

          <SidebarLink href="/admin/users" active={pathname === "/admin/users"} icon={<Users className="w-4 h-4" />}>
            <span>User Registry</span>
          </SidebarLink>

          <SidebarLink href="/admin/models" active={pathname === "/admin/models"} icon={<Cpu className="w-4 h-4" />}>
            <span>Model Registry</span>
          </SidebarLink>

          <SidebarLink href="/admin/config" active={pathname === "/admin/config"} icon={<Sliders className="w-4 h-4" />}>
            <span>System Config</span>
          </SidebarLink>

          <SidebarLink href="/admin/logs" active={pathname === "/admin/logs"} icon={<ScrollText className="w-4 h-4" />}>
            <span>System Logs</span>
          </SidebarLink>

          <SidebarLink href="/admin/alerts" active={pathname === "/admin/alerts"} icon={<Bell className="w-4 h-4" />}>
            <span>System Alerts</span>
          </SidebarLink>
        </div>

        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mt-4 mb-2 font-mono select-none">
          Intelligence
        </div>

        <div className="space-y-1">
          <SidebarLink href="/admin/mcp" active={pathname.startsWith("/admin/mcp")} icon={<Bot className="w-4 h-4" />}>
            <span>MCP Agent Console</span>
          </SidebarLink>

          <SidebarLink href="/admin/fraud" active={pathname === "/admin/fraud"} icon={<ShieldAlert className="w-4 h-4" />}>
            <span>Fraud & Security</span>
          </SidebarLink>
        </div>
      </nav>

      {/* Exit Actions */}
      <div className="p-4 border-t border-border font-sans">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-bold text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-all font-mono border-none bg-transparent text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-500" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Sign Out Confirmation Modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="sm:max-w-85 bg-card border border-border text-foreground font-sans p-5 rounded-xl shadow-xl">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-sm font-bold text-foreground">Confirm Sign Out</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to log out from the platform admin console?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2.5 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLogoutModal(false)}
              className="py-1.5 h-8 text-[11px] flex-1 cursor-pointer rounded-lg border border-border hover:bg-secondary text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                await signOut({ callbackUrl: "/login" });
              }}
              className="bg-red-500 hover:bg-red-600 text-white py-1.5 h-8 text-[11px] flex-1 cursor-pointer font-bold rounded-lg border-none"
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
