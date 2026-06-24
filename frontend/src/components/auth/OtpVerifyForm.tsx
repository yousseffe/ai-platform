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
 * Redesigned in the premium Expo Go console theme.
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
    <div className="animate-slide-up font-sans">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
          <KeyRound className="w-5 h-5" />
        </div>
        <h1 className="text-base font-bold text-foreground mb-1 select-none">Verify your email</h1>
        <p className="text-muted-foreground text-xs max-w-xs select-none">
          We sent a 6-digit verification code to <span className="font-semibold text-foreground">{registeredEmail}</span>.
        </p>
        <p className="text-[10px] text-muted-foreground mt-2 bg-secondary border border-border px-2.5 py-1.5 rounded-md font-mono select-all">
          Hint: Copy code from backend logs terminal.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
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
              className="w-10 h-12 bg-background border border-border text-foreground font-semibold text-base text-center rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono shadow-sm"
              disabled={loading}
              autoFocus={idx === 0}
            />
          ))}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2 flex justify-center cursor-pointer rounded-lg text-xs font-semibold shadow-sm h-9"
        >
          {loading ? "Verifying..." : "Verify & Onboard"}{" "}
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>

        <button
          type="button"
          onClick={onGoBack}
          className="text-xs text-muted-foreground hover:text-primary font-semibold w-full text-center hover:underline cursor-pointer block mt-1 transition-all"
          disabled={loading}
        >
          Go back to registration
        </button>
      </form>
    </div>
  );
}
