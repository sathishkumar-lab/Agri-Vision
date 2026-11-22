"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClaims, Claim, getClaimNumber, getLogicalClaimTitle } from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  FileText,
  Clock,
  CheckCircle2,
  Layers,
  Award,
  PlusCircle,
  Eye,
  RefreshCw,
  Search,
} from "lucide-react";

export default function DashboardPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClaims();
      setClaims(data?.claims || []);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load claims database. Please ensure Agri-Vision backend and PostgreSQL are running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute stats
  const totalClaims = claims.length;
  const pendingClaims = claims.filter(
    (c) => c.officer_verification?.final_decision === "pending_review" || !c.officer_verification?.final_decision
  ).length;
  const verifiedClaims = claims.filter(
    (c) => c.officer_verification?.final_decision === "approved" || c.officer_verification?.final_decision === "rejected"
  ).length;

  const avgDamage = totalClaims > 0
    ? claims.reduce((acc, c) => {
        const dmg = c.ai_evidence?.damage_analysis?.overall_damage_percentage || c.ai_evidence?.damage_analysis?.visible_damage_percentage || 0;
        return acc + Number(dmg);
      }, 0) / totalClaims
    : 0;

  const avgEvidenceScore = totalClaims > 0
    ? claims.reduce((acc, c) => {
        const score = c.ai_evidence?.evidence_score?.total_score || 80;
        return acc + Number(score);
      }, 0) / totalClaims
    : 0;

  const filteredClaims = claims.filter((claim) => {
    const status = claim.officer_verification?.final_decision || "pending_review";
    const matchesStatus = filterStatus === "all" || status === filterStatus;
    const searchLower = searchQuery.toLowerCase();
    const farmer = (claim.ai_evidence?.farmer_name || "").toLowerCase();
    const farm = (claim.ai_evidence?.farm_name || "").toLowerCase();
    const id = claim.claim_id.toLowerCase();
    const claimCode = getClaimNumber(claim).toLowerCase();
    const claimTitle = getLogicalClaimTitle(claim).toLowerCase();
    return matchesStatus && (farmer.includes(searchLower) || farm.includes(searchLower) || id.includes(searchLower) || claimCode.includes(searchLower) || claimTitle.includes(searchLower));
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        category="Agri-Vision Control Center"
        title="Crop Insurance Claims Dashboard"
        description="Executive overview of submitted wheat insurance claims, AI evidence scores, and officer verification queues."
        action={
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchDashboardData}
              className="btn-agri-secondary text-xs px-3 py-2"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#2e7d32]" : ""}`} />
            </button>
            <Link href="/claims/new" className="btn-agri-gold text-xs px-4 py-2">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Claim</span>
            </Link>
          </div>
        }
      />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card-agri space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Claims</span>
            <FileText className="w-4 h-4 text-[#2e7d32]" />
          </div>
          <div className="text-2xl font-extrabold text-[#1a382b] font-mono">{totalClaims}</div>
          <p className="text-[11px] text-slate-500">Submitted in database</p>
        </div>

        <div className="card-agri space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-900 font-mono">{pendingClaims}</div>
          <p className="text-[11px] text-amber-700 font-medium">Awaiting officer decision</p>
        </div>

        <div className="card-agri space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verified Claims</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-[#1a382b] font-mono">{verifiedClaims}</div>
          <p className="text-[11px] text-emerald-700 font-medium">Determinations recorded</p>
        </div>

        <div className="card-agri space-y-1">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Crop Damage</span>
            <Layers className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold text-red-700 font-mono">{avgDamage.toFixed(1)}%</div>
          <p className="text-[11px] text-slate-500">Crop-only loss ratio</p>
        </div>

        <div className="card-agri space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Evidence Score</span>
            <Award className="w-4 h-4 text-[#b89528]" />
          </div>
          <div className="text-2xl font-extrabold text-[#1a382b] font-mono">{avgEvidenceScore.toFixed(0)} <span className="text-xs text-slate-500 font-normal">/ 100</span></div>
          <p className="text-[11px] text-slate-500">AI evidence score</p>
        </div>
      </div>

      {/* Directory Table Section */}
      <div className="card-agri space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-[#1a382b]">Recent Claim Audit Records</h2>
            <p className="text-xs text-slate-600">Inspect dual model outputs, evidence scores, and officer review decisions.</p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search farmer or farm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-agri pl-8 py-1.5 text-xs w-48"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="select-agri py-1.5 text-xs w-36"
            >
              <option value="all">All Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="needs_more_evidence">Needs Info</option>
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading claims database..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDashboardData} />
        ) : filteredClaims.length === 0 ? (
          <EmptyState
            title="No Matching Claims Found"
            message="No claims matching the search or status criteria exist in the database store."
            action={
              <Link href="/claims/new" className="btn-agri-gold text-xs px-4 py-2">
                <PlusCircle className="w-3.5 h-3.5" /> Submit First Claim
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8faf7] text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px] font-mono">
                  <th className="py-2.5 px-3">Claim Ref</th>
                  <th className="py-2.5 px-3">Policyholder / Farm</th>
                  <th className="py-2.5 px-3">Disease Outcome</th>
                  <th className="py-2.5 px-3">Crop Damage Ratio</th>
                  <th className="py-2.5 px-3">Evidence Score</th>
                  <th className="py-2.5 px-3">Determination</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClaims.map((claim) => {
                  const evidence = claim.ai_evidence || {};
                  const review = claim.officer_verification || {};
                  const disease = evidence.disease_analysis?.final_prediction || "Healthy";
                  const damage = evidence.damage_analysis?.overall_damage_percentage || evidence.damage_analysis?.visible_damage_percentage || 0;
                  const score = evidence.evidence_score?.total_score || 80;
                  const status = review.final_decision || "pending_review";

                  return (
                    <tr key={claim.claim_id} className="hover:bg-[#f8faf7] transition">
                      <td className="py-3 px-3 font-mono font-medium text-[#1a382b]">
                        <div className="font-bold text-[#1a382b]">{getClaimNumber(claim)}</div>
                        <div className="text-[10px] text-emerald-800 font-sans font-medium">{getLogicalClaimTitle(claim)}</div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {new Date(claim.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{evidence.farmer_name || "John Doe"}</div>
                        <div className="text-[11px] text-slate-500">{evidence.farm_name || "Farm #1"} ({evidence.crop_variety || "Wheat"})</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          disease === "Healthy" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-900 border border-amber-200"
                        }`}>
                          {disease}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-red-700 font-mono">
                        {Number(damage).toFixed(2)}%
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <span className="font-bold text-[#b89528]">{score}</span> / 100
                      </td>

                      <td className="py-3 px-3">
                        <StatusBadge status={status} />
                      </td>

                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/claims/${claim.claim_id}`}
                          className="btn-agri-secondary text-[11px] px-2.5 py-1"
                        >
                          <span>Inspect</span>
                          <Eye className="w-3 h-3 text-[#2e7d32]" />
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
    </div>
  );
}
