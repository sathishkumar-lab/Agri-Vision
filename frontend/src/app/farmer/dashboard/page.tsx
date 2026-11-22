"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoredFarmer, clearStoredFarmer } from "@/lib/auth";
import { Farmer, Farm, Claim, getMyFarms, registerFarm, getClaims, getClaimNumber, getLogicalClaimTitle } from "@/lib/api";
import LoadingState from "@/components/ui/LoadingState";
import {
  UserCheck,
  Plus,
  MapPin,
  FileText,
  LogOut,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Compass,
  ArrowRight,
  Sparkles,
  Award,
  Layers,
} from "lucide-react";

import CreateObservationModal from "@/components/CreateObservationModal";
import { getFarmTimeline, FarmTimeline } from "@/lib/api";
import { Activity, Clock, Eye } from "lucide-react";

export default function FarmerDashboardPage() {
  const router = useRouter();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [farmTimelines, setFarmTimelines] = useState<Record<string, FarmTimeline>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Farm Modal / Form State
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [cropType, setCropType] = useState("Durum Wheat (HD-2967)");
  const [areaAcres, setAreaAcres] = useState("5.0");
  const [surveyNumber, setSurveyNumber] = useState("");
  const [latitude, setLatitude] = useState("31.5204");
  const [longitude, setLongitude] = useState("74.3587");
  const [farmSubmitting, setFarmSubmitting] = useState(false);
  const [farmError, setFarmError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Observation Modal State
  const [selectedObsFarm, setSelectedObsFarm] = useState<Farm | null>(null);

  useEffect(() => {
    const current = getStoredFarmer();
    if (!current) {
      router.push("/farmer/login");
      return;
    }
    setFarmer(current);
    loadFarmerData(current);
  }, [router]);

  const loadFarmerData = async (currentFarmer: Farmer) => {
    setLoading(true);
    setError(null);
    try {
      const [farmsRes, claimsRes] = await Promise.all([
        getMyFarms(currentFarmer.farmer_code).catch(() => ({ total_farms: 0, farms: [] })),
        getClaims().catch(() => ({ total_claims: 0, claims: [] })),
      ]);

      const loadedFarms = farmsRes.farms || [];
      setFarms(loadedFarms);

      // Fetch timelines for each farm
      const timelinePromises = loadedFarms.map((f: Farm) =>
        getFarmTimeline(f.id).catch(() => null)
      );
      const timelines = await Promise.all(timelinePromises);
      const timelineMap: Record<string, FarmTimeline> = {};
      timelines.forEach((tl, idx) => {
        if (tl && loadedFarms[idx]) {
          timelineMap[loadedFarms[idx].id] = tl;
        }
      });
      setFarmTimelines(timelineMap);

      // Filter claims associated with this farmer (by farmer_code or db_farmer_id or id)
      const myClaims = (claimsRes.claims || []).filter((c: Claim) => {
        const ev = c.ai_evidence || {};
        return (
          ev.farmer_code === currentFarmer.farmer_code ||
          ev.db_farmer_id === currentFarmer.id ||
          ev.farmer_id === currentFarmer.farmer_code ||
          ev.farmer_id === currentFarmer.id
        );
      });

      setClaims(myClaims);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };


  const handleLogout = () => {
    clearStoredFarmer();
    router.push("/farmer/login");
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setFarmError("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    setFarmError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setFarmError("Could not retrieve current location. Please enter coordinates manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRegisterFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmer) return;

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    const areaNum = parseFloat(areaAcres);

    if (isNaN(latNum) || isNaN(lonNum)) {
      setFarmError("Please provide valid numerical coordinates for farm latitude and longitude.");
      return;
    }

    if (isNaN(areaNum) || areaNum <= 0) {
      setFarmError("Area in acres must be greater than 0.");
      return;
    }

    setFarmSubmitting(true);
    setFarmError(null);

    try {
      await registerFarm({
        farmer_id: farmer.id,
        crop_type: cropType,
        area_acres: areaNum,
        survey_number: surveyNumber.trim() ? surveyNumber.trim() : null,
        latitude: latNum,
        longitude: lonNum,
      });

      setShowFarmModal(false);
      setSurveyNumber("");
      await loadFarmerData(farmer);
    } catch (err: any) {
      setFarmError(err.message || "Failed to register farm plot.");
    } finally {
      setFarmSubmitting(false);
    }
  };

  if (loading || !farmer) {
    return <LoadingState message="Loading your Farmer Portal profile..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-[#1a382b] text-white p-6 sm:p-8 rounded-2xl border border-[#2d5241] shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#254d3c] text-[#d4af37] rounded-2xl border border-[#d4af37]/30 shrink-0 shadow-inner">
              <UserCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
                  Welcome, {farmer.full_name}
                </h1>
                <span className="px-3 py-1 bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 rounded-full text-xs font-mono font-bold">
                  {farmer.farmer_code}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/80 mt-1">
                {farmer.address}, {farmer.district}, {farmer.state} • Mobile: <span className="font-mono text-white">{farmer.mobile_number}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/claims/new"
              className="btn-agri-gold text-xs shadow-md hover:brightness-105 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit New Claim</span>
            </Link>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Registered Farm Plots */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-agri p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#1a382b] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#2e7d32]" /> My Registered Farm Plots
                </h2>
                <p className="text-xs text-gray-500">
                  {farms.length} plot{farms.length === 1 ? "" : "s"} registered under {farmer.farmer_code}
                </p>
              </div>

              <button
                onClick={() => setShowFarmModal(true)}
                className="btn-agri-primary text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Register Farm</span>
              </button>
            </div>

            {farms.length === 0 ? (
              <div className="p-8 text-center bg-[#f8faf7] rounded-xl border border-dashed border-gray-300 space-y-3">
                <MapPin className="w-10 h-10 text-gray-400 mx-auto" />
                <h3 className="text-sm font-bold text-gray-700">No Farm Plots Registered Yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Register your wheat farm parcels to auto-populate coordinates and crop details during claim submission.
                </p>
                <button
                  onClick={() => setShowFarmModal(true)}
                  className="btn-agri-secondary text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-[#2e7d32]" />
                  <span>Register First Farm Plot</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {farms.map((farm) => {
                  const tl = farmTimelines[farm.id];
                  const obsCount = tl ? tl.total_observations : 0;
                  const latestDate = tl && tl.latest_observation_date
                    ? new Date(tl.latest_observation_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "None";

                  return (
                    <div
                      key={farm.id}
                      className="bg-[#f8faf7] p-4 rounded-xl border border-gray-200 hover:border-[#2e7d32]/40 transition-all space-y-3 relative flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-mono font-bold text-[#2e7d32] bg-emerald-100/60 px-2.5 py-0.5 rounded-md">
                            {farm.farm_code}
                          </span>
                          <span className="text-xs font-bold text-[#b89528]">
                            {farm.area_acres} Acres
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-[#1a382b]">{farm.crop_type}</h3>

                        {farm.survey_number && (
                          <p className="text-xs text-gray-600">
                            Survey No: <span className="font-semibold">{farm.survey_number}</span>
                          </p>
                        )}

                        <div className="text-xs font-mono text-gray-500 flex items-center gap-1 pt-1 border-t border-gray-200/60">
                          <Compass className="w-3.5 h-3.5 text-[#2e7d32]" />
                          <span>{farm.latitude.toFixed(4)}° N, {farm.longitude.toFixed(4)}° E</span>
                        </div>

                        {/* Observation Status Summary */}
                        <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-lg p-2.5 space-y-1 text-xs text-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-[#1a382b] flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 text-[#2e7d32]" /> Observations:
                            </span>
                            <span className="font-bold text-[#2e7d32]">{obsCount}</span>
                          </div>
                          {tl && tl.valid_observations_count > 0 && (
                            <>
                              <div className="flex items-center justify-between text-[11px] text-gray-600">
                                <span>Latest Observation:</span>
                                <span className="font-medium">{latestDate}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-gray-600">
                                <span>Latest Disease:</span>
                                <span className="font-medium">{tl.disease_history[tl.disease_history.length - 1]?.disease_result || "Healthy"}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-gray-600">
                                <span>Estimated Damage:</span>
                                <span className="font-bold text-amber-700">{tl.latest_damage_percentage ?? 0}%</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 flex items-center gap-2 border-t border-gray-200/60">
                        <button
                          onClick={() => setSelectedObsFarm(farm)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#2e7d32] hover:bg-[#256628] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New Observation</span>
                        </button>
                        <Link
                          href={`/farmer/farms/${farm.id}/timeline`}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-100/70 hover:bg-emerald-200/80 text-[#1a382b] font-bold text-xs flex items-center justify-center gap-1 transition border border-emerald-300/60"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#2e7d32]" />
                          <span>Time-Series</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>


          {/* Submitted Claims Section */}
          <div className="card-agri p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#1a382b] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#2e7d32]" /> My Crop Damage Claims
                </h2>
                <p className="text-xs text-gray-500">
                  {claims.length} claim{claims.length === 1 ? "" : "s"} submitted
                </p>
              </div>

              <Link
                href="/claims/new"
                className="btn-agri-gold text-xs font-bold flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Claim</span>
              </Link>
            </div>

            {claims.length === 0 ? (
              <div className="p-8 text-center bg-[#f8faf7] rounded-xl border border-dashed border-gray-300 space-y-3">
                <FileText className="w-10 h-10 text-gray-400 mx-auto" />
                <h3 className="text-sm font-bold text-gray-700">No Crop Claims Submitted Yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Submit AI-analyzed crop damage claims with disease identification and segmentation evidence.
                </p>
                <Link
                  href="/claims/new"
                  className="btn-agri-gold text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>File a Crop Claim</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {claims.map((claim) => {
                  const ev = claim.ai_evidence || {};
                  const decision = claim.officer_verification?.final_decision || "pending_review";
                  const score = ev.evidence_score?.total_score ?? 85;

                  return (
                    <Link
                      key={claim.claim_id}
                      href={`/claims/${claim.claim_id}`}
                      className="block bg-[#f8faf7] hover:bg-emerald-50/50 p-4 rounded-xl border border-gray-200 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-[#1a382b] text-sm">
                            {getClaimNumber(claim)}
                          </span>
                          <span className="text-xs font-semibold text-gray-700 hidden sm:inline">
                            • {getLogicalClaimTitle(claim)}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              decision === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : decision === "rejected"
                                ? "bg-red-100 text-red-800"
                                : decision === "needs_more_evidence"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {decision.replace(/_/g, " ")}
                          </span>
                        </div>

                        <span className="text-xs font-mono font-bold text-[#2e7d32]">
                          Score: {score}/100 PTS
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{ev.farm_name || "Wheat Parcel"} • {ev.crop_variety || "Durum Wheat"}</span>
                        <span>{new Date(claim.created_at).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Profile Summary & Quick Stats */}
        <div className="space-y-6">
          <div className="card-agri p-6 space-y-4">
            <h2 className="text-base font-bold text-[#1a382b] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#d4af37]" /> Account Quick Stats
            </h2>

            <div className="space-y-3 text-xs">
              <div className="bg-[#f8faf7] p-3 rounded-xl border border-gray-200 flex justify-between items-center">
                <span className="text-gray-600 font-medium">Registered Farms</span>
                <span className="font-mono font-bold text-lg text-[#1a382b]">{farms.length}</span>
              </div>

              <div className="bg-[#f8faf7] p-3 rounded-xl border border-gray-200 flex justify-between items-center">
                <span className="text-gray-600 font-medium">Total Claims Filed</span>
                <span className="font-mono font-bold text-lg text-[#2e7d32]">{claims.length}</span>
              </div>

              <div className="bg-[#f8faf7] p-3 rounded-xl border border-gray-200 flex justify-between items-center">
                <span className="text-gray-600 font-medium">Approved Claims</span>
                <span className="font-mono font-bold text-lg text-emerald-700">
                  {claims.filter((c) => c.officer_verification?.final_decision === "approved").length}
                </span>
              </div>
            </div>
          </div>

          <div className="card-agri p-6 space-y-3 bg-gradient-to-br from-[#1a382b] to-[#274c3b] text-white">
            <h3 className="text-sm font-bold text-[#d4af37] flex items-center gap-2">
              <Award className="w-4 h-4" /> AI Evidence Standard
            </h3>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              When filing a new claim, your registered farm details are automatically linked to your account. AI models process disease &amp; damage evidence to generate a transparent 100-point audit score for insurance adjusters.
            </p>
          </div>
        </div>
      </div>

      {/* Register Farm Modal */}
      {showFarmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-[#1a382b] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#2e7d32]" /> Register New Farm Plot
              </h3>
              <button
                onClick={() => setShowFarmModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            {farmError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="text-xs text-red-800 font-medium">{farmError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterFarm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Crop Type / Variety <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f8faf7] border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Area (Acres) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={areaAcres}
                    onChange={(e) => setAreaAcres(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#f8faf7] border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Survey Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 142/3"
                    value={surveyNumber}
                    onChange={(e) => setSurveyNumber(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#f8faf7] border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Plot Coordinates (Latitude &amp; Longitude) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    disabled={gpsLoading}
                    className="text-[11px] font-bold text-[#2e7d32] hover:text-[#1a382b] flex items-center gap-1"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>{gpsLoading ? "Getting GPS..." : "Use Current GPS"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Latitude"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#f8faf7] border border-gray-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                  />
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Longitude"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#f8faf7] border border-gray-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFarmModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={farmSubmitting}
                  className="btn-agri-primary text-xs font-bold px-5 py-2 flex items-center gap-1.5"
                >
                  {farmSubmitting ? "Saving..." : "Save Farm Plot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Observation Creation Modal */}
      {selectedObsFarm && farmer && (
        <CreateObservationModal
          farm={selectedObsFarm}
          farmerId={farmer.farmer_code}
          isOpen={!!selectedObsFarm}
          onClose={() => setSelectedObsFarm(null)}
          onSuccess={() => {
            if (farmer) loadFarmerData(farmer);
          }}
        />
      )}
    </div>
  );
}

