"use client";

import React from "react";
import Link from "next/link";
import {
  Wheat,
  ShieldCheck,
  UserCheck,
  Award,
  ArrowRight,
  Sparkles,
  Layers,
  MapPin,
  CheckCircle2,
  FileText,
  Lock,
} from "lucide-react";

export default function UnifiedLoginPortalPage() {
  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 space-y-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#1a382b] border border-[#2d5241] text-[#d4af37] text-xs font-semibold uppercase tracking-wider font-mono shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
          <span>Agri-Vision Access Gateway</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a382b] tracking-tight">
          Select Your Portal to Sign In
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
          Agri-Vision provides dedicated, role-tailored authentication for both agricultural producers and authorized claims verification officers.
        </p>
      </div>

      {/* Dual Portal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Card 1: Farmer Portal */}
        <div className="card-agri p-8 flex flex-col justify-between border-2 border-emerald-900/10 hover:border-[#2e7d32] shadow-xl transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-[#1a382b] text-[#d4af37] border border-[#2d5241] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Wheat className="w-7 h-7" />
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#2e7d32] text-xs font-bold uppercase tracking-wider font-mono">
                Producers &amp; Farmers
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#1a382b]">Farmer Portal</h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                Registered policyholders can log in using mobile number or Farmer Code to manage farm plots, submit crop damage photos, and track claim review decisions.
              </p>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-gray-100 text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2e7d32] shrink-0" />
                <span>Register GPS-bounded wheat farm plots &amp; survey numbers</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2e7d32] shrink-0" />
                <span>Upload 3–5 multi-zone leaf &amp; field canopy photographs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2e7d32] shrink-0" />
                <span>Real-time claim status tracking and instant AI pre-audit score</span>
              </div>
            </div>
          </div>

          <div className="pt-8 space-y-3">
            <Link
              href="/farmer/login"
              className="w-full btn-agri-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-110 transition-all text-center"
            >
              <UserCheck className="w-4 h-4" />
              <span>Log In as Farmer</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <div className="text-center">
              <Link
                href="/farmer/register"
                className="text-xs font-bold text-[#2e7d32] hover:underline"
              >
                New farmer? Register your account →
              </Link>
            </div>
          </div>
        </div>

        {/* Card 2: Field Officer Portal */}
        <div className="card-agri p-8 flex flex-col justify-between border-2 border-amber-900/10 hover:border-[#d4af37] shadow-xl transition-all relative overflow-hidden group bg-gradient-to-b from-white to-[#fcfaf4]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none" />

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-[#12291f] text-[#d4af37] border-2 border-[#d4af37]/40 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-7 h-7 text-[#d4af37]" />
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider font-mono">
                Insurance Adjusters &amp; Audit
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#1a382b]">Field Officer Portal</h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                Authorized field loss assessors, claims adjusters, and institutional auditors sign in using their Badge Number or Officer Code for decision enforcement.
              </p>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-gray-100 text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Inspect MobileNetV2 disease consensus (98.4% confidence)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Evaluate Residual U-Net damage segmentation &amp; loss %</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Geofence radius validation and legally binding final sign-off</span>
              </div>
            </div>
          </div>

          <div className="pt-8 space-y-3">
            <Link
              href="/officer/login"
              className="w-full btn-agri-gold py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-110 transition-all text-center"
            >
              <Award className="w-4 h-4" />
              <span>Log In as Field Officer</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <div className="text-center text-xs text-gray-500">
              Pre-seeded adjusters: <span className="font-mono font-semibold text-gray-700">#409, #108, #722</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Footer Notice */}
      <div className="bg-[#1a382b]/5 border border-[#1a382b]/15 rounded-2xl p-4 text-center max-w-2xl mx-auto flex items-center justify-center gap-3 text-xs text-gray-600">
        <Lock className="w-4 h-4 text-[#2e7d32] shrink-0" />
        <span>
          Dual-role encrypted session management. All claim determinations and observation logs are cryptographically bound to authenticated user profiles.
        </span>
      </div>
    </div>
  );
}
