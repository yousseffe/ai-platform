import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { Sparkles, Terminal, Activity, Code2, ShieldCheck, Quote } from "lucide-react";

interface AuthShellProps {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  actionText: string;
  children: ReactNode;
}

export default function AuthShell({
  title,
  description,
  actionLabel,
  actionHref,
  actionText,
  children,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen lg:h-screen lg:max-h-screen w-full flex flex-col lg:flex-row bg-background text-foreground transition-colors duration-300 overflow-y-auto lg:overflow-hidden select-none">
      
      {/* ================= LEFT SIDE: BRANDING VISUALS (on Desktop) ================= */}
      <div className="relative hidden lg:flex lg:w-[46%] xl:w-[48%] lg:h-full lg:max-h-full bg-[#030712] text-slate-200 flex-col justify-between p-10 overflow-hidden border-r border-slate-900/60 select-none shrink-0">
        {/* Glow Spheres */}
        <div className="absolute top-[-10rem] left-[-10rem] w-[35rem] h-[35rem] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10rem] right-[-10rem] w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[25%] right-[-5rem] w-[20rem] h-[20rem] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] opacity-100 pointer-events-none" />
        
        {/* System Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">Qantara Cluster Nodes: Active</span>
          </div>
          <div className="rounded-full bg-slate-900/90 border border-slate-800/80 px-2.5 py-1 text-[10px] font-mono text-slate-400">
            ping: 14ms
          </div>
        </div>

        {/* Visual Central Showcase */}
        <div className="relative z-10 max-w-lg mx-auto w-full flex flex-col justify-center flex-1 py-4">
          
          {/* Animated SVG Bridge */}
          <div className="w-full mb-4">
            <svg className="w-full h-[100px] max-w-md mx-auto" viewBox="0 0 400 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              
              <style>
                {`
                  @keyframes pulse-flow {
                    0% { stroke-dashoffset: 120; }
                    100% { stroke-dashoffset: 0; }
                  }
                  .pulse-line {
                    stroke-dasharray: 8 6;
                    animation: pulse-flow 3.5s linear infinite;
                  }
                  @keyframes float-node {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-3px); }
                  }
                  .floating-node-left {
                    animation: float-node 3.8s ease-in-out infinite;
                  }
                  .floating-node-right {
                    animation: float-node 3.8s ease-in-out infinite;
                    animation-delay: 1.9s;
                  }
                `}
              </style>

              {/* Underlying Base Path */}
              <path d="M 70,60 C 160,25 240,25 330,60" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              
              {/* Animated Glowing Connection Line */}
              <path d="M 70,60 C 160,25 240,25 330,60" stroke="url(#gradient-line)" strokeWidth="2.5" fill="none" strokeLinecap="round" className="pulse-line" filter="url(#glow)" opacity="0.8" />

              {/* Developer Client Node (Left) */}
              <g className="floating-node-left">
                <circle cx="70" cy="60" r="24" fill="#0f172a" stroke="#2563eb" strokeWidth="2" filter="url(#glow)" />
                <circle cx="70" cy="60" r="24" fill="#0f172a" stroke="#2563eb" strokeWidth="1.5" />
                <circle cx="70" cy="60" r="28" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" className="animate-[spin_40s_linear_infinite]" />
                <path d="M 64,57 L 59,62 L 64,67 M 76,57 L 81,62 L 76,67 M 68,69 L 72,55" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <text x="70" y="100" textAnchor="middle" fill="#94a3b8" className="text-[9px] font-mono font-bold tracking-widest uppercase">Developer</text>
              </g>

              {/* AI Platform Node (Right) */}
              <g className="floating-node-right">
                <circle cx="330" cy="60" r="24" fill="#0b1329" stroke="#14b8a6" strokeWidth="2" filter="url(#glow)" />
                <circle cx="330" cy="60" r="24" fill="#0b1329" stroke="#14b8a6" strokeWidth="1.5" />
                <circle cx="330" cy="60" r="28" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" className="animate-[spin_30s_linear_infinite]" />
                {/* Visual brain/network hubs */}
                <circle cx="323" cy="54" r="2" fill="#14b8a6" />
                <circle cx="337" cy="54" r="2" fill="#14b8a6" />
                <circle cx="320" cy="64" r="2" fill="#14b8a6" />
                <circle cx="340" cy="64" r="2" fill="#14b8a6" />
                <circle cx="330" cy="71" r="2" fill="#14b8a6" />
                <path d="M 323,54 L 330,71 M 337,54 L 330,71 M 320,64 L 330,71 M 340,64 L 330,71 M 323,54 L 337,54 M 320,64 L 340,64" stroke="#14b8a6" strokeWidth="0.75" opacity="0.6" />
                <text x="330" y="100" textAnchor="middle" fill="#94a3b8" className="text-[9px] font-mono font-bold tracking-widest uppercase">Qantara AI</text>
              </g>

              {/* Floating Package Pulse */}
              <circle cx="0" cy="0" r="4.5" fill="#a855f7" filter="url(#glow)">
                <animateMotion dur="3.5s" repeatCount="indefinite" path="M 70,60 C 160,25 240,25 330,60" />
              </circle>
            </svg>
          </div>

          {/* IDE/Terminal mockup */}
          <div className="w-full rounded-xl border border-slate-800 bg-slate-950/60 shadow-2xl backdrop-blur-md overflow-hidden text-left mb-6">
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-slate-900 bg-slate-900/40 px-4 py-2">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-rose-500/80" />
                <div className="h-2 w-2 rounded-full bg-amber-500/80" />
                <div className="h-2 w-2 rounded-full bg-emerald-500/80" />
              </div>
              <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <Code2 className="h-3 w-3 text-slate-600" />
                deploy_model.ts
              </div>
              <div className="w-8" />
            </div>

            {/* Code */}
            <div className="p-3.5 font-mono text-[10.5px] leading-relaxed text-slate-300">
              <div>
                <span className="text-pink-500">import</span> {"{"} Qantara {"}"} <span className="text-pink-500">from</span> <span className="text-teal-400">"@qantara/sdk"</span>;
              </div>
              <div className="mt-1">
                <span className="text-pink-500">const client</span> = <span className="text-pink-500">new</span> <span className="text-blue-400">Qantara</span>({`{ apiKey: process.env.QANTARA_KEY }`});
              </div>
              <div className="mt-2 text-slate-500">// Bridge your codebase to scalable GPUs instantly</div>
              <div className="mt-1">
                <span className="text-pink-500">const</span> deployment = <span className="text-pink-500">await</span> client.models.deploy({`{`}
              </div>
              <div className="pl-4">
                model: <span className="text-teal-400">"llama-3.3-70b-instruct"</span>,
              </div>
              <div className="pl-4">
                hardware: <span className="text-teal-400">"nvidia-l4-multi"</span>,
              </div>
              <div className="pl-4">
                autoscaling: {`{ min: 1, max: 10 }`}
              </div>
              <div>{`});`}</div>
            </div>

            {/* Output Panel Header */}
            <div className="flex border-t border-slate-900 bg-slate-950/80 px-4 py-1.5 border-b border-slate-900">
              <span className="text-[9px] font-mono text-indigo-400 font-semibold tracking-wider uppercase flex items-center gap-1">
                <Terminal className="h-3 w-3" /> System Logs
              </span>
            </div>

            {/* Logs Output */}
            <div className="p-3.5 font-mono text-[10px] leading-5 text-slate-400 bg-slate-950/20">
              <div className="flex gap-1">
                <span className="text-indigo-500">$</span>
                <span className="text-slate-300">npx qantara deploy</span>
              </div>
              <div className="text-slate-500">● Provisioning GPU node... Done</div>
              <div className="text-slate-500">● Loading model weights... Active</div>
              <div className="text-emerald-400 font-medium flex items-center gap-1 mt-0.5 animate-pulse">
                ✓ Deployment deployed to 12 edge regions successfully!
              </div>
            </div>
          </div>

          {/* Core Values grid */}
          <div className="grid grid-cols-2 gap-4 mt-2 border-t border-slate-800/80 pt-6 text-left">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-blue-400" />
                <h4 className="text-xs font-semibold text-slate-200">Scale Instantly</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Instantly host models on multi-cloud GPU pipelines with automated load balancing.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-4 w-4 text-teal-400" />
                <h4 className="text-xs font-semibold text-slate-200">Enterprise Security</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                End-to-end encrypted tunnels, isolation bounds, and strict RBAC controls.
              </p>
            </div>
          </div>

        </div>

        {/* Footer quote */}
        <div className="relative z-10 border-t border-slate-900 bg-slate-950/20 rounded-xl p-3.5 flex gap-3 text-left items-start shrink-0">
          <Quote className="h-4 w-4 text-indigo-500 shrink-0 opacity-60 mt-1" />
          <div>
            <p className="text-[11px] leading-relaxed text-slate-300 italic">
              "Deploying large neural network pipelines was our biggest engineering bottleneck. Qantara completely automated that. What took days now takes 10 seconds."
            </p>
            <p className="text-[9px] font-mono text-slate-500 mt-1.5">
              — Lead AI Platform Architect, Cortex Labs
            </p>
          </div>
        </div>

      </div>

      {/* ================= RIGHT SIDE: FORMS (on Desktop) ================= */}
      <div className="relative flex flex-col justify-between p-6 sm:p-10 lg:p-12 w-full lg:w-[54%] xl:w-[52%] bg-background text-foreground shrink-0 min-h-screen lg:min-h-0 lg:h-full lg:max-h-full lg:overflow-y-auto">
        {/* Soft decorative background glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.04),transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:24px_24px] opacity-100 pointer-events-none" />
        
        {/* Header */}
        <header className="relative z-10 flex w-full items-center justify-between gap-6 mb-8 lg:mb-10">
          <Link href="/" className="flex items-center text-foreground transition duration-200 hover:opacity-90">
            <Image
              src="/qantara-assets/dark-full.svg"
              alt="Qantara"
              width={140}
              height={34}
              className="hidden object-contain dark:block"
            />
            <Image
              src="/qantara-assets/light-full.svg"
              alt="Qantara"
              width={140}
              height={34}
              className="object-contain dark:hidden"
            />
          </Link>

          <p className="text-right text-[12px] text-slate-500 dark:text-slate-400">
            {actionText}{" "}
            <Link href={actionHref} className="font-semibold text-primary transition duration-200 hover:text-primary-600">
              {actionLabel}
            </Link>
          </p>
        </header>

        {/* Main Content Area */}
        <main className="relative z-10 my-auto flex w-full flex-col justify-center max-w-[34rem] mx-auto py-4">
          <div className="space-y-2 mb-6 text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>

          <div className="animate-fade-in">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 mt-8 text-center lg:text-left text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} Qantara AI. All rights reserved.
        </footer>
      </div>

    </div>
  );
}
