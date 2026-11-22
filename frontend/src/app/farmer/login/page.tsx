"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginFarmer } from "@/lib/api";
import { setStoredFarmer } from "@/lib/auth";
import {
  UserCheck,
  Lock,
  LogIn,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  Wheat,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function FarmerLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your Mobile Number or Farmer ID and Password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await loginFarmer({ identifier: identifier.trim(), password });
      setStoredFarmer(res.farmer);
      router.push("/farmer/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid mobile number / Farmer ID or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoPhone: string, demoPass: string) => {
    setIdentifier(demoPhone);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Role Switcher Pill */}
        <div className="bg-[#12291f] p-1.5 rounded-2xl flex items-center border border-[#2d5241] shadow-md">
          <div className="flex-1 py-2 px-3 rounded-xl bg-[#2e7d32] text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm">
            <Wheat className="w-4 h-4 text-[#d4af37]" />
            <span>Farmer Portal</span>
          </div>
          <Link
            href="/officer/login"
            className="flex-1 py-2 px-3 rounded-xl text-emerald-200/80 hover:text-white hover:bg-[#1a382b] text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-all"
          >
            <Briefcase className="w-3.5 h-3.5 text-amber-300" />
            <span>Field Officer Login</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1a382b] text-[#d4af37] shadow-lg border border-[#2d5241] mb-1">
            <UserCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a382b] font-mono tracking-tight">
            Farmer Portal Login
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto">
            Access your registered farm plots, submit crop damage claims, and track verification status.
          </p>
        </div>

        {/* Form Card */}
        <div className="card-agri p-6 sm:p-8 space-y-6 shadow-xl border border-emerald-900/10">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-800 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Mobile Number or Farmer ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210 or FARMER-2026-411962"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8faf7] border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d32] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8faf7] border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d32] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Quick Demo Pre-Fill */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#d4af37]" /> Demo Farmer Accounts
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">Click to fill</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemo("9990754892", "farmer123")}
                  className="py-1.5 px-2 bg-white hover:bg-emerald-100/70 border border-emerald-200 rounded-lg text-[11px] font-medium text-emerald-900 text-left transition-colors cursor-pointer truncate"
                  title="Test Farmer (Ludhiana)"
                >
                  🌾 Test Farmer
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo("9880093065", "farmer123")}
                  className="py-1.5 px-2 bg-white hover:bg-emerald-100/70 border border-emerald-200 rounded-lg text-[11px] font-medium text-emerald-900 text-left transition-colors cursor-pointer truncate"
                  title="Farm Owner (Amritsar)"
                >
                  🌾 Farm Owner
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-agri-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Log In to Farmer Portal</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-gray-100 text-center space-y-2">
            <p className="text-xs text-gray-600">
              Don't have a farmer account yet?
            </p>
            <Link
              href="/farmer/register"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2e7d32] hover:text-[#1a382b] transition-colors"
            >
              <span>Register New Farmer Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Security badge & field officer redirect */}
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
            <ShieldCheck className="w-4 h-4 text-[#2e7d32]" />
            <span>Secured by Agri-Vision PBKDF2-SHA256 Authentication</span>
          </div>
          <p className="text-xs text-slate-500">
            Field Officer or Insurance Adjuster?{" "}
            <Link href="/officer/login" className="font-bold text-[#1a382b] hover:underline">
              Access Officer Console →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
