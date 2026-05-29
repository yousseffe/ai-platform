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
        <Label htmlFor="reg-email" className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="reg-email"
            type="email"
            className={`pl-10 h-10 border-slate-200 focus-visible:ring-primary-500/20 focus-visible:border-primary-500 ${
              errors.email ? "border-red-500 focus-visible:ring-red-100" : ""
            }`}
            placeholder="name@company.com"
            {...register("email")}
            disabled={loading}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-username" className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Username
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="reg-username"
            type="text"
            className={`pl-10 h-10 border-slate-200 focus-visible:ring-primary-500/20 focus-visible:border-primary-500 ${
              errors.username ? "border-red-500 focus-visible:ring-red-100" : ""
            }`}
            placeholder="john_doe"
            {...register("username")}
            disabled={loading}
          />
        </div>
        {errors.username && (
          <p className="text-xs text-red-500 mt-1 font-medium">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password" className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="reg-password"
            type="password"
            className={`pl-10 h-10 border-slate-200 focus-visible:ring-primary-500/20 focus-visible:border-primary-500 ${
              errors.password ? "border-red-500 focus-visible:ring-red-100" : ""
            }`}
            placeholder="••••••••"
            {...register("password")}
            disabled={loading}
          />
        </div>
        {errors.password && (
          <p className="text-xs text-red-500 mt-1 font-medium">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-confirm-password" className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Confirm Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="reg-confirm-password"
            type="password"
            className={`pl-10 h-10 border-slate-200 focus-visible:ring-primary-500/20 focus-visible:border-primary-500 ${
              errors.confirmPassword ? "border-red-500 focus-visible:ring-red-100" : ""
            }`}
            placeholder="••••••••"
            {...register("confirmPassword")}
            disabled={loading}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-500 mt-1 font-medium">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-500 hover:bg-primary-600 text-white h-10 flex justify-center mt-2 cursor-pointer"
      >
        {loading ? "Creating Account..." : "Create Account"}{" "}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </form>
  );
}
