"use client";

import React, { useState } from "react";
import { Farm, createObservation } from "@/lib/api";
import {
  Upload,
  Camera,
  MapPin,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info,
  ShieldCheck,
  Calendar,
} from "lucide-react";

interface CreateObservationModalProps {
  farm: Farm;
  farmerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newObs: any) => void;
}

interface ZoneImageSlot {
  file: File | null;
  previewUrl: string | null;
}

export default function CreateObservationModal({
  farm,
  farmerId,
  isOpen,
  onClose,
  onSuccess,
}: CreateObservationModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date State (Defaults to Today YYYY-MM-DD)
  const [observationDate, setObservationDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // GPS State
  const [latitude, setLatitude] = useState<string>(farm.latitude.toFixed(6));
  const [longitude, setLongitude] = useState<string>(farm.longitude.toFixed(6));
  const [gpsAccuracy, setGpsAccuracy] = useState<string>("4.5");
  const [gpsSource, setGpsSource] = useState<"browser" | "manual">("browser");
  const [gpsLoading, setGpsLoading] = useState(false);

  // 5 Zones state: each zone has 1 close_up and 1 field_view
  const [zoneImages, setZoneImages] = useState<Record<string, { close_up: ZoneImageSlot; field_view: ZoneImageSlot }>>({
    zone_1: { close_up: { file: null, previewUrl: null }, field_view: { file: null, previewUrl: null } },
    zone_2: { close_up: { file: null, previewUrl: null }, field_view: { file: null, previewUrl: null } },
    zone_3: { close_up: { file: null, previewUrl: null }, field_view: { file: null, previewUrl: null } },
    zone_4: { close_up: { file: null, previewUrl: null }, field_view: { file: null, previewUrl: null } },
    zone_5: { close_up: { file: null, previewUrl: null }, field_view: { file: null, previewUrl: null } },
  });

  if (!isOpen) return null;

  const handleFileChange = (zoneKey: string, type: "close_up" | "field_view", file: File | null) => {
    setError(null);
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      setError(`${file.name}: Only JPG, JPEG, and PNG images are allowed.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(`${file.name}: File size exceeds 10MB limit.`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setZoneImages((prev) => ({
      ...prev,
      [zoneKey]: {
        ...prev[zoneKey],
        [type]: { file, previewUrl },
      },
    }));
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setError("Browser geolocation is not supported on this device.");
      return;
    }
    setGpsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsAccuracy(pos.coords.accuracy.toFixed(1));
        setGpsSource("browser");
        setGpsLoading(false);
      },
      (err) => {
        setError(`GPS Capture failed: ${err.message}. You may edit coordinates manually.`);
        setGpsSource("manual");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Count total selected images
  let closeUpCount = 0;
  let fieldViewCount = 0;
  Object.values(zoneImages).forEach((z) => {
    if (z.close_up.file) closeUpCount++;
    if (z.field_view.file) fieldViewCount++;
  });
  const totalCount = closeUpCount + fieldViewCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (totalCount !== 10 || closeUpCount !== 5 || fieldViewCount !== 5) {
      setError("Observation requires 5 close-up and 5 field-view images (10 images total across 5 zones).");
      return;
    }

    // Build FormData
    const formData = new FormData();
    formData.append("farm_id", farm.id);
    formData.append("farmer_id", farmerId);
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);
    formData.append("gps_accuracy", gpsAccuracy);
    formData.append("gps_source", gpsSource);
    formData.append("observation_date", new Date(observationDate).toISOString());


    const zoneList: string[] = [];
    const typeList: string[] = [];

    // Append files in zone order
    const zoneKeys = ["zone_1", "zone_2", "zone_3", "zone_4", "zone_5"];
    for (const zKey of zoneKeys) {
      const z = zoneImages[zKey];
      if (z.close_up.file) {
        formData.append("files", z.close_up.file);
        zoneList.push(zKey);
        typeList.push("close_up");
      }
      if (z.field_view.file) {
        formData.append("files", z.field_view.file);
        zoneList.push(zKey);
        typeList.push("field_view");
      }
    }

    formData.append("zones", zoneList.join(","));
    formData.append("image_types", typeList.join(","));

    setSubmitting(true);
    try {
      const res = await createObservation(formData);
      onSuccess(res.observation);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create observation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-[#f8faf7] text-[#1c2826] overflow-y-auto w-full h-full flex flex-col justify-between">
      {/* Top Header Banner */}
      <div className="sticky top-0 z-20 bg-[#1a382b] text-white px-6 sm:px-10 py-5 border-b border-[#2d5241] shadow-md flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] text-[11px] font-mono font-bold uppercase tracking-wider border border-[#d4af37]/40">
              10-Image Field Protocol
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-[#254d3c] text-emerald-100 text-xs font-mono font-bold border border-[#2d5241]">
              {farm.farm_code}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            New Time-Series Field Observation
          </h1>
          <p className="text-xs text-emerald-100/80 mt-0.5">
            Registered Crop: <strong className="text-white">{farm.crop_type}</strong> ({farm.area_acres} acres) • Parcel Code: <span className="font-mono text-[#d4af37]">{farm.farm_code}</span>
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-2.5 rounded-xl bg-[#254d3c] text-emerald-100 hover:text-white hover:bg-red-500/30 hover:text-red-200 border border-[#2d5241] transition flex items-center gap-1.5 text-xs font-bold"
        >
          <X className="w-5 h-5" />
          <span className="hidden sm:inline">Close</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-10 space-y-8">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <div>
              <p className="font-bold text-rose-800">Validation Error</p>
              <p className="text-xs mt-0.5 text-rose-600">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Progress Indicator */}
          <div className="p-4 rounded-2xl bg-[#f8faf7] border border-gray-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#2e7d32] flex items-center justify-center font-bold text-sm border border-emerald-200">
                {totalCount}/10
              </div>
              <div>
                <p className="font-bold text-[#1a382b]">Required Images Status</p>
                <p className="text-gray-500">
                  {closeUpCount}/5 Close-up • {fieldViewCount}/5 Field-view
                </p>
              </div>
            </div>
            {totalCount === 10 ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#2e7d32] font-bold border border-emerald-200">
                <CheckCircle className="w-4 h-4" /> Ready for AI Analysis
              </span>
            ) : (
              <span className="text-[#b89528] font-bold">
                {10 - totalCount} images remaining
              </span>
            )}
          </div>

          {/* Observation Date & GPS Info Section */}
          <div className="p-4 rounded-2xl bg-[#f8faf7] border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1a382b] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2e7d32]" /> Observation Date &amp; GPS Location
              </h4>
              <button
                type="button"
                onClick={handleCaptureGps}
                disabled={gpsLoading}
                className="px-3 py-1.5 rounded-xl bg-[#2e7d32] text-white hover:bg-[#256628] text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                {gpsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MapPin className="w-3.5 h-3.5" />
                )}
                Capture Current GPS
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-gray-600 font-semibold block mb-1">Observation Date</label>
                <input
                  type="date"
                  value={observationDate}
                  onChange={(e) => setObservationDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-gray-800 font-mono focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-gray-600 font-semibold block mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => {
                    setLatitude(e.target.value);
                    setGpsSource("manual");
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-gray-800 font-mono focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-gray-600 font-semibold block mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => {
                    setLongitude(e.target.value);
                    setGpsSource("manual");
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-gray-800 font-mono focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-gray-600 font-semibold block mb-1">GPS Source</label>
                <div className="px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-gray-700 font-mono capitalize">
                  {gpsSource} ({gpsAccuracy}m acc)
                </div>
              </div>
            </div>
          </div>

          {/* 5 Observation Zones Upload Grid */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-[#1a382b] flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#2e7d32]" /> 5 Observation Zones (10 Images Total)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((zNum) => {
                const zKey = `zone_${zNum}`;
                const zData = zoneImages[zKey];
                return (
                  <div key={zKey} className="p-3 rounded-2xl bg-[#f8faf7] border border-gray-200 flex flex-col space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <span className="text-xs font-bold text-[#1a382b] uppercase tracking-wider">
                        Zone {zNum}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono font-bold">
                        {(zData.close_up.file ? 1 : 0) + (zData.field_view.file ? 1 : 0)}/2
                      </span>
                    </div>

                    {/* Close-Up Slot */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-600 block">Close-Up</label>
                      <label className="relative flex flex-col items-center justify-center h-24 rounded-xl border border-dashed border-gray-300 hover:border-[#2e7d32] bg-white cursor-pointer overflow-hidden group transition">
                        {zData.close_up.previewUrl ? (
                          <img
                            src={zData.close_up.previewUrl}
                            alt="Close-up preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-2">
                            <Upload className="w-4 h-4 text-gray-400 mx-auto group-hover:text-[#2e7d32] transition" />
                            <span className="text-[10px] text-gray-500 block mt-1">Upload Close-up</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={(e) => handleFileChange(zKey, "close_up", e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Field-View Slot */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-600 block">Field-View</label>
                      <label className="relative flex flex-col items-center justify-center h-24 rounded-xl border border-dashed border-gray-300 hover:border-[#2e7d32] bg-white cursor-pointer overflow-hidden group transition">
                        {zData.field_view.previewUrl ? (
                          <img
                            src={zData.field_view.previewUrl}
                            alt="Field-view preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-2">
                            <Upload className="w-4 h-4 text-gray-400 mx-auto group-hover:text-[#2e7d32] transition" />
                            <span className="text-[10px] text-gray-500 block mt-1">Upload Field-view</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={(e) => handleFileChange(zKey, "field_view", e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || totalCount !== 10}
              className="btn-agri-gold text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Running AI Disease &amp; Damage Analysis...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#1a382b]" /> Submit &amp; Analyze Observation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

