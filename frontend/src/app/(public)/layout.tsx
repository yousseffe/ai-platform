import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import Link from "next/link";
import Image from "next/image";
import PublicHeader from "@/components/layout/PublicHeader";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicHeader session={session} />
      <main className="flex-1 overflow-y-auto w-full flex flex-col justify-between">
        <div className="w-full">
          {children}
        </div>
        
        {/* Professional Platform Footer */}
        <footer className="bg-card/45 border-t border-border mt-16 pt-16 pb-8 px-6 md:px-12 relative overflow-hidden shrink-0">
          {/* Glowing top line divider */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
          {/* Subtle background glow */}
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
            {/* Column 1: Brand/Identity */}
            <div className="md:col-span-4 space-y-4">
              <Link href="/" className="flex items-center gap-2.5 text-primary font-bold text-lg tracking-tight hover:opacity-90 transition-opacity">
                <div className="w-7 h-7 relative flex items-center justify-center shrink-0">
                  <Image
                    src="/logo.png"
                    alt="MLHub Logo"
                    width={26}
                    height={26}
                    className="object-contain"
                  />
                </div>
                <span className="font-mono text-base font-extrabold text-foreground tracking-tight">MLHub</span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                The serverless model registry and automated execution environment. Scans, containerizes, and deploys machine learning models to production-ready sandbox endpoints instantly.
              </p>
              {/* Live nodes stats indicator */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-[9px] font-bold text-muted-foreground select-none font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>COMPUTE NODES: 2,408 LIVE</span>
              </div>
            </div>

            {/* Column 2: Classes */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-1">Model Classes</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/explore?category=LLM_GGUF" className="hover:text-primary transition-colors">Generative AI & LLMs</Link>
                </li>
                <li>
                  <Link href="/explore?category=VISION" className="hover:text-primary transition-colors">Computer Vision</Link>
                </li>
                <li>
                  <Link href="/explore?category=TABULAR" className="hover:text-primary transition-colors">Tabular & Analytics</Link>
                </li>
                <li>
                  <Link href="/explore?category=NLP" className="hover:text-primary transition-colors">Natural Language</Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Resources */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-1">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="/CLAUDE.md" className="hover:text-primary transition-colors">Platform Docs</a>
                </li>
                <li>
                  <span className="hover:text-primary cursor-pointer transition-colors">MLHub SDK (Python)</span>
                </li>
                <li>
                  <span className="hover:text-primary cursor-pointer transition-colors">Container Spec</span>
                </li>
                <li>
                  <span className="hover:text-primary cursor-pointer transition-colors">Sandbox Health Matrix</span>
                </li>
              </ul>
            </div>

            {/* Column 4: Platform Security & Compliance */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-1">System Trust</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 px-2.5 py-1 rounded w-fit select-none font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Scanned Secure</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Each uploaded bundle undergoes static analysis and sandbox security threat screening before execution.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="max-w-7xl mx-auto pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[9px] text-muted-foreground">
            <div>
              &copy; {new Date().getFullYear()} ModelOps MLHub Inc. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <span className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-foreground cursor-pointer transition-colors">Contact</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
