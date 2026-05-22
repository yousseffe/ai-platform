"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutGrid,
  Layers,
  Settings,
  BookOpen,
  HelpCircle,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

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
    `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
      isActive(path)
        ? "bg-primary-50 text-primary-600"
        : "text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <div className="w-64 bg-sidebar border-r border-slate-200 flex flex-col h-screen shrink-0">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-transparent">
        <Link href="/" className="flex items-center gap-2 text-primary-600 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          ModelOps AI
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-3 flex flex-col gap-1">
        <Link href="/" className={linkClass("/")}>
          <LayoutGrid className="w-5 h-5" />
          Dashboard
        </Link>

        <Link href="/models" className={linkClass("/models")}>
          <Layers className="w-5 h-5" />
          Models
        </Link>

        <Link href="/settings" className={linkClass("/settings")}>
          <Settings className="w-5 h-5" />
          Settings
        </Link>
      </div>

      <div className="px-6 pb-6">
        <Link
          href="/models/upload"
          className="btn-primary w-full shadow-sm shadow-primary-500/20"
        >
          + Deploy Model
        </Link>
      </div>

      {/* Footer Links */}
      <div className="p-4 border-t border-slate-100 flex flex-col gap-1">
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-slate-500 hover:bg-slate-50 transition-colors w-full text-left cursor-pointer">
          <BookOpen className="w-5 h-5" />
          Documentation
        </button>
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-slate-500 hover:bg-slate-50 transition-colors w-full text-left cursor-pointer">
          <HelpCircle className="w-5 h-5" />
          Support
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-red-500 hover:bg-red-50 transition-colors w-full text-left mt-2 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
