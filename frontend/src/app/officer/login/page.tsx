"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginOfficer, FieldOfficer } from "@/lib/api";
import { setStoredOfficer } from "@/lib/auth";
import {
  ShieldCheck,
  Award,
  Lock,
  LogIn,
  ArrowRight,
  AlertCircle,
  Wheat,
  Briefcase,
  Sparkles,
  Building2,
  CheckCircle2,
} from "lucide-react";

export default function OfficerLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your Officer ID, Badge Number, or Official Email and Password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await loginOfficer({ identifier: identifier.trim(), password });
      setStoredOfficer(res.officer);
      router.push("/officer/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid Officer ID / Badge Number or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoId: string, demoPass: string) => {
    setIdentifier(demoId);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Role Switcher Pill */}
        <div className="bg-[#12291f] p-1.5 rounded-2xl flex items-center border border-[#2d5241] shadow-md">
          <Link
            href="/farmer/login"
            className="flex-1 py-2 px-3 rounded-xl text-emerald-200/80 hover:text-white hover:bg-[#1a382b] text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-all"
          >
            <Wheat className="w-3.5 h-3.5 text-emerald-300" />
            <span>Farmer Portal</span>
          </Link>
          <div className="flex-1 py-2 px-3 rounded-xl bg-[#d4af37] text-[#12291f] text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-[#12291f]" />
            <span>Field Officer Portal</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1a382b] text-[#d4af37] shadow-lg border border-[#2d5241] mb-1">
            <Award className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a382b] font-mono tracking-tight">
            Field Officer Login
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto">
            Authorized portal for agricultural insurance claims adjusters, agronomists, and field audit officers.
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
                Officer ID, Badge Number, or Official Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. OFFICER-409, #409, or j.smith@agri-vision.gov"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8faf7] border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent transition-all font-mono"
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
                  className="w-full px-4 py-3 bg-[#f8faf7] border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent transition-all font-mono"
                />
              </div>
            </div>

            {/* Quick Demo Pre-Fill */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#d4af37]" /> Demo Officer Credentials
                </span>
                <span className="text-[10px] text-amber-800 font-medium">Click to prefill</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemo("OFFICER-409", "officer123")}
                  className="py-1.5 px-2.5 bg-white hover:bg-amber-100/70 border border-amber-200 rounded-lg text-[11px] font-medium text-amber-950 text-left transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold">🛡️ Adjuster J. Smith (#409)</span>
                  <span className="text-[10px] text-amber-700">Senior Claims Adjuster</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo("#108", "officer123")}
                  className="py-1.5 px-2.5 bg-white hover:bg-amber-100/70 border border-amber-200 rounded-lg text-[11px] font-medium text-amber-950 text-left transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold">🔬 Dr. Priya Sharma (#108)</span>
                  <span className="text-[10px] text-amber-700">Field Agronomist</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo("#722", "officer123")}
                  className="py-1.5 px-2.5 bg-white hover:bg-amber-100/70 border border-amber-200 rounded-lg text-[11px] font-medium text-amber-950 text-left transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold">📋 Inspector R. Kumar (#722)</span>
                  <span className="text-[10px] text-amber-700">Northern Zone Risk</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-agri-gold py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Access Field Officer Console</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-gray-100 text-center space-y-2">
            <p className="text-xs text-gray-600">
              Need to submit a crop damage claim as a farmer?
            </p>
            <Link
              href="/farmer/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2e7d32] hover:text-[#1a382b] transition-colors"
            >
              <span>Go to Farmer Portal Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Security badge */}
        <div className="space-y-1.5 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
            <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
            <span>Authorized Field Officer Gateway • PBKDF2 Encrypted</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Claims verification determinations are digitally signed and recorded in official audit logs.
          </p>
        </div>
      </div>
    </div>
  );
}
