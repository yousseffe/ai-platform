"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Copy,
  Check,
  ChevronRight,
  ShieldAlert,
  Cpu,
  Coins,
  Activity,
  Key,
  Layers,
  Terminal,
  ExternalLink,
  Info,
  Menu,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";

interface DocSection {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function DocsClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("intro");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Code snippet copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const docSections = useMemo<DocSection[]>(() => [
    {
      id: "intro",
      category: "Getting Started",
      title: "Platform Overview",
      subtitle: "Introduction to AI Platform Governance & Prediction Marketplace",
      icon: <BookOpen className="h-4.5 w-4.5 text-primary" />,
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
          <p>
            Welcome to the official developer documentation for the **AI Platform Governance & Prediction Marketplace**. 
            This decentralized system acts as a unified hub for hosting, sandboxing, executing, and auditing machine learning models.
          </p>
          <p>
            The platform is designed around two primary workspace modes operating on top of a secure, multi-tenant database:
          </p>
          <div className="grid gap-4 sm:grid-cols-2 mt-2">
            <Card className="border border-slate-200 dark:border-border bg-slate-50 dark:bg-secondary/15">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-purple-500" />
                  <span className="font-bold text-slate-800 dark:text-foreground">Consumer Workspace</span>
                </div>
                <p className="text-xs">
                  Allows app developers to configure projects, generate restricted API keys, allocate credit spend limits, and dispatch low-latency inference queries to published marketplace models.
                </p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 dark:border-border bg-slate-50 dark:bg-secondary/15">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-500" />
                  <span className="font-bold text-slate-800 dark:text-foreground">Provider Workspace</span>
                </div>
                <p className="text-xs">
                  Allows AI publishers and research teams to upload containerized models, configure billing/token pricing tables, setup validation suites, and collect EGP revenue conversions.
                </p>
              </CardContent>
            </Card>
          </div>
          <p className="pt-2">
            By enforcing rigorous **governance review checklists**, automatic **schema structure validation**, and an integrated **API Firewall**, the marketplace provides a highly scalable and secure environment for model deployment.
          </p>
        </div>
      ),
    },
    {
      id: "workspaces",
      category: "Getting Started",
      title: "Workspace Modes",
      subtitle: "Understanding Consumer, Provider, and Hybrid Environments",
      icon: <Layers className="h-4.5 w-4.5 text-blue-500" />,
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
          <p>
            Organizations are categorized into one of three structural profiles. Your workspace capabilities will adapt based on the selected mode:
          </p>
          <ul className="space-y-3.5 list-none pl-0">
            <li className="flex items-start gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 mt-2" />
              <div>
                <strong className="text-slate-800 dark:text-foreground">Consumer Mode (App Workspaces)</strong>: Focuses on model consumption. 
                Users create client applications (Projects), fund a shared credit wallet, and monitor API keys. Rate limiters and spend caps protect projects from unexpected usage spikes.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
              <div>
                <strong className="text-slate-800 dark:text-foreground">Provider Mode (Publisher Registry)</strong>: Focuses on model publishing. 
                Users manage the development lifecycle, view audit evaluation test results, submit version promotions, and track EGP wallet conversions.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0 mt-2" />
              <div>
                <strong className="text-slate-800 dark:text-foreground">Hybrid Mode (Dual Governance)</strong>: Combines consumer and provider capabilities. 
                Perfect for large enterprises that publish proprietary AI services and consume third-party models from the same unified workspace.
              </div>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "registry",
      category: "Model Publishing",
      title: "Registry & Sandbox",
      subtitle: "Uploader Lifecycles, Binary Syncing, and MinIO storage",
      icon: <Cpu className="h-4.5 w-4.5 text-emerald-500" />,
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
          <p>
            Model uploaders register new models by creating draft version records. The lifecycle follows strict sandbox stages:
          </p>
          <div className="border border-slate-200 dark:border-border rounded-lg overflow-hidden bg-white dark:bg-card text-xs shadow-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-border bg-slate-50 dark:bg-secondary/35 font-semibold text-slate-700 dark:text-muted-foreground">
                  <th className="px-4 py-2.5">Version Status</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5">Evaluation Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-border/60">
                <tr>
                  <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-foreground">DRAFT</td>
                  <td className="px-4 py-2.5">Version registered in database. Metadata and files being uploaded.</td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-muted-foreground">Not executable</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-bold text-blue-500">BUILDING</td>
                  <td className="px-4 py-2.5">isolated container image being built with Alpine-based dependencies.</td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-muted-foreground">Running build logs</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-bold text-emerald-500">READY</td>
                  <td className="px-4 py-2.5">Docker container is running in sandboxed environment, listening for connections.</td>
                  <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-500 font-semibold">Available for sandbox tests</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-bold text-red-500">FAILED</td>
                  <td className="px-4 py-2.5">Container build or schema validation failed during integration.</td>
                  <td className="px-4 py-2.5 text-red-600 dark:text-red-500 font-semibold">Review crash reports</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="pt-2">
            Uploaded binaries (Pickles, Weights, Configs) are synced automatically to **MinIO Object Storage** under nested paths:
          </p>
          <div className="bg-slate-100 dark:bg-popover border border-slate-200 dark:border-border rounded-lg p-3 font-mono text-xs text-slate-800 dark:text-foreground flex items-center justify-between">
            <span>organizations/&#123;orgSlug&#125;/models/&#123;modelId&#125;/versions/v&#123;num&#125;/weights.bin</span>
          </div>
        </div>
      ),
    },
    {
      id: "evaluations",
      category: "Model Publishing",
      title: "Test Cases & Evaluators",
      subtitle: "Schema Assertions, Simulator Outputs, and Promoted Reviews",
      icon: <Terminal className="h-4.5 w-4.5 text-amber-500" />,
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
          <p>
            To prevent platform exceptions and runtime prediction errors, every model version must pass the **Evaluation Suite** before maintainers can approve it:
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>Payload Test Cases</strong>: Publishers register sample JSON payloads representing real requests and matching expected output keys.</li>
            <li><strong>Schema Checker</strong>: TypeORM models are automatically parsed, extracting required types, array dimensional structures, and mapping types.</li>
            <li><strong>Assert Checks</strong>: Evaluates whether postprocessing output keys are present in the actual inference payload.</li>
          </ul>

          <div className="space-y-2 mt-4">
            <span className="text-xs font-semibold text-slate-800 dark:text-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-primary" />
              Example Test Case JSON Structure:
            </span>
            <div className="relative group">
              <pre className="bg-slate-100 dark:bg-popover border border-slate-200 dark:border-border rounded-lg p-4 text-[11px] font-mono text-slate-800 dark:text-foreground overflow-x-auto">
{`{
  "name": "Customer Sentiment Evaluation",
  "payload": {
    "text": "The latest sandbox prediction works flawlessly! Low latency.",
    "analysis_level": "verbose"
  },
  "expectedResult": {
    "sentiment": "POSITIVE",
    "score": 0.985
  }
}`}
              </pre>
              <Button
                size="xs"
                variant="outline"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-card"
                onClick={() => handleCopy(`{\n  "name": "Customer Sentiment Evaluation",\n  "payload": {\n    "text": "The latest sandbox prediction works flawlessly! Low latency.",\n    "analysis_level": "verbose"\n  },\n  "expectedResult": {\n    "sentiment": "POSITIVE",\n    "score": 0.985\n  }\n}`, "json-code")}
              >
                {copiedId === "json-code" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "apikeys",
      category: "Model Execution",
      title: "API Keys & Quotas",
      subtitle: "Managing Project Scopes, Spend Caps, and Rate Limiters",
      icon: <Key className="h-4.5 w-4.5 text-purple-500" />,
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
          <p>
            Programmatic connections to the models are managed via **Organization API Keys** (`OrgApiKey`). 
            These keys are strictly scoped to keep your workloads isolated:
          </p>
          <ul className="space-y-2.5 list-none pl-0">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold shrink-0">1.</span>
              <span><strong>Project Isolation</strong>: API keys are bound to a single Project. They cannot be used to modify or read resources of other projects.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold shrink-0">2.</span>
              <span><strong>Spend Limiting Quota</strong>: Protect your credits! Keys have optional daily credit spend limits. If transactions exceed the quota, calls are blocked with a `402 Pay Required` error.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold shrink-0">3.</span>
              <span><strong>Rate Limit Control</strong>: Imposes limits on Requests Per Minute (RPM). Implemented via NestJS throttle guards and a Redis cache token bucket.</span>
            </li>
          </ul>

          <div className="space-y-2 mt-4">
            <span className="text-xs font-semibold text-slate-800 dark:text-foreground flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              Example Programmatic Prediction Dispatch:
            </span>
            <div className="relative group">
              <pre className="bg-slate-100 dark:bg-popover border border-slate-200 dark:border-border rounded-lg p-4 text-[11px] font-mono text-slate-800 dark:text-foreground overflow-x-auto">
{`curl -X POST https://api.governance-marketplace.com/models/v1/predict \\
  -H "Authorization: Bearer org_sk_live_589b2512f4ac" \\
  -H "X-Project-Id: 2c5b78ac-15b9-4ac2-bc89" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "Analyze logs..."}]
  }'`}
              </pre>
              <Button
                size="xs"
                variant="outline"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-card"
                onClick={() => handleCopy(`curl -X POST https://api.governance-marketplace.com/models/v1/predict \\\n  -H "Authorization: Bearer org_sk_live_589b2512f4ac" \\\n  -H "X-Project-Id: 2c5b78ac-15b9-4ac2-bc89" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "messages": [{"role": "user", "content": "Analyze logs..."}]\n  }'`, "curl-code")}
              >
                {copiedId === "curl-code" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "billing",
      category: "Model Execution",
      title: "Ledger Billing & Wallets",
      subtitle: "Credits Conversions, Double-Entry Transactions, and Provider EGP Payouts",
      icon: <Coins className="h-4.5 w-4.5 text-amber-500" />,
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
          <p>
            The platform enforces a mathematically closed billing model via a **Double-Entry Ledger System** in PostgreSQL. 
            All financial activities (credit purchases, query debits, publisher payouts) are audited.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 mt-2">
            <div className="rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-secondary/10 p-3.5 space-y-2">
              <span className="font-bold text-slate-800 dark:text-foreground text-xs block">1. Consumer Wallets (CREDITS)</span>
              <p className="text-xs leading-relaxed">
                App developers purchase credits using Stripe (credit cards, bank transfers). Credit balances are debited per inference run based on model complexity tier charges.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-secondary/10 p-3.5 space-y-2">
              <span className="font-bold text-slate-800 dark:text-foreground text-xs block">2. Provider Wallets (EGP)</span>
              <p className="text-xs leading-relaxed">
                Publishers accumulate EGP balances. When a consumer queries a provider&apos;s model, credits are converted into EGP based on fixed system-wide conversion matrices and payout schedules.
              </p>
            </div>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-500 bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-2 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Transactions must balance to exactly zero: any DEBIT to a consumer wallet must equal a CREDIT to the combined provider revenue ledger and platform maintenance commission wallet.
            </span>
          </p>
        </div>
      ),
    },
    {
      id: "monitoring",
      category: "Platform Administration",
      title: "Telemetry & Firewall",
      subtitle: "OpenTelemetry, Prometheus metrics, and rate anomaly heuristics",
      icon: <Activity className="h-4.5 w-4.5 text-red-500" />,
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
          <p>
            Platform performance, gateway firewall operations, and security logs are continuously monitored through our observability stack:
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>OpenTelemetry Tracing</strong>: Traces inference request flows, mapping latency bottlenecks inside custom container endpoints.</li>
            <li><strong>Prometheus & Grafana</strong>: Gathers system-level statistics including memory leaks, CPU metrics, and TCP active connections.</li>
            <li><strong>Loki & Opensearch Log Routing</strong>: Collects standard outputs, errors, and system audit logs (`ModelLog`).</li>
            <li><strong>Fraud Baselines</strong>: Anomaly detectors check active calls against standard historical footprints, temporarily block key dispatches if risk metrics spike.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "mcp",
      category: "Platform Administration",
      title: "MCP Server Integration",
      subtitle: "Model Context Protocol bindings for distributed tool executions",
      icon: <Cpu className="h-4.5 w-4.5 text-purple-500" />,
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
          <p>
            Our architecture is fully compatible with the **Model Context Protocol (MCP)**, allowing external AI agents, IDE tools, and LLMs to interact with models directly.
          </p>
          <p>
            The backend integrates an MCP proxy server that translates MCP tool calls into validated marketplace prediction requests, enabling agents to:
          </p>
          <ul className="space-y-1.5 list-none pl-0">
            <li className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Discover available marketplace models as tools dynamically.</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Query schema constraints dynamically using MCP schemas.</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Dispatch predictions and read response structures from local IDE agents.</span>
            </li>
          </ul>
        </div>
      ),
    },
  ], [copiedId]);

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return docSections;
    const query = searchQuery.toLowerCase();
    return docSections.filter(
      (section) =>
        section.title.toLowerCase().includes(query) ||
        section.subtitle.toLowerCase().includes(query) ||
        section.category.toLowerCase().includes(query)
    );
  }, [searchQuery, docSections]);

  // Group categories for the sidebar
  const categories = useMemo(() => {
    const map = new Map<string, DocSection[]>();
    docSections.forEach((section) => {
      const current = map.get(section.category) ?? [];
      current.push(section);
      map.set(section.category, current);
    });
    return Array.from(map.entries());
  }, [docSections]);

  const handleSidebarClick = (id: string) => {
    setActiveSection(id);
    setIsMobileMenuOpen(false);
    const element = document.getElementById(`doc-sec-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-foreground relative overflow-hidden transition-colors duration-300">
      {/* Dynamic Background Grids and Accents */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-primary/5 dark:from-primary/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/4 -left-36 w-96 h-96 bg-primary/5 dark:bg-primary/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute top-2/3 -right-36 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        
        {/* Header Block */}
        <header className="border-b border-slate-200 dark:border-border/60 pb-8 mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs text-primary font-bold uppercase tracking-wider">
              <BookOpen className="h-3.5 w-3.5" />
              Developer Docs
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-500 dark:from-foreground dark:via-foreground dark:to-muted-foreground">
              AI Platform Manual
            </h1>
            <p className="text-base text-slate-500 dark:text-muted-foreground max-w-2xl leading-relaxed">
              Explore API specifications, sandboxing execution environments, billing double-entry ledgers, and rate quota controls.
            </p>
          </div>

          {/* Search bar widget */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-muted-foreground" />
            <input
              type="text"
              id="docs-search-input"
              placeholder="Search sections, APIs, guides..."
              className="w-full rounded-xl border border-slate-200 dark:border-border/80 bg-white/70 dark:bg-secondary/20 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 dark:placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                size="xs"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg text-slate-400 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </header>

        {/* Dynamic Sidebar + Content Split */}
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          
          {/* Mobile Menu trigger */}
          <div className="lg:hidden flex items-center justify-between border border-slate-200 dark:border-border bg-white dark:bg-card p-3.5 rounded-xl">
            <span className="text-xs font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Documentation Outline
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="h-8 px-2 flex items-center gap-1.5 bg-white dark:bg-card"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              Menu
            </Button>
          </div>

          {/* Sidebar Navigation */}
          <aside className={`lg:block ${isMobileMenuOpen ? "block" : "hidden"} lg:sticky lg:top-8 shrink-0 self-start`}>
            <nav className="border border-slate-200 dark:border-border/60 bg-white/70 dark:bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto shadow-xs">
              {categories.map(([category, sections]) => (
                <div key={category} className="space-y-2.5">
                  <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-muted-foreground/80 pl-2">
                    {category}
                  </h2>
                  <div className="space-y-1">
                    {sections.map((section) => {
                      const isActive = activeSection === section.id;
                      return (
                        <button
                          key={section.id}
                          id={`docs-nav-link-${section.id}`}
                          onClick={() => handleSidebarClick(section.id)}
                          className={`w-full text-left rounded-xl px-3 py-2 text-xs font-bold transition-all flex items-center gap-2.5 ${
                            isActive
                              ? "bg-primary/10 text-primary border-l-2 border-primary pl-4"
                              : "text-slate-500 dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-secondary/20 hover:text-slate-900 dark:hover:text-foreground pl-3"
                          }`}
                        >
                          <span className="shrink-0">{section.icon}</span>
                          <span className="truncate">{section.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-100 dark:border-border/50 pt-4 mt-6">
                <Link
                  href="/explore"
                  className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-muted-foreground hover:text-primary transition-colors group px-2"
                >
                  <span>Model Marketplace</span>
                  <ExternalLink className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </nav>
          </aside>

          {/* Core Content Outline */}
          <article className="space-y-10 min-w-0">
            {filteredSections.map((section) => (
              <section
                key={section.id}
                id={`doc-sec-${section.id}`}
                className="scroll-mt-10 border border-slate-200 dark:border-border/80 bg-white/50 dark:bg-card/35 backdrop-blur-xs rounded-2xl p-6 md:p-8 space-y-5 hover:border-slate-300 dark:hover:border-border transition-all duration-300 shadow-xs relative group"
              >
                {/* Visual Accent Glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none group-hover:bg-primary/8 transition-colors duration-300" />

                {/* Section Header */}
                <header className="border-b border-slate-100 dark:border-border/50 pb-4 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-secondary/15">
                      {section.icon}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                      {section.category}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-foreground tracking-tight md:text-2xl mt-1">
                    {section.title}
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-muted-foreground">
                    {section.subtitle}
                  </p>
                </header>

                {/* Content Block */}
                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-muted-foreground">
                  {section.content}
                </div>
              </section>
            ))}

            {/* Zero Results Placeholder */}
            {filteredSections.length === 0 && (
              <div className="border border-slate-200 dark:border-border/80 bg-white dark:bg-card p-10 rounded-2xl text-center space-y-4 max-w-lg mx-auto shadow-xs">
                <Search className="h-8 w-8 text-slate-300 dark:text-muted-foreground mx-auto animate-pulse" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-foreground">No matches found</h3>
                <p className="text-xs text-slate-400 dark:text-muted-foreground leading-relaxed">
                  We couldn&apos;t find any documentation matches for &ldquo;{searchQuery}&rdquo;. Try using generic terms like &ldquo;billing&rdquo;, &ldquo;sandbox&rdquo;, or &ldquo;api keys&rdquo;.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="bg-white dark:bg-card"
                >
                  Clear search
                </Button>
              </div>
            )}
          </article>

        </div>
      </main>
    </div>
  );
}
