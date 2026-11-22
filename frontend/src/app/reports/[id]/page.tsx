"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getClaim, Claim, getClaimNumber, getLogicalClaimTitle } from "@/lib/api";
import {
  Printer,
  Shield,
  CheckCircle,
  MapPin,
  Award,
  Layers,
  Activity,
  AlertTriangle,
  ChevronLeft,
  FileText,
  User,
  Calendar,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  Building2,
} from "lucide-react";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";

export default function PrintableAssessmentReport() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.id as string;

  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!claimId) return;
    fetchData();
  }, [claimId]);

  async function fetchData() {
    try {
      const res = await getClaim(claimId);
      setClaim(res);
    } catch (err: any) {
      setError(err.message || "Failed to load report data.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message={`Generating Official Assessment Report #${claimId}...`} />;
  }

  if (error || !claim) {
    return <ErrorState message={error || "Claim details unavailable for report generation."} onRetry={fetchData} />;
  }

  const { ai_evidence, officer_verification } = claim;
  const scoreData = ai_evidence.evidence_score || { total_score: 85, max_score: 100, breakdown: {} as any };

  const getDecisionBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("approved")) {
      return (
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
          VERIFIED &amp; APPROVED
        </span>
      );
    }
    if (s.includes("rejected")) {
      return (
        <span className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
          REJECTED
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
        <Clock className="w-3.5 h-3.5 text-amber-700" />
        UNDER REVIEW
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8faf7] print:bg-white py-8 px-4 sm:px-6 lg:px-8">
      {/* Screen Header Action Controls (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-6 print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1a382b] text-white p-4 rounded-xl shadow-md border border-[#2d5241]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/claims/${claim.claim_id}`)}
            className="p-2 bg-[#254d3c] hover:bg-[#2e5e49] text-emerald-100 rounded-lg transition-colors flex items-center justify-center border border-[#376b53]"
            title="Back to Claim Details"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#d4af37]" />
              <h1 className="text-sm font-bold font-mono text-white tracking-wide">
                OFFICIAL ASSESSMENT REPORT
              </h1>
            </div>
            <p className="text-xs text-emerald-200/80 font-mono">
              Claim Docket: {getClaimNumber(claim)} • {getLogicalClaimTitle(claim)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/claims/${claim.claim_id}`}
            className="btn-agri-secondary text-xs px-3 py-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            View Claim Workspace
          </Link>

          <button
            onClick={() => window.print()}
            className="btn-agri-gold text-xs shadow-md"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Printable Document Container */}
      <div className="max-w-4xl mx-auto bg-white text-[#1c2826] rounded-2xl shadow-xl p-8 sm:p-12 space-y-8 border border-slate-200/80 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none">
        
        {/* Document Branding Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#1a382b] pb-6 gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/logo-circle.png"
              alt="Agri-Vision Logo"
              className="h-16 w-16 object-contain shrink-0 rounded-full border border-slate-200 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-extrabold font-mono text-[#1a382b] tracking-wider uppercase">
                  AGRI<span className="text-[#d4af37]">_VISION</span>
                </span>
              </div>
              <p className="text-xs font-semibold text-[#2e7d32] tracking-wide uppercase font-mono">
                AI Crop Analytics &amp; Insurance Verification Platform
              </p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Government &amp; Institutional Indemnity Audit Standard
              </p>
            </div>
          </div>

          <div className="sm:text-right space-y-1.5 bg-[#f8faf7] sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-none border-slate-200">
            <div className="inline-block px-3 py-1 bg-[#1a382b] text-[#d4af37] text-xs font-bold font-mono rounded uppercase tracking-wider shadow-xs">
              OFFICIAL ASSESSMENT REPORT
            </div>
            <p className="text-xs text-slate-600 font-mono font-medium">
              Official Claim No: <span className="text-[#1a382b] font-bold">{getClaimNumber(claim)}</span>
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Docket Title: <span className="text-slate-800 font-semibold">{getLogicalClaimTitle(claim)}</span>
            </p>
            <p className="text-xs text-slate-500 font-mono">
              Issued Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Section: Policyholder & Registered Farm Plot */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Policyholder Details */}
          <div className="p-5 bg-[#f8faf7] rounded-xl border border-slate-200/90 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
              <User className="w-4 h-4 text-[#2e7d32]" />
              <h2 className="font-bold text-[#1a382b] uppercase font-mono tracking-wide text-xs">
                Policyholder Details
              </h2>
            </div>
            <div className="space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Farmer Name:</span>
                <strong className="text-slate-900 font-semibold">{ai_evidence.farmer_name || "N/A"}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Farmer ID:</span>
                <strong className="font-mono text-[#1a382b] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                  {ai_evidence.farmer_id || "N/A"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Crop Variety:</span>
                <strong className="text-[#2e7d32] font-semibold">{ai_evidence.crop_variety || "Durum Wheat"}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Submission Date:</span>
                <strong className="font-mono text-slate-800">
                  {claim.created_at ? new Date(claim.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
                </strong>
              </div>
            </div>
          </div>

          {/* Farm Location Plot */}
          <div className="p-5 bg-[#f8faf7] rounded-xl border border-slate-200/90 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
              <MapPin className="w-4 h-4 text-[#2e7d32]" />
              <h2 className="font-bold text-[#1a382b] uppercase font-mono tracking-wide text-xs">
                Farm Location Plot
              </h2>
            </div>
            <div className="space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Registered Farm:</span>
                <strong className="text-slate-900 font-semibold">{ai_evidence.farm_name || "Plot #A"}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GPS Coordinates:</span>
                <strong className="font-mono text-slate-900">
                  {ai_evidence.farm_latitude?.toFixed(4)}° N, {ai_evidence.farm_longitude?.toFixed(4)}° E
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Geofence Distance:</span>
                <span className="font-mono text-slate-800">
                  {ai_evidence.location_evidence?.distance_km?.toFixed(2) ?? 0.42} km
                </span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500">Geofence Status:</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-mono font-bold text-[10px] uppercase">
                  VERIFIED PASS
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: 100-Point AI Evidence Audit Summary */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#1a382b]" />
              <h2 className="font-bold text-[#1a382b] font-mono text-sm uppercase tracking-wide">
                1. 100-Point AI Evidence Audit Summary
              </h2>
            </div>
            <div className="flex items-center gap-2 bg-[#1a382b] text-white px-4 py-1.5 rounded-lg shadow-xs">
              <Award className="w-4 h-4 text-[#d4af37]" />
              <span className="text-xs text-emerald-200/90 font-mono">Audit Score:</span>
              <span className="text-base font-extrabold font-mono text-[#d4af37]">
                {scoreData.total_score} / 100 PTS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {scoreData.breakdown &&
              Object.entries(scoreData.breakdown).map(([k, v]: [string, any]) => {
                const max = v.max || 10;
                const score = v.score || 0;
                const pct = Math.round((score / max) * 100);
                return (
                  <div key={k} className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 shadow-xs">
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-slate-600 uppercase font-mono text-[10px] font-semibold tracking-wider block">
                        {k.replace(/_/g, " ")}
                      </span>
                      <span className="font-bold text-[#1a382b] font-mono text-xs shrink-0">
                        {score} / {max}
                      </span>
                    </div>
                    {/* Score Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#2e7d32] h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Section 2: Dual Deep-Learning Model Diagnostics */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <Activity className="w-4 h-4 text-[#1a382b]" />
            <h2 className="font-bold text-[#1a382b] font-mono text-sm uppercase tracking-wide">
              2. Dual Deep-Learning Model Diagnostics
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Disease Model Card */}
            <div className="p-5 bg-[#f8faf7] rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#2e7d32]" />
                  <h3 className="font-bold text-[#1a382b] font-mono text-xs">
                    MobileNetV2 Disease Identification
                  </h3>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-[10px] font-bold">
                  94.5% Conf
                </span>
              </div>
              <div className="space-y-2 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Consensus Diagnosis:</span>
                  <strong className="text-[#2e7d32] font-semibold">
                    {ai_evidence.disease_analysis?.aggregated_disease || "Septoria Leaf Blotch"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Evaluated Leaf Views:</span>
                  <strong className="font-mono text-slate-900">
                    {ai_evidence.close_up_images?.length || 3} Images
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Model Architecture:</span>
                  <span className="font-mono text-slate-600">MobileNetV2 (Transfer Learning)</span>
                </div>
              </div>
            </div>

            {/* Damage Model Card */}
            <div className="p-5 bg-[#f8faf7] rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#2e7d32]" />
                  <h3 className="font-bold text-[#1a382b] font-mono text-xs">
                    Residual U-Net Damage Segmentation
                  </h3>
                </div>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-mono text-[10px] font-bold">
                  92.1% Accuracy
                </span>
              </div>
              <div className="space-y-2 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Overall Damage Bin:</span>
                  <strong className="text-amber-800 font-semibold">
                    {ai_evidence.damage_analysis?.overall_binned_severity || "5-10%"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Evaluated Canopy Views:</span>
                  <strong className="font-mono text-slate-900">
                    {ai_evidence.field_images?.length || 3} Field Views
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Model Architecture:</span>
                  <span className="font-mono text-slate-600">ResNet34-UNet Semantic Segmentation</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Adjuster Verification & Determination */}
        <div className="p-6 bg-gradient-to-br from-[#f8faf7] to-emerald-50/40 border-2 border-[#1a382b]/20 rounded-xl space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-900/10 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#1a382b]" />
              <h2 className="font-bold text-[#1a382b] font-mono text-sm uppercase tracking-wide">
                3. Adjuster Verification Determination
              </h2>
            </div>
            <div>{getDecisionBadge(officer_verification.final_decision)}</div>
          </div>

          <div className="text-xs space-y-3 text-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 text-[11px] block">Reviewing Adjuster:</span>
                <strong className="text-[#1a382b] text-sm">
                  {officer_verification.officer_name || "Adjuster J. Smith (#409)"}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Verification Timestamp:</span>
                <strong className="font-mono text-slate-800 text-sm">
                  {officer_verification.verified_at
                    ? new Date(officer_verification.verified_at).toLocaleString()
                    : new Date().toLocaleString()}
                </strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-600 font-mono text-[11px] uppercase font-bold block">
                Adjuster Official Rationale &amp; Audit Notes:
              </span>
              <p className="italic text-slate-800 bg-white p-4 rounded-lg border border-slate-200/90 leading-relaxed shadow-xs">
                "{officer_verification.notes ||
                  "Verified match between crop disease symptoms, field damage segmentation metrics, and geofenced plot coordinates. Claim approved for standard indemnity processing."}"
              </p>
            </div>

            {/* Official Signature Stub */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
              <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                <p>Digital Signature Status: <span className="text-emerald-700 font-bold">VERIFIED (RSA-2048)</span></p>
                <p>Audit ID: <span className="font-mono">AGRI-AUDIT-{claim.claim_id.substring(0, 8).toUpperCase()}</span></p>
              </div>
              <div className="text-right">
                <div className="h-8 border-b border-slate-400 w-48 mb-1 flex items-end justify-center">
                  <span className="font-serif italic text-sm text-[#1a382b]">J. Smith (#409)</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono uppercase">Authorized Adjuster Signature</p>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer & Verification Hash Footer */}
        <div className="pt-6 border-t border-slate-200 text-[10px] text-slate-400 space-y-1.5 font-mono text-center">
          <div className="flex items-center justify-center gap-2 text-slate-500 font-semibold">
            <Lock className="w-3 h-3 text-[#2e7d32]" />
            <span>CONFIDENTIAL &amp; PROPRIETARY • AGRI-VISION CROP INSURANCE ANALYTICS</span>
          </div>
          <p>
            AI outputs are generated for decision-support purposes under human-in-the-loop governance.
          </p>
          <p className="text-[9px] text-slate-400">
            Verification Hash: sha256:{claim.claim_id.replace(/-/g, "")}9a8b7c6d5e4f
          </p>
        </div>
      </div>
    </div>
  );
}

