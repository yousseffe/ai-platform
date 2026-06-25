import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import React from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";
import AdminHeader from "@/components/layout/AdminHeader";

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

  const userEmail = session.user.email || "";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    userEmail
  )}&background=6366f1&color=fff`;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Exclusive Premium Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Custom Admin Header */}
        <AdminHeader userEmail={userEmail} avatarUrl={avatarUrl} />

        {/* Content Main Body */}
        <main className="flex-1 overflow-y-auto p-8 animate-fade-in bg-background text-foreground">
          {children}
        </main>
      </div>
    </div>
  );
}
