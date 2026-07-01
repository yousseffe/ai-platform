"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  ArrowRight,
  Sparkles,
  Cpu,
  Layers,
  Globe,
  Flame,
  User,
  ExternalLink,
  ShieldCheck,
  Terminal,
  Play,
  Activity,
  Package,
  Zap,
  Image,
} from "lucide-react";
import { DeploymentStatus } from "@/types";
import type { Model } from "@/types";

interface MarketplaceLandingClientProps {
  publicModels: Model[];
}

const TYPE_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  TABULAR:  { label: "Tabular & Analytics",   color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30",  border: "border-emerald-200 dark:border-emerald-800/40", icon: Layers },
  NLP:      { label: "Natural Language",       color: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-amber-200 dark:border-amber-800/40",   icon: Globe },
  VISION:   { label: "Computer Vision",        color: "text-blue-700 dark:text-blue-400",     bg: "bg-blue-50 dark:bg-blue-950/30",       border: "border-blue-200 dark:border-blue-800/40",     icon: Cpu },
  LLM_GGUF: { label: "Generative AI & LLMs",   color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30",   border: "border-violet-200 dark:border-violet-800/40", icon: Sparkles },
  DIFFUSION: { label: "Stable Diffusion",      color: "text-pink-700 dark:text-pink-400",     bg: "bg-pink-50 dark:bg-pink-950/30",       border: "border-pink-200 dark:border-pink-800/40",     icon: Image },
};

const TYPE_ACCENT: Record<string, string> = {
  TABULAR:  "from-emerald-500 to-teal-500",
  NLP:      "from-amber-500 to-orange-500",
  VISION:   "from-blue-500 to-cyan-500",
  LLM_GGUF: "from-violet-500 to-purple-500",
  DIFFUSION: "from-pink-500 to-rose-500",
};

const FRAMEWORK_LABELS: Record<string, string> = {
  SKLEARN: "Scikit-Learn", PYTORCH: "PyTorch", TENSORFLOW: "TensorFlow",
  ONNX: "ONNX Runtime", LLAMA_CPP: "Llama.cpp", VLLM: "vLLM", CUSTOM: "Custom",
};

const TASK_LABELS: Record<string, string> = {
  CLASSIFICATION: "Classification", REGRESSION: "Regression", GENERATION: "Generation",
  OBJECT_DETECTION: "Object Detection", SEGMENTATION: "Segmentation",
  EMBEDDING: "Embeddings", CHAT: "Chat", OTHER: "Other",
};

const CATEGORIES = [
  {
    id: "LLM_GGUF",
    name: "Generative AI & LLMs",
    desc: "Quantized model architectures ready for instruction following and text generation.",
    icon: Sparkles,
    iconBg: "bg-violet-500/10 dark:bg-violet-950/20",
    iconColor: "text-violet-600 dark:text-violet-400",
    hoverBorder: "hover:border-violet-500/40 hover:shadow-violet-500/5",
    techBadge: "LLM",
    tags: ["GGUF", "Llama.cpp", "Generative"],
    statText: "Quantized weights standard",
    hoverBg: "from-violet-500/5 to-transparent",
    accentBorder: "group-hover:bg-violet-500",
  },
  {
    id: "VISION",
    name: "Computer Vision",
    desc: "Extract insights, classify objects, and run feature detection on images and video.",
    icon: Cpu,
    iconBg: "bg-blue-500/10 dark:bg-blue-950/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    hoverBorder: "hover:border-blue-500/40 hover:shadow-blue-500/5",
    techBadge: "VISION",
    tags: ["PyTorch", "ONNX", "YOLO"],
    statText: "Real-time visual feature parsing",
    hoverBg: "from-blue-500/5 to-transparent",
    accentBorder: "group-hover:bg-blue-500",
  },
  {
    id: "TABULAR",
    name: "Tabular & Analytics",
    desc: "Regression, classification, and forecasting models for structured datasets.",
    icon: Layers,
    iconBg: "bg-emerald-500/10 dark:bg-emerald-950/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    hoverBorder: "hover:border-emerald-500/40 hover:shadow-emerald-500/5",
    techBadge: "TABULAR",
    tags: ["Scikit-Learn", "XGBoost", "Inference"],
    statText: "Optimized for latency < 5ms",
    hoverBg: "from-emerald-500/5 to-transparent",
    accentBorder: "group-hover:bg-emerald-500",
  },
  {
    id: "NLP",
    name: "Natural Language",
    desc: "Sentiment analysis, token extraction, and translation with text encoders.",
    icon: Globe,
    iconBg: "bg-amber-500/10 dark:bg-amber-950/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-amber-500/40 hover:shadow-amber-500/5",
    techBadge: "NLP",
    tags: ["Transformers", "BERT", "Embeddings"],
    statText: "Semantic vectors active",
    hoverBg: "from-amber-500/5 to-transparent",
    accentBorder: "group-hover:bg-amber-500",
  },
];

export default function MarketplaceLandingClient({ publicModels }: MarketplaceLandingClientProps) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";

  const filteredModels = React.useMemo(() => {
    return publicModels.filter((model) => {
      if (q) {
        const query = q.toLowerCase();
        const matchName = model.name.toLowerCase().includes(query);
        const matchDesc = model.description?.toLowerCase().includes(query) || false;
        if (!matchName && !matchDesc) return false;
      }
      if (category) {
        const mType = (model as unknown as Record<string, unknown>).type as string | undefined;
        if (mType !== category) return false;
      }
      return true;
    });
  }, [publicModels, q, category]);

  const trendingModels = [...filteredModels].slice(0, 3);
  const recentlyAdded = [...filteredModels].slice(0, 6);

  useEffect(() => {
    const initGsap = async () => {
      const { gsap } = await import("gsap");
      
      // Set initial hidden state (to prevent visual flashes of animation properties)
      gsap.set([
        ".hero-badge-el",
        ".hero-title-el",
        ".hero-desc-el",
        ".hero-search-el",
        ".hero-fw-el",
        ".code-window-el",
        ".category-title-el",
        ".category-card-el",
        ".featured-title-el",
        ".featured-card-el",
        ".recent-title-el",
        ".recent-card-el",
        ".cta-card-el",
      ], { opacity: 0, y: 15 });

      // Animate Hero section
      const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.6 } });
      tl.to(".hero-badge-el", { opacity: 1, y: 0 })
        .to(".hero-title-el", { opacity: 1, y: 0 }, "-=0.45")
        .to(".hero-desc-el", { opacity: 1, y: 0 }, "-=0.45")
        .to(".hero-search-el", { opacity: 1, y: 0 }, "-=0.45")
        .to(".hero-fw-el", { opacity: 1, y: 0, stagger: 0.06 }, "-=0.4")
        .to(".code-window-el", { opacity: 1, y: 0, duration: 0.8 }, "-=0.8");

      // Continuous 3D Floating tilt loop for the code console
      gsap.to(".code-window-el", {
        rotateY: 8,
        rotateX: -5,
        y: -12,
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        transformStyle: "preserve-3d",
      });


      // Animate Domains category section
      gsap.to([".category-title-el", ".category-card-el"], {
        opacity: 1,
        y: 0,
        stagger: 0.06,
        duration: 0.6,
        delay: 0.5,
        ease: "power2.out",
      });

      // Animate Featured sandboxes section
      gsap.to([".featured-title-el", ".featured-card-el"], {
        opacity: 1,
        y: 0,
        stagger: 0.06,
        duration: 0.6,
        delay: 0.6,
        ease: "power2.out",
      });

      // Animate Recently Added and CTA
      gsap.to([".recent-title-el", ".recent-card-el", ".cta-card-el"], {
        opacity: 1,
        y: 0,
        stagger: 0.06,
        duration: 0.6,
        delay: 0.7,
        ease: "power2.out",
      });
    };

    initGsap();
  }, []);

  return (
    <div className="w-full text-foreground bg-background">
      
      {/* Split Hero Section - 100% Screen Width Bleed */}
      <div className="w-full border-b border-border bg-gradient-to-b from-card/60 via-card/30 to-background/20 relative py-20 md:py-26 px-6 md:px-12 mb-16 overflow-hidden">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.012)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none"></div>
        {/* Colorful Glow Blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/8 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-indigo-500/5 dark:bg-indigo-500/8 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Column: Text & Tech Logos */}
          <div className="lg:col-span-7 relative z-10 flex flex-col items-start text-left">
            {/* Badge — font-mono is correct here, it's a label/tag */}
            <div className="hero-badge-el inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary/10 border border-primary/20 text-primary mb-6 font-mono select-none">
              <Globe className="w-3.5 h-3.5 shrink-0" /> MLOPS INFRASTRUCTURE & REGISTRY
            </div>
            
            {/* Heading — no font-mono, inherits Plus Jakarta Sans */}
            <h1 className="hero-title-el text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.08] mb-6">
              The Serverless <br />
              <span className="bg-gradient-to-r from-primary via-blue-500 to-indigo-500 bg-clip-text text-transparent">Model Registry</span>
            </h1>
            
            {/* Description — no font-mono */}
            <p className="hero-desc-el text-base md:text-lg text-muted-foreground/90 mb-8 font-normal leading-relaxed max-w-2xl">
              Upload pre-trained weights, bundle configurations, and custom scripts. MLHub containerizes, runs security scans, and deploys serverless prediction endpoints instantly.
            </p>

            {/* Search bar inside Hero */}
            <form action="/explore" method="GET" className="hero-search-el w-full max-w-xl mb-6 flex flex-col sm:flex-row items-stretch gap-2 bg-card/40 p-1.5 rounded-2xl border border-border/80 shadow-sm backdrop-blur-md">
              <div className="relative flex-1 flex items-center">
                <Search className="w-4.5 h-4.5 text-muted-foreground/75 absolute left-3.5" />
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Search models (e.g. xgboost, llama)..."
                  className="w-full bg-transparent border-0 rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                />
              </div>
              <button type="submit" className="btn-primary py-3 px-6 text-sm font-semibold cursor-pointer shrink-0 rounded-xl hover:shadow-lg hover:shadow-primary/15 transition-all">
                Search
              </button>
            </form>

            {/* Active search filter chips */}
            {(q || category) && (
              <div className="flex flex-wrap gap-2 mb-10">
                {q && (
                  <Link href={category ? `/explore?category=${category}` : "/explore"} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-all">
                    Search: &ldquo;{q}&rdquo;
                    <span className="opacity-75 hover:opacity-100 font-bold ml-1 font-mono">×</span>
                  </Link>
                )}
                {category && (
                  <Link href={q ? `/explore?q=${q}` : "/explore"} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all">
                    Category: {TYPE_META[category]?.label || category}
                    <span className="opacity-75 hover:opacity-100 font-bold ml-1 font-mono">×</span>
                  </Link>
                )}
                <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted hover:bg-accent border border-border transition-all">
                  Clear All
                </Link>
              </div>
            )}

            {/* AI Framework Logos section */}
            <div className="hero-fw-el border-t border-border/80 pt-6 w-full">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 block mb-4">Supported Frameworks & Engines</span>
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                {/* PyTorch SVG */}
                <div className="flex items-center gap-1.5 bg-card/60 dark:bg-slate-900 border border-border/80 rounded-xl px-3 py-1.5 text-xs font-medium hover:border-primary/20 hover:text-foreground transition-all">
                  <svg className="w-3.5 h-3.5 text-red-500 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                  </svg>
                  <span>PyTorch</span>
                </div>
                
                {/* Hugging Face SVG */}
                <div className="flex items-center gap-1.5 bg-card/60 dark:bg-slate-900 border border-border/80 rounded-xl px-3 py-1.5 text-xs font-medium hover:border-primary/20 hover:text-foreground transition-all">
                  <svg className="w-3.5 h-3.5 text-amber-500 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z"/>
                  </svg>
                  <span>Hugging Face</span>
                </div>

                {/* LLaMA / Meta */}
                <div className="flex items-center gap-1.5 bg-card/60 dark:bg-slate-900 border border-border/80 rounded-xl px-3 py-1.5 text-xs font-medium hover:border-primary/20 hover:text-foreground transition-all">
                  <svg className="w-3.5 h-3.5 text-blue-500 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zM4 12c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8-8 3.58-8 8zm9-3h-2v4h3v-2h-1z"/>
                  </svg>
                  <span>Llama.cpp</span>
                </div>

                {/* ONNX */}
                <div className="flex items-center gap-1.5 bg-card/60 dark:bg-slate-900 border border-border/80 rounded-xl px-3 py-1.5 text-xs font-medium hover:border-primary/20 hover:text-foreground transition-all">
                  <svg className="w-3.5 h-3.5 text-indigo-500 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                  </svg>
                  <span>ONNX</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Code/API Interactive Sandbox (3D Perspective layout) */}
          <div className="lg:col-span-5 relative w-full flex justify-center items-center" style={{ perspective: 1000 }}>
            {/* Code window intentionally uses font-mono — it IS code */}
            <div className="code-window-el w-full rounded-2xl border border-border/90 bg-slate-950 text-slate-200 overflow-hidden font-mono text-[11px] shadow-2xl shadow-primary/5">
              {/* Header tab */}
              <div className="bg-slate-900/90 border-b border-border/60 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">mlhub-sdk.py</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/60 border border-red-500/10"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60 border border-yellow-500/10"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/60 border border-green-500/10"></span>
                </div>
              </div>
              {/* Code Box */}
              <div className="p-5 space-y-2.5 select-none leading-relaxed text-slate-300 font-mono">
                <p><span className="text-pink-400 font-semibold">import</span> mlhub</p>
                <p>client = mlhub.Client(api_key=<span className="text-emerald-400">&quot;ml_sk_live_8f3d...&quot;</span>)</p>
                <p className="text-slate-500 font-normal mt-2"># Spin container & predict instantly</p>
                <p>
                  prediction = client.predict(<br />
                  &nbsp;&nbsp;model=<span className="text-emerald-400">&quot;demand-forecast-v1&quot;</span>,<br />
                  &nbsp;&nbsp;input_data={"{"}<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-orange-300">&quot;transaction_amount&quot;</span>: <span className="text-amber-400">150.25</span>,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-orange-300">&quot;merchant_category&quot;</span>: <span className="text-emerald-400">&quot;retail&quot;</span><br />
                  &nbsp;&nbsp;{"}"}<br />
                  )
                </p>
                <p className="text-pink-400 font-semibold">print(prediction)</p>
              </div>
              {/* Execution Simulated Output */}
              <div className="bg-slate-900/50 border-t border-border/50 p-5 font-mono text-[10px] space-y-1.5 text-slate-400">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Play className="w-3 h-3 fill-current shrink-0" />
                  <span>$ python mlhub-sdk.py</span>
                </div>
                <div className="text-slate-400 pl-5 mt-1 font-mono leading-relaxed">
                  {"{"}<br />
                  &nbsp;&nbsp;<span className="text-orange-300">&quot;status&quot;</span>: <span className="text-emerald-350">&quot;success&quot;</span>,<br />
                  &nbsp;&nbsp;<span className="text-orange-300">&quot;predictions&quot;</span>: [{"{"}<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-orange-300">&quot;class&quot;</span>: <span className="text-emerald-350">&quot;legit&quot;</span>,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-orange-300">&quot;probability&quot;</span>: <span className="text-amber-405">0.985</span><br />
                  &nbsp;&nbsp;{"}"}]<br />
                  {"}"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Page Centered Container */}
      <div className="max-w-7xl mx-auto px-6 md:px-12">

        {/* Categories Grid */}
        <div className="mb-16">
          <div className="category-title-el mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                {/* Small label pills — font-mono is fine here */}
                <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-primary">Core Classifications</span>
              </div>
              {/* Section heading — no font-mono */}
              <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Browse by Domain</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
                Filter catalog templates by core machine learning category classifications and serialization types.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4 bg-slate-50 dark:bg-slate-900 border border-border px-3.5 py-2 rounded-xl text-xs text-muted-foreground shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-foreground font-semibold">4 Engines Active</span>
              </div>
              <span className="text-muted-foreground/60">|</span>
              <span>Deployable Sandbox Endpoints</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.id}
                  href={`/explore?category=${cat.id}`}
                  className={`category-card-el relative flex flex-col p-6 rounded-2xl border border-border/80 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 group overflow-hidden ${cat.hoverBorder}`}
                >
                  {/* Hover Colored Accent Top Bar */}
                  <div className={`absolute top-0 left-0 right-0 h-[3px] transition-all duration-300 bg-transparent ${cat.accentBorder}`} />

                  {/* Gradient Background Glow on Hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.hoverBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

                  {/* Technical Dot Matrix Backdrop */}
                  <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#1e293b_1.2px,transparent_1.2px)] [background-size:14px_14px] opacity-5 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"></div>

                  {/* Tech Code Pill (Top-Right) — font-mono correct for category code badge */}
                  <span className="absolute top-4 right-4 text-[8px] font-bold font-mono tracking-widest text-muted-foreground/60 border border-border/50 bg-muted/40 px-1.5 py-0.5 rounded uppercase select-none">
                    {cat.techBadge}
                  </span>

                  {/* Icon & Title */}
                  <div className="flex items-start gap-4 mb-4 relative z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${cat.iconBg} ${cat.iconColor} shadow-sm`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="relative z-10 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Card heading — no font-mono */}
                      <h3 className="text-sm font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-muted-foreground/90 leading-relaxed">
                        {cat.desc}
                      </p>
                    </div>

                    <div className="mt-5">
                      {/* Sub-specification info — font-mono fits for status line */}
                      <div className="flex items-center gap-1.5 mb-3.5 text-[9px] font-mono text-muted-foreground/80">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{cat.statText}</span>
                      </div>

                      {/* Technical Tags — font-mono correct, these are code tokens */}
                      <div className="flex flex-wrap gap-1.5">
                        {cat.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[8px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-border/40 px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom link indicator — no font-mono */}
                  <div className="flex items-center gap-1 text-xs font-semibold mt-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                    View Models <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Trending Section */}
        <div className="mb-16">
          <div className="featured-title-el flex items-center justify-between mb-6">
            <div>
              {/* Heading — no font-mono */}
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500 fill-orange-500/10" /> Featured Sandboxes
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Community models validated and active on serverless container hosts.</p>
            </div>
            <Link href="/explore" className="text-sm text-primary font-semibold flex items-center gap-1 hover:underline">
              View All Catalog <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {trendingModels.length === 0 ? (
            <div className="featured-card-el card text-center p-12 bg-muted/10 border-dashed border-2">
              <Globe className="w-8 h-8 text-muted-foreground/45 mx-auto mb-4" />
              <h3 className="text-sm font-bold text-foreground">No Models Shared Publicly Yet</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
                Be the first to publish a model! Make your deployment public during model uploads.
              </p>
              <Link href="/login" className="btn-primary mt-6 text-sm font-semibold">
                Upload First Model
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trendingModels.map((model) => {
                const latestVer = model.versions?.length
                  ? [...model.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0]
                  : null;
                const publisherName = model.organization?.name || (model.user?.email ? model.user.email.split("@")[0] : "community");
                const isLive = latestVer?.deployments?.some(d => d.status === DeploymentStatus.RUNNING);

                const type      = (model as unknown as Record<string, unknown>).type      as string | undefined;
                const framework = (model as unknown as Record<string, unknown>).framework as string | undefined;
                const taskType  = (model as unknown as Record<string, unknown>).taskType  as string | undefined;

                const meta   = type ? TYPE_META[type] : null;
                const accent = type ? (TYPE_ACCENT[type] || "from-slate-500 to-slate-600") : "from-slate-500 to-slate-600";
                const TypeIcon = meta?.icon || Package;

                return (
                  <Link
                    key={model.id}
                    href={`/explore/${model.id}`}
                    className="featured-card-el group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 hover:border-primary/30"
                  >
                    {/* Top gradient accent bar */}
                    <div className={`h-1 w-full bg-gradient-to-r ${accent} opacity-80 group-hover:opacity-100 transition-opacity`} />

                    <div className="p-5 flex flex-col flex-1">
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-4">
                        {/* Icon avatar */}
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-sm shrink-0`}>
                          <TypeIcon className="w-4.5 h-4.5 text-white" />
                        </div>

                        {/* Status badges */}
                        <div className="flex items-center gap-1.5">
                          {isLive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-muted-foreground bg-muted border border-border">
                            {latestVer ? `v${latestVer.versionNumber}` : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Model name */}
                      <h3 className="text-sm font-bold text-foreground truncate mb-1 group-hover:text-primary transition-colors">
                        {model.name}
                      </h3>

                      {/* Publisher & Rating Row */}
                      <div className="flex items-center justify-between mb-3 text-xs font-mono text-muted-foreground">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            @                          {model.organization?.name ? publisherName : `@${publisherName}`}

                          </span>
                        </div>
                        {model.reviewCount !== undefined && model.reviewCount > 0 && (
                          <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                            <span>★</span>
                            <span className="font-bold text-foreground">{Number(model.averageRating).toFixed(1)}</span>
                            <span className="text-[10px] text-muted-foreground">({model.reviewCount})</span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1 mb-4">
                        {model.description || "No description provided for this model."}
                      </p>

                      {/* Taxonomy tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {meta && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}>
                            <meta.icon className="w-3 h-3" />
                            {meta.label}
                          </span>
                        )}
                        {framework && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                            {FRAMEWORK_LABELS[framework] || framework}
                          </span>
                        )}
                        {taskType && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40">
                            {TASK_LABELS[taskType] || taskType}
                          </span>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/60">
                        <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                          <Activity className="w-3 h-3" />
                          <span>{model.versions?.length || 0} build{(model.versions?.length || 0) !== 1 ? "s" : ""}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
                          View Sandbox
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recently Added Section */}
        {recentlyAdded.length > 0 && (
          <div className="mb-16">
            {/* Heading — no font-mono */}
            <h2 className="recent-title-el text-xl font-bold text-foreground mb-6">Recently Registered</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {recentlyAdded.map((model) => {
                const latestVer = model.versions?.length
                  ? [...model.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0]
                  : null;
                const publisherName = model.organization?.name || (model.user?.email ? model.user.email.split("@")[0] : "community");

                return (
                  <Link
                    key={model.id}
                    href={`/explore/${model.id}`}
                    className="recent-card-el flex items-start gap-4 p-5 rounded-2xl border border-border bg-card/60 hover:bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-200 group"
                  >
                    {/* Initials — font-mono fine */}
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border flex items-center justify-center text-xs font-bold font-mono text-muted-foreground shrink-0 group-hover:border-primary/30 group-hover:text-primary transition-colors">
                      {model.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* Name — no font-mono */}
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-primary transition-colors">
                          {model.name}
                        </h4>
                        {latestVer?.deployments?.some(d => d.status === DeploymentStatus.RUNNING) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        )}
                      </div>
                      {/* Description — no font-mono */}
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {model.description || "Shared ML template."}
                      </p>
                      {/* Publisher/date metadata — font-mono fits for these */}
                      <span className="text-[10px] text-muted-foreground/75 font-mono mt-2 block">
                        {model.organization?.name ? publisherName : `@${publisherName}`} • {new Date(model.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Visual call to action card at the bottom */}
        <div className="cta-card-el card bg-gradient-to-br from-primary/5 via-card to-purple-600/5 border border-primary/20 flex flex-col md:flex-row items-center justify-between p-10 rounded-2xl gap-8 shadow-sm backdrop-blur-sm">
          <div className="max-w-xl text-left">
            {/* CTA heading — no font-mono */}
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5.5 h-5.5 text-primary" /> Want to share your own models?
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-2.5 leading-relaxed">
              Upload your PyTorch, Scikit-Learn or GGUF files. Our background worker will containerize and deploy them to sandbox endpoints with built-in API testing dashboards.
            </p>
          </div>
          <Link href="/login" className="btn-primary py-3 px-6 text-sm font-semibold shrink-0 rounded-xl hover:shadow-lg hover:shadow-primary/10 transition-all flex items-center gap-1.5">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

    </div>
  );
}
