"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sun, Moon, Sparkles, ArrowRight, Menu, X } from "lucide-react";
import { Session } from "next-auth";
import { Button } from "@/components/ui/button";

interface PublicHeaderProps {
  session: Session | null;
}

/**
 * PublicHeader Component.
 * Implements client-side public header, theme toggling,
 * responsive mobile navigation drawers, and session access.
 */
export default function PublicHeader({ session }: PublicHeaderProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  const userEmail = session?.user?.email || "User";
  const avatarUrl =
    session?.user?.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userEmail
    )}&background=4630eb&color=fff`;

  return (
    <header className="h-14 bg-card/90 backdrop-blur-md border-b border-border flex items-center justify-between px-6 md:px-12 shrink-0 sticky top-0 z-40 shadow-sm relative font-sans">
      {/* Glowing bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

      {/* Brand Logo & Info */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="w-7 h-7 relative flex items-center justify-center shrink-0">
            <Image
              src="/qantara-assets/dark-normal.svg"
              alt="Qantara Logo"
              width={26}
              height={26}
              className="object-contain hidden dark:block"
            />
            <Image
              src="/qantara-assets/light-normal.svg"
              alt="Qantara Logo"
              width={26}
              height={26}
              className="object-contain block dark:hidden"
            />
          </div>
          <span className="font-sans text-sm font-bold text-foreground tracking-tight">Qantara</span>
        </Link>

        {/* AI Gateway active pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-secondary border border-border rounded-full text-[9px] font-bold text-muted-foreground select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>GATEWAY API: ACTIVE</span>
        </div>
      </div>

      {/* Center navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted-foreground select-none">
        <Link href="/explore" className="hover:text-foreground transition-colors flex items-center gap-1">
          Models Marketplace <Sparkles className="w-3 h-3 text-primary animate-pulse" />
        </Link>
        <Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link>
        <span className="hover:text-foreground cursor-pointer transition-colors">Pricing</span>
      </nav>

      {/* Action buttons & Switcher */}
      <div className="hidden md:flex items-center gap-3">
        {/* Light/Dark mode switcher */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground cursor-pointer h-8 w-8 hover:bg-secondary rounded-lg transition-colors"
          title={!mounted || theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {!mounted || theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </Button>

        {session ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              Console Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="w-7 h-7 rounded-full bg-muted overflow-hidden border border-border cursor-pointer block relative hover:opacity-85 transition-opacity"
              title={userEmail}
            >
              <Image
                src={avatarUrl}
                alt="User avatar"
                width={28}
                height={28}
                className="object-cover"
              />
            </Link>
          </div>
        ) : (
          <>
            <Link
              href="/login"
              className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-primary hover:bg-primary/95 text-white py-1.5 px-3.5 text-xs font-bold rounded-lg flex items-center gap-1 hover:shadow-sm transition-all cursor-pointer"
            >
              Get Started <ArrowRight className="w-3 h-3" />
            </Link>
          </>
        )}
      </div>

      {/* Mobile control toggle buttons */}
      <div className="flex md:hidden items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground cursor-pointer h-8 w-8 hover:bg-secondary rounded-lg transition-colors"
          title={!mounted || theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {!mounted || theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-muted-foreground hover:text-foreground cursor-pointer h-8 w-8 hover:bg-secondary rounded-lg transition-colors"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Mobile navigation drawer menu */}
      {mobileMenuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-card border-b border-border shadow-xl p-5 flex flex-col gap-4 md:hidden animate-slide-down z-50">
          <nav className="flex flex-col gap-3.5 text-sm font-semibold text-muted-foreground">
            <Link
              href="/explore"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              Models Marketplace <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            </Link>
            <Link
              href="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-foreground transition-colors"
            >
              Documentation
            </Link>
            <span
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-foreground cursor-pointer transition-colors"
            >
              Pricing
            </span>
          </nav>
          
          <div className="border-t border-border pt-4 flex flex-col gap-2">
            {session ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-border">
                    <Image
                      src={avatarUrl}
                      alt="User avatar"
                      width={28}
                      height={28}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground truncate">{userEmail}</span>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg text-xs font-semibold transition-all cursor-pointer block"
                >
                  Console Dashboard
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg text-xs font-semibold transition-all cursor-pointer block"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center bg-primary hover:bg-primary/95 text-white py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 hover:shadow-sm transition-all cursor-pointer block"
                >
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
