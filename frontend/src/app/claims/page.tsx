"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClaims, Claim, getClaimNumber, getLogicalClaimTitle } from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { Search, PlusCircle, Eye, RefreshCw } from "lucide-react";

export default function ClaimsDirectoryPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadClaims = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClaims();
      setClaims(data.claims || []);
    } catch (err: any) {
      setError(err.message || "Failed to load claims database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const filtered = claims.filter((claim) => {
    const status = claim.officer_verification?.final_decision || "pending_review";
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    const s = searchQuery.toLowerCase();
    const farmer = (claim.ai_evidence?.farmer_name || "").toLowerCase();
    const farm = (claim.ai_evidence?.farm_name || "").toLowerCase();
    const id = claim.claim_id.toLowerCase();
    const claimCode = getClaimNumber(claim).toLowerCase();
    const claimTitle = getLogicalClaimTitle(claim).toLowerCase();
    return matchesStatus && (farmer.includes(s) || farm.includes(s) || id.includes(s) || claimCode.includes(s) || claimTitle.includes(s));
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        category="Agri-Vision Policyholder Records"
        title="Crop Claims Directory"
        description="Search, filter, and inspect submitted crop insurance claim evidence files."
        action={
          <div className="flex items-center space-x-2">
            <button
              onClick={loadClaims}
              className="btn-agri-secondary text-xs px-3 py-2"
              title="Refresh Claims List"
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

      {/* Search & Filter Bar */}
      <div className="card-agri flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Claim ID, Farmer Name, or Farm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-agri pl-9 py-1.5 text-xs"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select-agri py-1.5 text-xs w-44"
          >
            <option value="all">All Claims ({claims.length})</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="needs_more_evidence">Needs Info</option>
          </select>
        </div>
      </div>

      {/* Directory Cards Grid */}
      {loading ? (
        <LoadingState message="Fetching claims directory..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadClaims} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Claims Found"
          message="No submitted crop claims match the current filter parameters."
          action={
            <Link href="/claims/new" className="btn-agri-gold text-xs px-4 py-2">
              <PlusCircle className="w-3.5 h-3.5" /> Submit New Claim
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((claim) => {
            const ev = claim.ai_evidence || {};
            const rev = claim.officer_verification || {};
            const disease = ev.disease_analysis?.final_prediction || "Healthy";
            const damage = ev.damage_analysis?.overall_damage_percentage || ev.damage_analysis?.visible_damage_percentage || 0;
            const score = ev.evidence_score?.total_score || 80;
            const status = rev.final_decision || "pending_review";

            return (
              <div key={claim.claim_id} className="card-agri space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#1a382b] text-[#d4af37] border border-[#d4af37]/30 shadow-xs">
                      {getClaimNumber(claim)}
                    </span>
                    <StatusBadge status={status} />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{getLogicalClaimTitle(claim)}</h3>
                    <p className="text-xs text-slate-500">{ev.farmer_name || "Farmer"} • {ev.farm_name || "Farm"} ({ev.crop_variety || "Durum Wheat"})</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-sans">Disease</span>
                      <span className="font-semibold text-slate-800">{disease}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-sans">Crop Damage</span>
                      <span className="font-semibold text-red-700">{Number(damage).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="font-mono text-xs">
                    <span className="text-[10px] text-slate-400 block font-sans">Evidence Score</span>
                    <span className="font-bold text-[#b89528]">{score} <span className="text-[10px] font-normal text-slate-400">/ 100</span></span>
                  </div>

                  <Link
                    href={`/claims/${claim.claim_id}`}
                    className="btn-agri-primary text-xs px-3 py-1.5"
                  >
                    <span>Inspect</span>
                    <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
