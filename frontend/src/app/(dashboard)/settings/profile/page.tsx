"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { 
  User, 
  GitBranch, 
  Globe, 
  Mail, 
  Shield, 
  Award, 
  Save, 
  Database, 
  Workflow, 
  Coins, 
  KeyRound, 
  Lock
} from "lucide-react";
import BecomeProviderCard from "@/components/dashboard/BecomeProviderCard";
import { PageHeader } from "@/components/ui/page-header";
import { useMyProfile, derivePlatformRoleLabel } from "@/hooks/use-my-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";

/**
 * Settings Page: Profile & Role (Customizable GitHub-like visual layout).
 */
export default function ProfileSettingsPage() {
  const { data: session } = useSession();
  const { profile } = useMyProfile();
  const userEmail = session?.user?.email || "user@qantara.ai";
  const platformRole = derivePlatformRoleLabel(profile);

  // Profile states
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDisplayName(localStorage.getItem("qantara_profile_display_name") || "Developer Elite");
      setBio(localStorage.getItem("qantara_profile_bio") || "Full-stack AI developer serving automated pipelines & LLM fine-tunes.");
      setGithubUrl(localStorage.getItem("qantara_profile_github") || "https://github.com/qantara-dev");
      setWebsiteUrl(localStorage.getItem("qantara_profile_website") || "https://qantara.ai");
    }
  }, []);

  const handleSaveProfile = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem("qantara_profile_display_name", displayName);
      localStorage.setItem("qantara_profile_bio", bio);
      localStorage.setItem("qantara_profile_github", githubUrl);
      localStorage.setItem("qantara_profile_website", websiteUrl);
      setSaving(false);
      toast.success("Developer profile updated successfully!");
    }, 600);
  };

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    displayName || userEmail
  )}&background=6366f1&color=fff&size=200&bold=true`;

  return (
    <div className="relative space-y-6 animate-fade-in text-left font-sans">
      {/* Glow decorations */}
      <div className="glow-spot" />
      <div className="glow-spot-secondary" />

      <PageHeader
        title="Profile & Role"
        icon={<User className="w-5 h-5 text-primary" />}
        description="Your developer identity, workspace capabilities, and account settings."
        className="mb-0"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start relative z-10">
        
        {/* Left Column: Developer Identity Card (GitHub-inspired preview) */}
        <div className="lg:col-span-1 space-y-5">
          <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-xs rounded-xl overflow-hidden premium-card p-0">
            <div className="bg-secondary/30 h-20 w-full border-b border-border/50 relative select-none">
              <div className="absolute -bottom-10 left-5">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-card bg-popover shadow-md shrink-0 transition-transform hover:scale-105 duration-350">
                  <Image src={avatarUrl} alt="Avatar" width={80} height={80} priority />
                </div>
              </div>
            </div>

            <div className="pt-12 px-5 pb-5 space-y-4">
              <div className="space-y-1">
                <h3 className="font-extrabold text-foreground text-sm tracking-tight">{displayName || "Anonymous Developer"}</h3>
                <p className="text-[10px] text-muted-foreground font-mono">{userEmail}</p>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label htmlFor="display-name" className="form-label select-none">Display Name</label>
                  <Input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter display name"
                    className="h-9 text-xs bg-background/50 border-border focus:ring-primary/10 transition-all font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="bio-text" className="form-label select-none">Developer Bio</label>
                  <Textarea
                    id="bio-text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about your AI projects..."
                    rows={3}
                    className="text-xs bg-background/50 border-border resize-none focus:ring-primary/10 transition-all font-medium leading-relaxed"
                  />
                </div>

                <div className="space-y-3 pt-3 border-t border-border/40">
                  <div className="flex items-center gap-2 text-xs">
                    <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      type="text"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="GitHub Link"
                      className="h-8 text-[11px] bg-background/30 border-border font-medium font-sans"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      type="text"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="Portfolio / Site"
                      className="h-8 text-[11px] bg-background/30 border-border font-medium font-sans"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full h-9 text-xs font-bold font-mono gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground hover-lift active-shrink transition-all shadow-sm rounded-lg"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </Card>

          {/* Badges Widget */}
          <Card className="border border-border/80 bg-card/65 backdrop-blur-md shadow-xs p-5 rounded-xl space-y-3.5 premium-card">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-widest select-none">
              <Award className="w-4 h-4 text-primary" />
              <span>Developer Badges</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 text-[9px] font-bold rounded-md bg-primary/10 border border-primary/20 text-primary">
                Early Access
              </span>
              <span className="px-2.5 py-1 text-[9px] font-bold rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                Verified Publisher
              </span>
              <span className="px-2.5 py-1 text-[9px] font-bold rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                AI Builder
              </span>
            </div>
          </Card>
        </div>

        {/* Right Column: Account Specs & Developer Metrics */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Quick Metrics Dashboard */}
          <div className="grid grid-cols-3 gap-4.5">
            <Card className="border border-border/80 bg-card/60 backdrop-blur-md p-5 rounded-xl shadow-xs text-left hover-lift transition-all duration-200">
              <div className="flex justify-between items-start select-none">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Models</span>
                <Database className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xl font-black text-foreground mt-2.5 font-mono">12</p>
            </Card>

            <Card className="border border-border/80 bg-card/60 backdrop-blur-md p-5 rounded-xl shadow-xs text-left hover-lift transition-all duration-200">
              <div className="flex justify-between items-start select-none">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Pipelines</span>
                <Workflow className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-xl font-black text-foreground mt-2.5 font-mono">4</p>
            </Card>

            <Card className="border border-border/80 bg-card/60 backdrop-blur-md p-5 rounded-xl shadow-xs text-left hover-lift transition-all duration-200">
              <div className="flex justify-between items-start select-none">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Balance</span>
                <Coins className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl font-black text-foreground mt-2.5 font-mono">4.2K</p>
            </Card>
          </div>

          {/* Account System Credentials Card */}
          <Card className="border border-border/80 bg-card/65 backdrop-blur-md p-5 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4 select-none">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-xs">Credentials & Access Roles</h2>
                <p className="text-[10px] text-muted-foreground">Your account type and static access privileges</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="form-label select-none">Auth Email Address</label>
                <div className="relative">
                  <Input
                    type="text"
                    value={userEmail}
                    readOnly
                    className="h-9.5 text-xs bg-secondary/40 border-border text-muted-foreground cursor-not-allowed pl-9 font-mono font-medium"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="form-label select-none">Platform Privileges</label>
                <div className="relative">
                  <Input
                    type="text"
                    value={platformRole}
                    readOnly
                    className="h-9.5 text-xs bg-secondary/40 border-border text-muted-foreground cursor-not-allowed pl-9 font-mono font-medium"
                  />
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                </div>
              </div>
            </div>
          </Card>

          <BecomeProviderCard />

          {/* GitHub-style Danger Zone */}
          <div className="danger-zone border border-red-500/20 bg-red-500/[0.01] rounded-xl overflow-hidden shadow-xs">
            <div className="danger-zone-header p-4.5 border-b border-red-500/10 bg-red-550/[0.02] flex items-center gap-2.5 select-none">
              <Lock className="w-4 h-4 text-red-500 animate-pulse" />
              <div>
                <h3 className="font-bold text-red-500 text-xs">Danger Zone</h3>
                <p className="text-[10px] text-red-500/60 mt-0.5">Destructive actions and security configurations</p>
              </div>
            </div>
            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 text-left">
                <h4 className="text-xs font-bold text-foreground">Rotate API Credentials</h4>
                <p className="text-[10px] text-muted-foreground max-w-md leading-relaxed">
                  Rotating credentials invalidates all current integration tokens for custom developer scripts immediately.
                </p>
              </div>
              <Button
                variant="outline"
                className="h-9 text-xs font-bold font-mono border-dashed border-red-500/30 text-red-500 hover:text-red-650 hover:bg-red-500/10 shrink-0 cursor-pointer hover-lift active-shrink transition-all rounded-lg"
                onClick={() => toast.success("Access tokens queued for rotation. Check email verification.")}
              >
                Rotate Keys
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
