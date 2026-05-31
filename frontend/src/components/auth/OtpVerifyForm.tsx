"use client";

import React from "react";
import { KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OtpVerifyFormProps {
  registeredEmail: string;
  otpValues: string[];
  onOtpChange: (index: number, val: string) => void;
  onOtpKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onGoBack: () => void;
  loading: boolean;
  otpRefs: React.RefObject<Array<HTMLInputElement | null>>;
}

/**
 * OTP Code Verification form component.
 * Features 6 distinct numeric boxes with automatic cursor focus shifting.
 * Migrated to Shadcn UI styles.
 *
 * @param props - Component properties containing state refs and change triggers.
 * @returns The React component rendering the verification code input sequence.
 */
export default function OtpVerifyForm({
  registeredEmail,
  otpValues,
  onOtpChange,
  onOtpKeyDown,
  onSubmit,
  onGoBack,
  loading,
  otpRefs,
}: OtpVerifyFormProps) {
  return (
    <div className="animate-slide-up">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1 select-none">Verify your email</h1>
        <p className="text-muted-foreground text-sm max-w-sm select-none">
          We sent a 6-digit verification code to <span className="font-semibold text-foreground">{registeredEmail}</span>.
        </p>
        <p className="text-xs text-muted-foreground/80 mt-2 bg-muted/50 border border-border/60 px-3 py-1.5 rounded-lg font-mono">
          Hint: Copy code from backend logs terminal.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex justify-center gap-2">
          {otpValues.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                if (otpRefs.current) {
                  otpRefs.current[idx] = el;
                }
              }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => onOtpChange(idx, e.target.value)}
              onKeyDown={(e) => onOtpKeyDown(idx, e)}
              className="w-12 h-14 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-foreground font-semibold text-lg text-center rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary focus:bg-white dark:focus:bg-slate-950 transition-all font-mono shadow-sm"
              disabled={loading}
              autoFocus={idx === 0}
            />
          ))}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 flex justify-center cursor-pointer rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm"
        >
          {loading ? "Verifying..." : "Verify & Onboard"}{" "}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <button
          type="button"
          onClick={onGoBack}
          className="text-xs text-muted-foreground hover:text-primary font-semibold w-full text-center hover:underline cursor-pointer block"
          disabled={loading}
        >
          Go back to Registration
        </button>
      </form>
    </div>
  );
}
