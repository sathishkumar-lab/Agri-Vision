"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import MapView from "@/components/MapView";
import { getClaims, Claim, getClaimNumber, getLogicalClaimTitle } from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import StatusBadge from "@/components/ui/StatusBadge";
import { MapPin, Filter, ChevronRight, Layers } from "lucide-react";

export default function FieldIntelligenceGIS() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getClaims();
      const allClaims = res?.claims || [];
      setClaims(allClaims);
      const hasGeo = allClaims.find(
        (c) =>
          typeof c.ai_evidence?.farm_latitude === "number" &&
          typeof c.ai_evidence?.farm_longitude === "number"
      );
      if (hasGeo) {
        setSelectedClaim(hasGeo);
      }
    } catch (err: any) {
      console.error("Failed to fetch claims for GIS view:", err);
      setError(err.message || "Failed to load GIS mapping portfolio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const georeferencedClaims = claims.filter(
    (c) =>
      typeof c.ai_evidence?.farm_latitude === "number" &&
      typeof c.ai_evidence?.farm_longitude === "number"
  );

  const filteredClaims = georeferencedClaims.filter((c) => {
    if (filterStatus === "all") return true;
    return c.officer_verification?.final_decision === filterStatus;
  });

  if (loading) {
    return <LoadingState message="Loading Field GIS Mapping Portfolio..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Field Intelligence GIS Console"
          description="Real-Time Geospatial Insurance Portfolio • Farm Boundary & Claim Photo Geofencing Audit"
        />
        <div className="card-agri p-8 text-center space-y-4">
          <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-medium max-w-md mx-auto">
            {error}
          </div>
          <button onClick={loadData} className="btn-agri-primary text-xs px-4 py-2">
            Retry Loading Field GIS
          </button>
        </div>
      </div>
    );
  }

  if (georeferencedClaims.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Field Intelligence GIS Console"
          description="Real-Time Geospatial Insurance Portfolio • Farm Boundary & Claim Photo Geofencing Audit"
        />
        <EmptyState
          title="No georeferenced claims available."
          message="There are currently no insurance claims with valid geospatial plot coordinates in the database queue."
          action={
            <Link href="/claims/new" className="btn-agri-gold inline-flex items-center gap-2">
              Submit Georeferenced Claim
            </Link>
          }
        />
      </div>
    );
  }

  const activeLat: number = selectedClaim?.ai_evidence?.farm_latitude ?? georeferencedClaims[0].ai_evidence.farm_latitude!;
  const activeLng: number = selectedClaim?.ai_evidence?.farm_longitude ?? georeferencedClaims[0].ai_evidence.farm_longitude!;
  const activeClaimLat: number = selectedClaim?.ai_evidence?.claim_latitude ?? activeLat;
  const activeClaimLng: number = selectedClaim?.ai_evidence?.claim_longitude ?? activeLng;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Field Intelligence GIS Console"
          description="Real-Time Geospatial Insurance Portfolio • Farm Boundary & Claim Photo Geofencing Audit"
        />

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#f8faf7] p-1.5 rounded-xl border border-gray-200 text-xs font-medium">
            <Filter className="w-4 h-4 text-gray-500 ml-2" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-1.5 outline-none font-medium"
            >
              <option value="all">All Claim Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="needs_more_evidence">Needs More Evidence</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Map + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-2 card-agri p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1a382b] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2e7d32]" /> Interactive Plot Map View
            </h2>
            {selectedClaim && (
              <span className="text-xs text-gray-600 font-mono">
                Active Plot: <span className="text-[#1a382b] font-bold">{selectedClaim.ai_evidence.farm_name}</span> ({getClaimNumber(selectedClaim)})
              </span>
            )}
          </div>

          <div className="h-[600px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner">
            <MapView
              farmLocation={{ lat: activeLat, lng: activeLng }}
              claimLocation={{ lat: activeClaimLat, lng: activeClaimLng }}
            />
          </div>
        </div>

        {/* Claims Directory List */}
        <div className="card-agri p-4 flex flex-col h-[660px]">
          <h2 className="text-sm font-bold text-[#1a382b] pb-3 border-b border-gray-200 flex items-center justify-between">
            <span>Portfolio Claims ({filteredClaims.length})</span>
            <span className="text-xs text-gray-500 font-normal">Click to Inspect</span>
          </h2>

          <div className="flex-1 overflow-y-auto pt-3 space-y-3 pr-1">
            {filteredClaims.length > 0 ? (
              filteredClaims.map((claim) => (
                <div
                  key={claim.claim_id}
                  onClick={() => setSelectedClaim(claim)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 ${
                    selectedClaim?.claim_id === claim.claim_id
                      ? "bg-emerald-50/60 border-[#2e7d32] shadow-sm"
                      : "bg-[#f8faf7] border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#1a382b] text-[#d4af37] border border-[#d4af37]/30">
                      {getClaimNumber(claim)}
                    </span>
                    <StatusBadge status={claim.officer_verification?.final_decision || "pending_review"} />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{getLogicalClaimTitle(claim)}</h3>
                    <p className="text-xs text-gray-600">{claim.ai_evidence.farmer_name} • {claim.ai_evidence.farm_name}</p>
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-600 pt-2 border-t border-gray-200">
                    <span className="font-medium">Score: <strong>{claim.ai_evidence.evidence_score?.total_score || 85}</strong>/100</span>
                    <Link
                      href={`/claims/${claim.claim_id}`}
                      className="text-[#1a382b] font-bold hover:underline inline-flex items-center gap-1"
                    >
                      Audit <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-gray-500 text-xs font-medium">
                No claims match the selected filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
