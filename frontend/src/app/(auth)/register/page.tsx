"use client";

import React, { useState, useEffect, useRef } from "react";
import { Layers } from "lucide-react";
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
      const res = await registerUser(data.email, data.username, data.password);
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Title logo area */}
        <div className="flex items-center justify-center gap-2 text-primary-600 font-bold text-2xl tracking-tight mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          ModelOps AI
        </div>

        <Card className="border border-slate-200 shadow-sm p-0">
          <CardContent className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            {step === "REGISTER" ? (
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Create an account</h1>
                <p className="text-slate-500 text-sm mb-6">Start deploying your machine learning models today.</p>
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
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
