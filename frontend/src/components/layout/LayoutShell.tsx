"use client";

import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Session } from "next-auth";

interface LayoutShellProps {
  session: Session | null;
  children: React.ReactNode;
}

export default function LayoutShell({ session, children }: LayoutShellProps) {
  return (
    <div className="flex min-h-screen bg-main">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header session={session} />
        <main className="flex-1 overflow-y-auto p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
