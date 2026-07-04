import React, { useState } from "react";
import { ArrowRight, Mail, User, Lock, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface RegisterFormProps {
  onSubmit: (data: RegisterInput) => Promise<void>;
  loading: boolean;
}

const authInputClassName =
  "h-[44px] rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all duration-150 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 outline-none w-full";

export default function RegisterForm({ onSubmit, loading }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left select-none">
      <div className="space-y-1.5">
        <Label htmlFor="reg-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Email address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            id="reg-email"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            {...register("email")}
            disabled={loading}
            aria-invalid={!!errors.email}
            className={authInputClassName}
          />
        </div>
        {errors.email && (
          <p className="text-[11px] font-medium text-destructive/90 animate-fade-in">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-full-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Full name
        </Label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            id="reg-full-name"
            type="text"
            placeholder="Ahmed Amr"
            autoComplete="name"
            {...register("full_name")}
            disabled={loading}
            aria-invalid={!!errors.full_name}
            className={authInputClassName}
          />
        </div>
        {errors.full_name && (
          <p className="text-[11px] font-medium text-destructive/90 animate-fade-in">{errors.full_name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("password")}
            disabled={loading}
            aria-invalid={!!errors.password}
            className={authInputClassName}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition hover:text-slate-600 dark:hover:text-slate-300"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-[11px] font-medium text-destructive/90 animate-fade-in">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-confirm-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Confirm password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            id="reg-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("confirmPassword")}
            disabled={loading}
            aria-invalid={!!errors.confirmPassword}
            className={authInputClassName}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition hover:text-slate-600 dark:hover:text-slate-300"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-[11px] font-medium text-destructive/90 animate-fade-in">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading || !isValid}
        size="lg"
        className="group relative mt-2 h-[44px] w-full rounded-lg bg-primary text-xs font-medium text-white shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/95 flex items-center justify-center gap-1.5"
      >
        {loading ? "Creating Account..." : "Create Account"}
        {!loading && <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />}
      </Button>
    </form>
  );
}
