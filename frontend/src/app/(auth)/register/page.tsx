"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser, verifyUser } from "@/lib/actions/auth.actions";
import { signIn, useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import RegisterForm from "@/components/auth/RegisterForm";
import OtpVerifyForm from "@/components/auth/OtpVerifyForm";
import { RegisterInput } from "@/lib/schemas";

/**
 * Registration page client component.
 * Integrates a two-step wizard: account profile credentials followed by email OTP validation.
 * Migrated to Shadcn UI Card layout.
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
      } else {
        setError(res.error || "Failed to register");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
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
      setLoading(false);
      return;
    }

    try {
      const res = await verifyUser(registeredEmail, fullOtp);
      if (res.success) {
        const loginRes = await signIn("credentials", {
          email: registeredEmail,
          password: tempPassword,
          redirect: false,
        });

        if (loginRes?.error) {
          setError("Verification successful, but sign in failed. Please login manually.");
          setTimeout(() => router.push("/login"), 2000);
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        setError(res.error || "Verification failed");
      }
    } catch {
      setError("Failed to verify code. Please try again.");
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
      <div className="flex w-full max-w-5xl my-auto mx-4 bg-card/60 backdrop-blur-md border border-border rounded-2xl overflow-hidden shadow-2xl min-h-[580px] transition-all duration-300">
        
        {/* Left column (Branding & Illustration) - Hidden on mobile */}
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

          {/* Illustration Container */}
          <div className="relative z-10 w-full my-auto flex justify-center py-6">
            <div className="relative w-[280px] h-[280px] lg:w-[320px] lg:h-[320px] animate-pulse-slow">
              <Image
                src="/register_illustration.png"
                alt="Registration Illustration"
                fill
                priority
                className="object-contain"
              />
            </div>
          </div>

          {/* Slogan & subtext */}
          <div className="relative z-10 space-y-2">
            <h2 className="text-lg font-bold tracking-tight text-white font-mono">
              Build, Sandbox & Scale Models
            </h2>
            <p className="text-slate-400 text-[11px] leading-relaxed font-mono">
              Upload machine learning assets, run isolated predictions, create collaborative organizations, and scale container weights automatically.
            </p>
          </div>
        </div>

        {/* Right column (Registration / Verification Form) */}
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
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-500/30 dark:text-red-400 text-xs font-semibold leading-relaxed animate-shake">
                  {error}
                </div>
              )}

              {step === "REGISTER" ? (
                <div>
                  <h1 className="text-lg font-bold text-foreground mb-1 select-none">Create an Account</h1>
                  <p className="text-xs text-muted-foreground mb-6 select-none">Start deploying your machine learning models today.</p>
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

            <p className="text-center text-xs text-muted-foreground font-mono select-none">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-primary hover:underline hover:text-primary-600 transition-colors"
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
