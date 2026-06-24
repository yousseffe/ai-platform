"use client";

import React from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import BecomeProviderCard from "@/components/dashboard/BecomeProviderCard";

/**
 * Settings Page: Profile & Role.
 * Displays the user's account details and model provider enrollment status.
 */
export default function ProfileSettingsPage() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "user@mlhub.ai";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    userEmail
  )}&background=4630eb&color=fff`;

  return (
    <div className="space-y-5 animate-fade-in text-left">
      <div className="card p-5 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4 mb-4 select-none">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-border shrink-0">
            <Image src={avatarUrl} alt="Avatar" width={40} height={40} />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-xs">Account Profile</h2>
            <p className="text-[10px] text-muted-foreground">Your registered platform account details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Email Address</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-muted-foreground cursor-not-allowed outline-none"
              value={userEmail}
              readOnly
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Platform Role</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-muted-foreground cursor-not-allowed outline-none"
              value="Platform Developer"
              readOnly
            />
          </div>
        </div>
      </div>

      <BecomeProviderCard />
    </div>
  );
}
