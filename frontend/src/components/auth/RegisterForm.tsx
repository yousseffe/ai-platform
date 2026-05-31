"use client";

import React from "react";
import { Mail, User, Lock, ArrowRight } from "lucide-react";
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

/**
 * Registration form component handling user profile details onboarding.
 * Implements inline validation using Zod and react-hook-form.
 * Migrated to Shadcn UI components.
 *
 * @param props - Component properties containing submission trigger and loading state.
 * @returns The React component rendering the registration input fields.
 */
export default function RegisterForm({ onSubmit, loading }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="reg-email" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 select-none" />
          <Input
            id="reg-email"
            type="email"
            className={`pl-10 h-10 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-foreground placeholder-slate-400 dark:placeholder-slate-500 focus-visible:bg-white dark:focus-visible:bg-slate-950/80 focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:border-primary ${
              errors.email ? "border-red-500 focus-visible:ring-red-100" : ""
            }`}
            style={{ paddingLeft: "2.5rem" }}
            placeholder="name@company.com"
            {...register("email")}
            disabled={loading}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-username" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Username
        </Label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 select-none" />
          <Input
            id="reg-username"
            type="text"
            className={`pl-10 h-10 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-foreground placeholder-slate-400 dark:placeholder-slate-500 focus-visible:bg-white dark:focus-visible:bg-slate-950/80 focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:border-primary ${
              errors.username ? "border-red-500 focus-visible:ring-red-100" : ""
            }`}
            style={{ paddingLeft: "2.5rem" }}
            placeholder="john_doe"
            {...register("username")}
            disabled={loading}
          />
        </div>
        {errors.username && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 select-none" />
          <Input
            id="reg-password"
            type="password"
            className={`pl-10 h-10 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-foreground placeholder-slate-400 dark:placeholder-slate-500 focus-visible:bg-white dark:focus-visible:bg-slate-950/80 focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:border-primary ${
              errors.password ? "border-red-500 focus-visible:ring-red-100" : ""
            }`}
            style={{ paddingLeft: "2.5rem" }}
            placeholder="••••••••"
            {...register("password")}
            disabled={loading}
          />
        </div>
        {errors.password && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-confirm-password" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Confirm Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 select-none" />
          <Input
            id="reg-confirm-password"
            type="password"
            className={`pl-10 h-10 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-foreground placeholder-slate-400 dark:placeholder-slate-500 focus-visible:bg-white dark:focus-visible:bg-slate-950/80 focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:border-primary ${
              errors.confirmPassword ? "border-red-500 focus-visible:ring-red-100" : ""
            }`}
            style={{ paddingLeft: "2.5rem" }}
            placeholder="••••••••"
            {...register("confirmPassword")}
            disabled={loading}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 flex justify-center mt-2 cursor-pointer rounded-lg text-xs font-bold uppercase tracking-wider"
      >
        {loading ? "Creating Account..." : "Create Account"}{" "}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </form>
  );
}
