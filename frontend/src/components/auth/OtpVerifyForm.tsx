import React from "react";
import { KeyRound, ArrowRight, ShieldAlert } from "lucide-react";
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
    <div className="space-y-6 text-center select-none animate-fade-in">
      
      {/* Visual Header */}
      <div className="flex flex-col items-center">
        <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary text-primary shadow-sm">
          <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping opacity-45" />
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        
        <p className="max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          We sent a 6-digit verification code to{" "}
          <span className="font-semibold text-slate-900 dark:text-white select-all">{registeredEmail}</span>.
        </p>

        <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-md border border-amber-200/60 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20 px-2.5 py-1 font-mono text-[9px] text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          Hint: Copy the code from backend terminal logs
        </div>
      </div>

      {/* Inputs Form */}
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
              className="h-12 w-11 rounded-lg border border-border bg-card text-center font-mono text-base font-bold text-foreground outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              disabled={loading}
              autoFocus={idx === 0}
              autoComplete={idx === 0 ? "one-time-code" : "off"}
            />
          ))}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className="group relative h-[44px] w-full rounded-lg bg-primary text-xs font-medium text-white shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/95 flex items-center justify-center gap-1.5"
        >
          {loading ? "Verifying..." : "Verify & Onboard"}
          {!loading && <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />}
        </Button>

        {/* Cancel */}
        <button
          type="button"
          onClick={onGoBack}
          disabled={loading}
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition duration-150 cursor-pointer disabled:opacity-50"
        >
          Go back to registration
        </button>
      </form>
    </div>
  );
}
