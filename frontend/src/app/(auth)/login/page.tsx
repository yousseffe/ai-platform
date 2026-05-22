"use client";

import React, { useState, useEffect } from "react";
import { Layers, ArrowRight, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/schemas";

/**
 * Login page client component.
 * Sets up credentials validation with React Hook Form and Zod schemas,
 * interfacing with NextAuth credentials authentication.
 *
 * @returns The LoginPage component rendering the authentication panel.
 */
export default function LoginPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [session, router]);

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
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-main flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-2 text-primary-600 font-bold text-2xl tracking-tight mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          ModelOps AI
        </div>

        <div className="card shadow-md border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Welcome back
          </h1>
          <p className="text-slate-500 mb-6">
            Enter your credentials to access your account.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(handleLogin)} className="space-y-5">
            <div>
              <label className="form-label text-xs">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  className={`form-input pl-10 ${
                    errors.email ? "border-red-500 focus:ring-red-100" : ""
                  }`}
                  placeholder="name@company.com"
                  {...register("email")}
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="form-label text-xs mb-0">Password</label>
                <a
                  href="#"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  className={`form-input pl-10 ${
                    errors.password ? "border-red-500 focus:ring-red-100" : ""
                  }`}
                  placeholder="••••••••"
                  {...register("password")}
                  disabled={loading}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 flex justify-center mt-2 cursor-pointer"
            >
              {loading ? "Signing In..." : "Sign In"}{" "}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-bold text-primary-600 hover:text-primary-700"
          >
            Request access
          </Link>
        </p>
      </div>
    </div>
  );
}
