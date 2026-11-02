"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Sparkles, ShieldCheck, CheckCircle2, ArrowRight, UserCheck, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("caregiver@carecircle.demo");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("Sarah Vance");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
    const payload = isSignup ? { name, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed");
      } else {
        router.push(data.redirectUrl || "/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo-login", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        router.push(data.redirectUrl || "/dashboard");
      } else {
        setError(data.error || "Demo login failed");
      }
    } catch (err) {
      setError("Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-violet-50 text-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-rose-500 p-3 shadow-2xl shadow-indigo-500/30 mb-4">
          <Heart className="w-9 h-9 text-white fill-white animate-pulse" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-800 to-violet-600 bg-clip-text text-transparent">
          CareCircle
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Multi-Patient Caregiver Coordination Dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl p-6 sm:p-8">
          {/* 1-Click Demo Login Banner */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 to-violet-950/80 border border-indigo-700/50 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Instant Demo Access
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-800/80 text-indigo-200">
                2 Patients Seeded
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Experience the full caregiver dashboard with pre-loaded profiles for Margaret & Leo.
            </p>
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="mt-3 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white font-bold text-xs shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-2 transition-all group"
            >
              <UserCheck className="w-4 h-4" />
              <span>{loading ? "Signing in..." : "Launch Demo Account (Sarah Vance)"}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Or Sign In
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Quick Credential Fill for Reviewing Roles */}
          {!isSignup && (
            <div className="mt-2 mb-4">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Quick Role Autofill
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@carecircle.demo");
                    setPassword("AdminSecret2026!");
                  }}
                  className="px-2 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-[11px] font-semibold truncate transition-colors"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("caregiver@carecircle.demo");
                    setPassword("password123");
                  }}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold truncate transition-colors"
                >
                  Caregiver
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("david.vance@family.demo");
                    setPassword("FamilyCare2026!");
                  }}
                  className="px-2 py-1.5 rounded-lg bg-violet-950/80 hover:bg-violet-900 border border-violet-700/60 text-violet-300 text-[11px] font-semibold truncate transition-colors"
                >
                  Family (Son)
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-left">
            {isSignup && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Vance"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Caregiver Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="caregiver@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-900 hover:bg-white font-bold text-xs transition-colors shadow"
            >
              {loading ? "Processing..." : isSignup ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-xs text-slate-400 hover:text-indigo-400 font-medium transition-colors"
            >
              {isSignup
                ? "Already have an account? Sign in"
                : "New caregiver? Create an account"}
            </button>
          </div>
        </div>

        {/* Value Proposition Highlights */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <ShieldCheck className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-200">1-to-N Scoping</div>
            <div className="text-[9px] text-slate-400">Isolated Patient Records</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <CheckCircle2 className="w-4 h-4 text-violet-400 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-200">Med Tracking</div>
            <div className="text-[9px] text-slate-400">Refill & Adherence Alerts</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <Heart className="w-4 h-4 text-rose-400 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-200">Doctor Report</div>
            <div className="text-[9px] text-slate-400">Downloadable PDF Summary</div>
          </div>
        </div>
      </div>
    </div>
  );
}
