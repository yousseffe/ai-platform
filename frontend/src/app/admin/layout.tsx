import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Shield, Server, ArrowLeft, LogOut } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Custom Admin Portal Layout.
 * Excludes workspace selector controls, credit balances, and developer options
 * to present a focused system console frame with its own custom sidebar and header.
 *
 * @param props - Layout props containing the page children.
 * @returns The rendered Admin Portal Layout.
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const isAdmin = session?.user?.email?.toLowerCase().includes("admin");
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const userEmail = session.user.email;
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    userEmail
  )}&background=6366f1&color=fff`;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Exclusive Premium Admin Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Branding */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center gap-3 select-none">
          <Shield className="w-6 h-6 text-indigo-400" />
          <span className="font-mono text-base font-extrabold tracking-wider text-slate-100">
            MLHub <span className="text-indigo-400 text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-900 ml-1">Admin</span>
          </span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-6 px-4 space-y-4">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 font-mono select-none">
              Management Console
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold font-mono bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 cursor-default select-none">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>Platform Core</span>
              </div>
              
              <p className="text-[10px] text-slate-500 pl-10 pr-2 leading-relaxed select-none">
                Managing active inference containers, global pricing rates, and transaction ledgers.
              </p>
            </div>
          </div>
        </nav>

        {/* Exit Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-105 hover:text-slate-100 hover:bg-slate-800/80 transition-all font-mono"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Developer Hub</span>
          </Link>

          <Link
            href="/api/auth/signout"
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all font-mono"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span>Sign Out</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Custom Admin Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 shrink-0 bg-slate-900/40 backdrop-blur-md relative z-20">
          <div className="font-bold text-slate-400 tracking-wide text-[10px] uppercase tracking-widest font-mono select-none">
            System Console / Core Administration
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 select-none">
              <div className="w-7 h-7 rounded-full bg-slate-850 overflow-hidden border border-slate-750">
                <Image
                  src={avatarUrl}
                  alt="Admin avatar"
                  width={28}
                  height={28}
                />
              </div>
              <span className="text-xs font-mono text-slate-300 font-bold max-w-[150px] truncate" title={userEmail}>
                {userEmail.split("@")[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Content Main Body */}
        <main className="flex-1 overflow-y-auto p-8 animate-fade-in bg-slate-950 text-slate-100">
          {children}
        </main>
      </div>
    </div>
  );
}
