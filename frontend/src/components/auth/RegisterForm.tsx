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
 * Redesigned in the premium Expo Go console theme.
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 font-sans">
      <div className="space-y-1.5 text-left">
        <Label htmlFor="reg-email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground select-none" />
          <Input
            id="reg-email"
            type="email"
            className={`pl-10 w-full h-9 bg-background border border-border rounded-lg text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all ${
              errors.email ? "border-destructive focus-visible:ring-destructive/20 focus-visible:border-destructive" : ""
            }`}
            style={{ paddingLeft: "2.25rem" }}
            placeholder="name@company.com"
            {...register("email")}
            disabled={loading}
          />
        </div>
        {errors.email && (
          <p className="text-[10px] text-destructive mt-1 font-semibold">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5 text-left">
        <Label htmlFor="reg-full-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Full Name
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground select-none" />
          <Input
            id="reg-full-name"
            type="text"
            className={`pl-10 w-full h-9 bg-background border border-border rounded-lg text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all ${
              errors.full_name ? "border-destructive focus-visible:ring-destructive/20 focus-visible:border-destructive" : ""
            }`}
            style={{ paddingLeft: "2.25rem" }}
            placeholder="Ahmed Amr"
            {...register("full_name")}
            disabled={loading}
          />
        </div>
        {errors.full_name && (
          <p className="text-[10px] text-destructive mt-1 font-semibold">{errors.full_name.message}</p>
        )}
      </div>

      <div className="space-y-1.5 text-left">
        <Label htmlFor="reg-password" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground select-none" />
          <Input
            id="reg-password"
            type="password"
            className={`pl-10 w-full h-9 bg-background border border-border rounded-lg text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all ${
              errors.password ? "border-destructive focus-visible:ring-destructive/20 focus-visible:border-destructive" : ""
            }`}
            style={{ paddingLeft: "2.25rem" }}
            placeholder="••••••••"
            {...register("password")}
            disabled={loading}
          />
        </div>
        {errors.password && (
          <p className="text-[10px] text-destructive mt-1 font-semibold">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5 text-left">
        <Label htmlFor="reg-confirm-password" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Confirm Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground select-none" />
          <Input
            id="reg-confirm-password"
            type="password"
            className={`pl-10 w-full h-9 bg-background border border-border rounded-lg text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all ${
              errors.confirmPassword ? "border-destructive focus-visible:ring-destructive/20 focus-visible:border-destructive" : ""
            }`}
            style={{ paddingLeft: "2.25rem" }}
            placeholder="••••••••"
            {...register("confirmPassword")}
            disabled={loading}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-[10px] text-destructive mt-1 font-semibold">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-2 flex justify-center mt-3 cursor-pointer rounded-lg text-xs font-semibold shadow-sm h-9"
      >
        {loading ? "Creating Account..." : "Create Account"}{" "}
        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
      </Button>
    </form>
  );
}
