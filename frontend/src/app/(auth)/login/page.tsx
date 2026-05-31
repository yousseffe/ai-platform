"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Mail, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/schemas";

/**
 * Login page client component.
 * Sets up credentials validation with React Hook Form and Zod schemas,
 * interfacing with NextAuth credentials authentication.
 */
export default function LoginPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [session, router]);

  const handleLogin = async (data: LoginInput) => {
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-stretch justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      {/* Soft radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 dark:bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Main card wrapper */}
      <div className="flex w-full max-w-5xl my-auto mx-4 bg-card/60 backdrop-blur-md border border-border rounded-2xl overflow-hidden shadow-2xl min-h-[560px] transition-all duration-300">
        
        {/* Left column (Branding & mock terminal) - Hidden on mobile */}
        <div className="hidden md:flex md:w-1/2 bg-slate-950 p-10 flex-col justify-between relative overflow-hidden border-r border-border/40 text-white select-none">
          {/* Glowing orbs */}
          <div className="absolute top-[-30%] left-[-30%] w-[90%] h-[90%] rounded-full bg-indigo-900/35 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-30%] right-[-30%] w-[90%] h-[90%] rounded-full bg-purple-900/25 blur-[120px] pointer-events-none" />

          {/* Logo header */}
          <div className="relative z-10 flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="MLHub Logo"
              width={34}
              height={34}
              className="object-contain"
              style={{ width: "auto" }}
            />
            <span className="font-mono text-xl font-extrabold text-white tracking-tight">MLHub</span>
          </div>

          {/* Graphic mockup/terminal display */}
          <div className="relative z-10 w-full my-auto py-8">
            <div className="bg-black/85 rounded-xl border border-white/10 p-5 shadow-2xl font-mono text-[10px] text-slate-300 space-y-2 max-w-sm mx-auto">
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-white/45 text-[9px]">mlhub-deploy.sh</span>
              </div>
              <div className="text-primary font-bold flex items-center gap-1">
                <span>$</span> mlhub deploy model:resnet50 --env production
              </div>
              <div className="text-muted-foreground/80">→ Connecting to container orchestration registry...</div>
              <div className="text-emerald-400 font-semibold">✓ Verified credentials for user@mlhub.ai</div>
              <div className="text-slate-400">⚡ Initializing A100 GPU computing node</div>
              <div className="text-slate-400">✓ Container status: RUNNING [port 8000]</div>
              <div className="text-blue-400 font-bold border border-blue-500/25 bg-blue-950/20 px-2 py-0.5 rounded w-max mt-2 text-[9px] uppercase tracking-wider select-none">
                deployment live
              </div>
            </div>
          </div>

          {/* Slogan & subtext */}
          <div className="relative z-10 space-y-2">
            <h2 className="text-lg font-bold tracking-tight text-white font-mono">
              The Developer-First Model Platform
            </h2>
            <p className="text-slate-400 text-[11px] leading-relaxed font-mono">
              Upload machine learning assets, run sandboxed tests, and manage containerized prediction deployments in a seamless developer console.
            </p>
          </div>
        </div>

        {/* Right column (Login Form) */}
        <div className="w-full md:w-1/2 p-8 lg:p-12 flex flex-col justify-center bg-card/10">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            {/* Header for mobile view (hidden on desktop) */}
            <div className="flex items-center justify-center gap-2.5 text-primary font-bold text-xl tracking-tight mb-4 md:hidden">
              <Image
                src="/logo.png"
                alt="MLHub Logo"
                width={30}
                height={30}
                className="object-contain"
                style={{ width: "auto" }}
              />
              <span className="font-mono text-lg font-extrabold text-foreground">MLHub</span>
            </div>

            <div className="font-mono">
              <h1 className="text-xl font-extrabold text-foreground mb-1 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-xs text-muted-foreground mb-6">
                Enter your credentials to access your developer workspace.
              </p>

              {error && (
                <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-500/30 dark:text-red-400 text-xs font-semibold leading-relaxed animate-shake">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(handleLogin)} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 select-none">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 select-none" />
                    <input
                      type="email"
                      className={`form-input pl-10 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-foreground placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-950/80 focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all duration-150 ${
                        errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
                      }`}
                      style={{ paddingLeft: "2.5rem" }}
                      placeholder="name@company.com"
                      {...register("email")}
                      disabled={loading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1.5 font-bold">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2 select-none">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    <a
                      href="#"
                      className="text-[11px] font-bold text-primary hover:underline hover:text-primary-600 transition-colors"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 select-none" />
                    <input
                      type="password"
                      className={`form-input pl-10 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-foreground placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-950/80 focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all duration-150 ${
                        errors.password ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
                      }`}
                      style={{ paddingLeft: "2.5rem" }}
                      placeholder="••••••••"
                      {...register("password")}
                      disabled={loading}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1.5 font-bold">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 flex justify-center mt-3 cursor-pointer rounded-lg text-xs font-bold uppercase tracking-wider"
                >
                  {loading ? "Signing In..." : "Sign In"}{" "}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </form>

            </div>

            <p className="text-center text-xs text-muted-foreground font-mono select-none">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-bold text-primary hover:underline hover:text-primary-600 transition-colors"
              >
                Request access
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
