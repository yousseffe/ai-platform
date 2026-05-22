"use client";

import React, { useState, useEffect } from "react";
import { Layers, ArrowRight, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/actions/auth.actions";
import { signIn, useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/schemas";

/**
 * Registration page client component.
 * Allows users to register new credentials, performing schemas validations via Zod
 * and Hook Form, and logging them in on successful creation.
 *
 * @returns The RegisterPage component rendering the onboarding card.
 */
export default function RegisterPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [session, router]);

  const handleRegister = async (data: RegisterInput) => {
    setError("");
    setLoading(true);

    try {
      const res = await registerUser(data.email, data.password);
      if (res.success) {
        const loginRes = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        });

        if (loginRes?.error) {
          router.push("/login");
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        setError(res.error || "Failed to register");
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
            Create an account
          </h1>
          <p className="text-slate-500 mb-6">
            Start deploying your machine learning models today.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(handleRegister)} className="space-y-5">
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
              <label className="form-label text-xs">Password</label>
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

            <div>
              <label className="form-label text-xs">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  className={`form-input pl-10 ${
                    errors.confirmPassword ? "border-red-500 focus:ring-red-100" : ""
                  }`}
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  disabled={loading}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 flex justify-center mt-2 cursor-pointer"
            >
              {loading ? "Creating Account..." : "Create Account"}{" "}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-primary-600 hover:text-primary-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
