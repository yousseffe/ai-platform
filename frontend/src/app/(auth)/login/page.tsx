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
import { toast } from "react-hot-toast";

/**
 * Login page client component.
 * Sets up credentials validation with React Hook Form and Zod schemas,
 * interfacing with NextAuth credentials authentication.
 * Redesigned in the premium Expo Go console theme.
 */
export default function LoginPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
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
        toast.error("Invalid email or password");
      } else {
        toast.success("Successfully logged in!");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      toast.error("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-stretch justify-center relative overflow-hidden font-sans">
      {/* Background grid */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      {/* Soft radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 dark:bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Main card wrapper */}
      <div className="flex w-full max-w-4xl my-auto mx-4 bg-card border border-border rounded-2xl overflow-hidden shadow-xl min-h-[520px] transition-all duration-300">
        
        {/* Left column (Branding & mock terminal) - Hidden on mobile */}
        <div className="hidden md:flex md:w-1/2 bg-[#08090a] p-10 flex-col justify-between relative overflow-hidden border-r border-border text-white select-none">
          {/* Glowing orbs */}
          <div className="absolute top-[-30%] left-[-30%] w-[90%] h-[90%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-30%] right-[-30%] w-[90%] h-[90%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

          {/* Logo header */}
          <div className="relative z-10 flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="MLHub Logo"
              width={28}
              height={28}
              className="object-contain"
              style={{ width: "auto" }}
            />
            <span className="font-sans text-sm font-bold text-white tracking-tight">MLHub Console</span>
          </div>

          {/* Graphic mockup/terminal display */}
          <div className="relative z-10 w-full my-auto py-4">
            <div className="bg-[#121316] rounded-xl border border-[#222326] p-4.5 shadow-2xl font-mono text-[10px] text-slate-300 space-y-2 max-w-sm mx-auto">
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/80" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/80" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-white/30 text-[9px] font-sans">mlhub-deploy.sh</span>
              </div>
              <div className="text-primary font-semibold flex items-center gap-1.5">
                <span className="text-muted-foreground">$</span> mlhub deploy model:llama-3-8b
              </div>
              <div className="text-muted-foreground">→ Connecting to container registry...</div>
              <div className="text-emerald-400 font-medium">✓ Verified authorization credentials</div>
              <div className="text-slate-400">⚡ Initializing computing accelerator [A100 GPU]</div>
              <div className="text-slate-400">✓ Container status: RUNNING [port 8000]</div>
              <div className="text-primary font-semibold border border-primary/20 bg-primary/10 px-2 py-0.5 rounded w-max mt-2 text-[9px] uppercase tracking-wider">
                deployment live
              </div>
            </div>
          </div>

          {/* Slogan & subtext */}
          <div className="relative z-10 space-y-1.5">
            <h2 className="text-sm font-bold tracking-tight text-white">
              The Developer-First Model Platform
            </h2>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Upload machine learning assets, run sandboxed tests, and manage containerized prediction deployments in a seamless developer console.
            </p>
          </div>
        </div>

        {/* Right column (Login Form) */}
        <div className="w-full md:w-1/2 p-8 lg:p-12 flex flex-col justify-center bg-card">
          <div className="max-w-sm w-full mx-auto space-y-6">
            
            {/* Header for mobile view (hidden on desktop) */}
            <div className="flex items-center justify-center gap-2 text-primary font-bold text-lg tracking-tight mb-4 md:hidden">
              <Image
                src="/logo.png"
                alt="MLHub Logo"
                width={26}
                height={26}
                className="object-contain"
                style={{ width: "auto" }}
              />
              <span className="font-sans text-sm font-bold text-foreground">MLHub Console</span>
            </div>

            <div className="space-y-4">
              <div className="text-left">
                <h1 className="text-lg font-bold text-foreground tracking-tight">
                  Welcome back
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter your credentials to access your developer workspace.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold leading-relaxed animate-shake">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(handleLogin)} className="space-y-4.5">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground select-none" />
                    <input
                      type="email"
                      className={`w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
                        errors.email ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                      }`}
                      style={{ paddingLeft: "2.25rem" }}
                      placeholder="name@company.com"
                      {...register("email")}
                      disabled={loading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[10px] text-destructive mt-1 font-semibold">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center select-none">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Password
                    </label>
                    <a
                      href="#"
                      className="text-[10px] font-semibold text-primary hover:underline transition-colors"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground select-none" />
                    <input
                      type="password"
                      className={`w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
                        errors.password ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
                      }`}
                      style={{ paddingLeft: "2.25rem" }}
                      placeholder="••••••••"
                      {...register("password")}
                      disabled={loading}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-[10px] text-destructive mt-1 font-semibold">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !isValid}
                  className="btn-primary w-full py-2 flex justify-center mt-2 cursor-pointer rounded-lg text-xs font-semibold shadow-sm"
                >
                  {loading ? "Signing In..." : "Sign In"}{" "}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-muted-foreground select-none font-sans mt-4">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-bold text-primary hover:underline transition-colors"
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
