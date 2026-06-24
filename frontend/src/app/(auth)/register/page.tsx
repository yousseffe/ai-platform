"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser, verifyUser } from "@/lib/actions/auth.actions";
import { signIn, useSession } from "next-auth/react";
import RegisterForm from "@/components/auth/RegisterForm";
import OtpVerifyForm from "@/components/auth/OtpVerifyForm";
import { RegisterInput } from "@/lib/schemas";
import { toast } from "react-hot-toast";

/**
 * Registration page client component.
 * Integrates a two-step wizard: account profile credentials followed by email OTP validation.
 * Redesigned in the premium Expo Go console theme.
 */
export default function RegisterPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Wizard steps state
  const [step, setStep] = useState<"REGISTER" | "VERIFY">("REGISTER");
  const [tempPassword, setTempPassword] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [session, router]);

  const handleRegisterSubmit = async (data: RegisterInput) => {
    setError("");
    setLoading(true);

    try {
      const res = await registerUser(data.email, data.full_name, data.password);
      if (res.success) {
        setRegisteredEmail(data.email);
        setTempPassword(data.password);
        setStep("VERIFY");
        toast.success("Account created! Please verify your email.");
      } else {
        setError(res.error || "Failed to register");
        toast.error(res.error || "Failed to register");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const updated = [...otpValues];
    updated[index] = val;
    setOtpValues(updated);

    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fullOtp = otpValues.join("");
    if (fullOtp.length < 6) {
      setError("Please enter the full 6-digit OTP code");
      toast.error("Please enter the full 6-digit OTP code");
      setLoading(false);
      return;
    }

    try {
      const res = await verifyUser(registeredEmail, fullOtp);
      if (res.success) {
        toast.success("Email verified successfully!");
        const loginRes = await signIn("credentials", {
          email: registeredEmail,
          password: tempPassword,
          redirect: false,
        });

        if (loginRes?.error) {
          setError("Verification successful, but sign in failed. Please login manually.");
          toast.error("Sign in failed. Redirecting to login page...");
          setTimeout(() => router.push("/login"), 2000);
        } else {
          toast.success("Successfully logged in!");
          router.push("/");
          router.refresh();
        }
      } else {
        setError(res.error || "Verification failed");
        toast.error(res.error || "Verification failed");
      }
    } catch {
      setError("Failed to verify code. Please try again.");
      toast.error("Verification failed");
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
      <div className="flex w-full max-w-4xl my-auto mx-4 bg-card border border-border rounded-2xl overflow-hidden shadow-xl min-h-[540px] transition-all duration-300">
        
        {/* Left column (Branding & YAML config preview) - Hidden on mobile */}
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

          {/* Graphic mockup/YAML config simulator */}
          <div className="relative z-10 w-full my-auto py-4">
            <div className="bg-[#121316] rounded-xl border border-[#222326] p-4.5 shadow-2xl font-mono text-[10px] text-slate-300 space-y-1.5 max-w-sm mx-auto">
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/80" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/80" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-white/30 text-[9px] font-sans">mlhub-manifest.yaml</span>
              </div>
              <div className="text-slate-400"><span className="text-primary font-semibold">model:</span></div>
              <div className="text-slate-400">&nbsp;&nbsp;<span className="text-emerald-400">name:</span> <span className="text-amber-300">&quot;llama-3-8b-instruct&quot;</span></div>
              <div className="text-slate-400">&nbsp;&nbsp;<span className="text-emerald-400">framework:</span> <span className="text-amber-300">&quot;pytorch&quot;</span></div>
              <div className="text-slate-400">&nbsp;&nbsp;<span className="text-emerald-400">type:</span> <span className="text-amber-300">&quot;text-generation&quot;</span></div>
              <div className="text-slate-400"><span className="text-primary font-semibold">compute:</span></div>
              <div className="text-slate-400">&nbsp;&nbsp;<span className="text-emerald-400">accelerator:</span> <span className="text-amber-300">&quot;nvidia-a100&quot;</span></div>
              <div className="text-slate-400">&nbsp;&nbsp;<span className="text-emerald-400">replicas:</span> <span className="text-indigo-300">2</span></div>
              <div className="text-slate-400">&nbsp;&nbsp;<span className="text-emerald-400">autoscaling:</span> <span className="text-indigo-300">true</span></div>
            </div>
          </div>

          {/* Slogan & subtext */}
          <div className="relative z-10 space-y-1.5">
            <h2 className="text-sm font-bold tracking-tight text-white">
              Scale Model Deployments Instantly
            </h2>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Upload machine learning assets, run isolated predictions, create collaborative organizations, and scale container weights automatically.
            </p>
          </div>
        </div>

        {/* Right column (Registration / Verification Form) */}
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

            <div className="space-y-4 font-sans">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold leading-relaxed animate-shake">
                  {error}
                </div>
              )}

              {step === "REGISTER" ? (
                <div className="space-y-4">
                  <div className="text-left select-none">
                    <h1 className="text-lg font-bold text-foreground tracking-tight">Create an Account</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Start deploying your machine learning models today.</p>
                  </div>
                  <RegisterForm onSubmit={handleRegisterSubmit} loading={loading} />
                </div>
              ) : (
                <OtpVerifyForm
                  registeredEmail={registeredEmail}
                  otpValues={otpValues}
                  onOtpChange={handleOtpChange}
                  onOtpKeyDown={handleOtpKeyDown}
                  onSubmit={handleVerifySubmit}
                  onGoBack={() => setStep("REGISTER")}
                  loading={loading}
                  otpRefs={otpRefs}
                />
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground select-none font-sans mt-4">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-primary hover:underline transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
