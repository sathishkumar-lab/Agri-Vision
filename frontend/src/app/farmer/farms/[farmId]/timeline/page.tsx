"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getFarmTimeline, FarmTimeline } from "@/lib/api";
import DamageTrendChart from "@/components/DamageTrendChart";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import {
  Activity,
  Calendar,
  ChevronLeft,
  Compass,
  FileText,
  Layers,
  MapPin,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Eye,
} from "lucide-react";

export default function FarmTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const farmId = params.farmId as string;

  const [timeline, setTimeline] = useState<FarmTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId) return;
    loadTimeline();
  }, [farmId]);

  const loadTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFarmTimeline(farmId);
      setTimeline(data);
    } catch (err: any) {
      setError(err.message || "Failed to load farm timeline.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading farm observation timeline..." />;
  if (error || !timeline) return <ErrorState message={error || "Farm timeline not found."} onRetry={loadTimeline} />;

  const observations = timeline.observations || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Link
          href="/farmer/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2e7d32] hover:text-[#1a382b] transition"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Farmer Dashboard
        </Link>
      </div>

      {/* Farm Header Summary Banner */}
      <div className="bg-[#1a382b] text-white p-6 sm:p-8 rounded-2xl border border-[#2d5241] shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 rounded-full text-xs font-mono font-bold">
                {timeline.farm_code || farmId}
              </span>
              {timeline.survey_number && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#254d3c] text-emerald-100 text-xs font-medium border border-[#2d5241]">
                  Survey: {timeline.survey_number}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-2">
              {timeline.crop_type} Parcel Time-Series History
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 flex items-center gap-2 flex-wrap">
              <MapPin className="w-4 h-4 text-[#d4af37]" />
              <span>Registered Area: <strong className="text-white">{timeline.area_acres} acres</strong></span>
              {timeline.farm_latitude && (
                <span>• GPS: <strong className="text-white font-mono">{timeline.farm_latitude.toFixed(4)}° N, {timeline.farm_longitude?.toFixed(4)}° E</strong></span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#12291f]/80 border border-[#2d5241] rounded-2xl p-4 text-center min-w-[120px] shadow-inner">
              <span className="text-[11px] text-emerald-200/70 uppercase tracking-wider block font-semibold">Observations</span>
              <span className="text-2xl font-black text-[#d4af37] font-mono">{timeline.total_observations}</span>
            </div>
            {timeline.overall_damage_change_percentage_points !== null && timeline.overall_damage_change_percentage_points !== undefined && (
              <div className="bg-[#12291f]/80 border border-[#2d5241] rounded-2xl p-4 text-center min-w-[140px] shadow-inner">
                <span className="text-[11px] text-emerald-200/70 uppercase tracking-wider block font-semibold">Damage Change</span>
                <span className={`text-xl font-black font-mono ${timeline.overall_damage_change_percentage_points > 0 ? "text-rose-300" : "text-emerald-400"}`}>
                  {timeline.overall_damage_change_percentage_points > 0 ? `+${timeline.overall_damage_change_percentage_points}%` : `${timeline.overall_damage_change_percentage_points}%`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SVG Damage Trend Chart */}
      <DamageTrendChart observations={observations} />

      {/* Consecutive Observation Comparison Deltas */}
      {timeline.consecutive_comparisons && timeline.consecutive_comparisons.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#1a382b] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#2e7d32]" /> Observed Changes Over Time (Consecutive Comparisons)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {timeline.consecutive_comparisons.map((comp, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 hover:border-[#2e7d32]/40 rounded-2xl p-5 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs font-mono border-b border-gray-100 pb-2">
                  <span className="text-gray-600">
                    {comp.previous_observation_code} → <strong className="text-[#2e7d32]">{comp.current_observation_code}</strong>
                  </span>
                  <span className="text-gray-500 font-sans font-medium">
                    {new Date(comp.previous_observation_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} to{" "}
                    {new Date(comp.current_observation_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#f8faf7] border border-gray-200">
                    <span className="text-gray-500 block text-[10px] font-semibold uppercase">Observed Damage Delta</span>
                    <span className={`text-base font-extrabold font-mono ${comp.damage_change_percentage_points > 0 ? "text-rose-600" : "text-[#2e7d32]"}`}>
                      {comp.damage_change_percentage_points > 0 ? `+${comp.damage_change_percentage_points} pts` : `${comp.damage_change_percentage_points} pts`}
                    </span>
                    <span className="text-[10px] text-gray-500 block font-mono">
                      ({comp.previous_damage_percentage}% → {comp.current_damage_percentage}%)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#f8faf7] border border-gray-200">
                    <span className="text-gray-500 block text-[10px] font-semibold uppercase">Disease Detection</span>
                    <span className="text-sm font-bold text-[#1a382b] block mt-0.5">
                      {comp.previous_disease} → <strong className="text-[#2e7d32]">{comp.current_disease}</strong>
                    </span>
                    {comp.disease_changed && (
                      <span className="text-[10px] text-[#b89528] font-bold block mt-0.5">Disease status changed</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                  <span>GPS Distance from Farm: <strong className="text-gray-700 font-mono">{comp.gps_distance_from_farm_km} km</strong></span>
                  <span>Score: <strong className="text-gray-700 font-mono">{comp.current_evidence_score} pts</strong> ({comp.evidence_score_change > 0 ? `+${comp.evidence_score_change}` : comp.evidence_score_change})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observation History Timeline List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#1a382b] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#2e7d32]" /> Chronological Observation History ({observations.length})
        </h2>

        {observations.length === 0 ? (
          <div className="p-8 text-center bg-[#f8faf7] rounded-2xl border border-dashed border-gray-300">
            <Activity className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 text-sm font-medium">No observations recorded yet for this farm parcel.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {observations.map((obs) => {
              const obsDateStr = new Date(obs.observation_date).toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={obs.id}
                  className="bg-white border border-gray-200 hover:border-[#2e7d32]/40 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#1a382b] text-[#d4af37] text-xs font-mono font-bold">
                        {obs.observation_code}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">{obsDateStr}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#2e7d32] border border-emerald-200 text-[10px] font-mono font-bold capitalize">
                        Status: {obs.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-700 pt-1">
                      <span>
                        Disease: <strong className="text-[#2e7d32] font-bold">{obs.disease_result || "Healthy"}</strong>
                        {obs.disease_confidence && <span className="text-gray-500 font-mono text-[11px]"> ({obs.disease_confidence}%)</span>}
                      </span>
                      <span>
                        Estimated Damage: <strong className="text-[#b89528] font-mono font-bold">{obs.damage_percentage ?? 0}%</strong>
                      </span>
                      <span>
                        Evidence Score: <strong className="text-[#1a382b] font-mono font-bold">{obs.evidence_score ?? 0}/100</strong>
                      </span>
                      <span>
                        Images: <strong className="text-gray-800">{obs.image_count}</strong> (5 close-up / 5 field)
                      </span>
                    </div>
                  </div>

                  <div>
                    <Link
                      href={`/observations/${obs.id}`}
                      className="btn-agri-secondary text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4 text-[#2e7d32]" /> View Observation Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
