"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";

import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginInput, loginSchema } from "@/lib/schemas";

const authInputClassName =
  "h-[44px] rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all duration-150 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 outline-none w-full";

export default function LoginPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [router, session]);

  const handleLogin = async (data: LoginInput) => {
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password");
        toast.error("Invalid email or password");
      } else {
        toast.success("Successfully logged in!");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      toast.error("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in to your account"
      description="Access your workspace, manage deployments, and continue scaling machine learning models from one place."
      actionText="Need an account?"
      actionLabel="Sign up"
      actionHref="/register"
    >
      <Card className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 shadow-sm backdrop-blur-md">
        <CardContent className="p-5 sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/15 bg-destructive/5 px-4 py-2.5 text-[11px] font-medium text-destructive/90 animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(handleLogin)} className="space-y-4 text-left select-none">
            <div className="space-y-1.5">
              <Label htmlFor="login-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  id="login-email"
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
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="login-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <Link href="#" className="text-[11px] font-semibold text-primary transition hover:text-primary-600">
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
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

            <Button
              type="submit"
              disabled={loading || !isValid}
              size="lg"
              className="group relative mt-2 h-[44px] w-full rounded-lg bg-primary text-xs font-medium text-white shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/95 flex items-center justify-center gap-1.5"
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
