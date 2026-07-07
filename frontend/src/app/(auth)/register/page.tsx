"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

import AuthShell from "@/components/auth/AuthShell";
import OtpVerifyForm from "@/components/auth/OtpVerifyForm";
import RegisterForm from "@/components/auth/RegisterForm";
import { Card, CardContent } from "@/components/ui/card";
import { registerUser, verifyUser } from "@/lib/actions/auth.actions";
import { RegisterInput } from "@/lib/schemas";

export default function RegisterPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"REGISTER" | "VERIFY">("REGISTER");
  const [tempPassword, setTempPassword] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [router, session]);

  const handleRegisterSubmit = async (data: RegisterInput) => {
    setError("");
    setLoading(true);

    try {
      const res = await registerUser(data.email, data.full_name, data.password);
      if (res.success) {
        setRegisteredEmail(data.email);
        setTempPassword(data.password);
        setOtpValues(Array(6).fill(""));
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

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) {
      return;
    }

    const updated = [...otpValues];
    updated[index] = value;
    setOtpValues(updated);

    if (value && index < updated.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifySubmit = async (event: FormEvent) => {
    event.preventDefault();
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

  const isRegisterStep = step === "REGISTER";

  return (
    <AuthShell
      title={isRegisterStep ? "Create your account" : "Verify your email"}
      description={
        isRegisterStep
          ? "Start deploying and scaling machine learning models today"
          : "Enter the six-digit code we sent to your inbox to complete your account setup."
      }
      actionText="Already have an account?"
      actionLabel="Sign in"
      actionHref="/login"
    >
      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm backdrop-blur-md">
        <CardContent className="p-5 sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/15 bg-destructive/5 px-4 py-2.5 text-[11px] font-medium text-destructive/90 animate-fade-in">
              {error}
            </div>
          )}

          {isRegisterStep ? (
            <RegisterForm onSubmit={handleRegisterSubmit} loading={loading} />
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
    </AuthShell>
  );
}
