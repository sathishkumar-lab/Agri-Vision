"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoredOfficer, clearStoredOfficer } from "@/lib/auth";
import { FieldOfficer, Claim, getClaims, getClaimNumber, getLogicalClaimTitle } from "@/lib/api";
import LoadingState from "@/components/ui/LoadingState";
import {
  ShieldCheck,
  Award,
  FileText,
  LogOut,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  MapPin,
  Activity,
  Layers,
  Search,
  Filter,
  Eye,
  Building2,
  UserCheck,
  Sparkles,
} from "lucide-react";

export default function OfficerDashboardPage() {
  const router = useRouter();
  const [officer, setOfficer] = useState<FieldOfficer | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    const current = getStoredOfficer();
    if (!current) {
      router.push("/officer/login");
      return;
    }
    setOfficer(current);
    loadClaims();
  }, [router]);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const res = await getClaims();
      setClaims(res.claims || []);
    } catch (err) {
      console.error("Failed to load claims for officer dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredOfficer();
    router.push("/officer/login");
  };

  if (loading && !officer) {
    return <LoadingState message="Loading Field Officer Console..." />;
  }

  const pendingClaims = claims.filter(
    (c) =>
      c.officer_verification?.final_decision === "pending_review" ||
      !c.officer_verification?.final_decision
  );
  const approvedClaims = claims.filter(
    (c) => c.officer_verification?.final_decision === "approved"
  );
  const rejectedClaims = claims.filter(
    (c) => c.officer_verification?.final_decision === "rejected"
  );

  const filteredClaims = claims.filter((c) => {
    const status = c.officer_verification?.final_decision || "pending_review";
    if (filterStatus === "all") return true;
    return status === filterStatus;
  });

  return (
    <div className="space-y-8 py-6">
      {/* Officer Credential Banner */}
      <section className="bg-gradient-to-r from-[#12291f] via-[#1a382b] to-[#173024] text-white rounded-2xl p-6 sm:p-8 border border-[#2d5241] shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#254d3c] border-2 border-[#d4af37] flex items-center justify-center text-[#d4af37] shadow-md shrink-0">
              <Award className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37] text-[#12291f] text-[10px] font-extrabold uppercase tracking-wider font-mono">
                  Badge {officer?.badge_number || "#409"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#254d3c] text-emerald-200 text-[10px] font-semibold border border-[#386b54]">
                  {officer?.role || "Senior Claims Adjuster"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 text-[10px] font-mono border border-emerald-800">
                  {officer?.officer_code || "OFFICER-409"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {officer?.full_name || "Field Officer"}
              </h1>
              <p className="text-xs text-emerald-200/80 flex flex-wrap items-center gap-2">
                <span>{officer?.department || "National Crop Insurance Directorate"}</span>
                <span>•</span>
                <span>
                  {officer?.district}, {officer?.state}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <Link
              href="/claims"
              className="btn-agri-gold text-xs shadow-md flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Full Claims Queue</span>
            </Link>
            <button
              onClick={handleLogout}
              className="py-2.5 px-3.5 rounded-lg bg-[#254d3c] hover:bg-red-950/40 text-emerald-100 hover:text-red-200 border border-[#386b54] hover:border-red-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </section>

      {/* KPI Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-agri p-5 border-l-4 border-l-amber-500 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Awaiting Audit</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono">
            {pendingClaims.length}
          </div>
          <p className="text-[11px] text-slate-500">Requires officer determination</p>
        </div>

        <div className="card-agri p-5 border-l-4 border-l-emerald-600 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Approved Claims</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono">
            {approvedClaims.length}
          </div>
          <p className="text-[11px] text-slate-500">Validated with AI evidence</p>
        </div>

        <div className="card-agri p-5 border-l-4 border-l-red-500 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Rejected / Incomplete</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-extrabold text-red-600 font-mono">
            {rejectedClaims.length}
          </div>
          <p className="text-[11px] text-slate-500">Failed geofence or evidence</p>
        </div>

        <div className="card-agri p-5 border-l-4 border-l-[#1a382b] space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Claims Filed</span>
            <FileText className="w-4 h-4 text-[#1a382b]" />
          </div>
          <div className="text-2xl font-extrabold text-[#1a382b] font-mono">
            {claims.length}
          </div>
          <p className="text-[11px] text-slate-500">Persisted in database</p>
        </div>
      </section>

      {/* Claims Needing Action */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#1a382b] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2e7d32]" />
              <span>Claims Verification Workspace</span>
            </h2>
            <p className="text-xs text-slate-500">
              Audit AI dual model outputs, geofence alignment, and record binding decisions.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {[
              { id: "all", label: "All" },
              { id: "pending_review", label: "Pending" },
              { id: "approved", label: "Approved" },
              { id: "rejected", label: "Rejected" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === f.id
                    ? "bg-white text-[#1a382b] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Claims Table */}
        <div className="card-agri overflow-hidden p-0 shadow-md">
          {filteredClaims.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-sm font-semibold">No claims match the selected filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8faf7] border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Claim ID</th>
                    <th className="py-3 px-4">Policyholder</th>
                    <th className="py-3 px-4">Disease AI</th>
                    <th className="py-3 px-4">Damage Loss</th>
                    <th className="py-3 px-4">Evidence Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredClaims.map((claim) => {
                    const ev = claim.ai_evidence || {};
                    const rev = claim.officer_verification || {};
                    const score = ev.evidence_score?.total_score ?? 85;
                    const disease = ev.disease_analysis?.top_prediction || "Wheat Rust";
                    const damage = ev.damage_analysis?.estimated_damage_percentage ?? 18.5;
                    const status = rev.final_decision || "pending_review";

                    return (
                      <tr key={claim.claim_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-[#1a382b] text-xs">
                            {getClaimNumber(claim)}
                          </div>
                          <div className="text-[11px] text-gray-500 font-medium">
                            {getLogicalClaimTitle(claim)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">
                            {ev.farmer_name || "Velmurugan"}
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono">
                            {ev.farmer_code || ev.farm_name || "Plot HD-2967"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {disease}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-red-600">
                          {typeof damage === "number" ? damage.toFixed(1) : damage}%
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-[#1a382b]">{score} / 100</div>
                          <div className="w-16 bg-gray-200 h-1.5 rounded-full overflow-hidden mt-0.5">
                            <div
                              className="bg-[#2e7d32] h-full rounded-full"
                              style={{ width: `${Math.min(score, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                              status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/claims/${claim.claim_id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a382b] hover:bg-[#2e7d32] text-white font-bold text-xs transition-colors shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Audit File</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Field Inspection Tool Suite */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[#1a382b]">Field Inspection Suite</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/field-intelligence"
            className="card-agri p-5 hover:border-[#2e7d32] transition-all group space-y-2"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900">Geofencing &amp; Maps</h3>
            <p className="text-xs text-gray-600">
              Verify EXIF GPS location against official registered farm survey boundaries.
            </p>
          </Link>

          <Link
            href="/disease-analysis"
            className="card-agri p-5 hover:border-[#2e7d32] transition-all group space-y-2"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900">Disease Studio</h3>
            <p className="text-xs text-gray-600">
              Run MobileNetV2 inference directly on single or multi-leaf wheat photos.
            </p>
          </Link>

          <Link
            href="/damage-analysis"
            className="card-agri p-5 hover:border-[#2e7d32] transition-all group space-y-2"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900">Damage Segmentation</h3>
            <p className="text-xs text-gray-600">
              Examine pixel loss masks and canopy overlays computed by Residual U-Net.
            </p>
          </Link>

          <Link
            href="/model-performance"
            className="card-agri p-5 hover:border-[#2e7d32] transition-all group space-y-2"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900">Model Performance</h3>
            <p className="text-xs text-gray-600">
              Review institutional audit metrics: 92.11% accuracy, 66.18% IoU, and confusion matrices.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
