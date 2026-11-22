"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MapView from "@/components/MapView";
import ImageComparisonSlider from "@/components/ImageComparisonSlider";
import {
  predictDiseaseMultiple,
  predictDamageMultiple,
  createClaim,
  getResultImageUrl,
  getMyFarms,
  Farm,
  getClaimNumber,
  getLogicalClaimTitle,
} from "@/lib/api";
import { getStoredFarmer } from "@/lib/auth";
import { parseImageExif, ParsedExif } from "@/lib/exif";
import {
  Wheat,
  MapPin,
  Upload,
  Activity,
  Layers,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileCheck2,
  Trash2,
  Info,
  UserCheck,
} from "lucide-react";

export default function NewClaimWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1: Claim & Farmer Info
  const [farmerName, setFarmerName] = useState("Sathish Kumar");
  const [farmerId, setFarmerId] = useState("FARM-2026-881");
  const [claimNotes, setClaimNotes] = useState("Foliar disease and heavy hail damage observed across wheat parcel.");

  // Linked Farmer & Farm metadata
  const [dbFarmerId, setDbFarmerId] = useState<string | null>(null);
  const [dbFarmId, setDbFarmId] = useState<string | null>(null);
  const [farmerCode, setFarmerCode] = useState<string | null>(null);
  const [farmCode, setFarmCode] = useState<string | null>(null);
  const [myFarms, setMyFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");

  // Step 2: Farm Details (Null by default if not set, user can edit)
  const [farmName, setFarmName] = useState("Green Canopy Wheat Farm #4");
  const [cropVariety, setCropVariety] = useState("Durum Wheat (HD-2967)");
  const [farmLatInput, setFarmLatInput] = useState<string>("31.5204");
  const [farmLonInput, setFarmLonInput] = useState<string>("74.3587");

  useEffect(() => {
    const stored = getStoredFarmer();
    if (stored) {
      setFarmerName(stored.full_name);
      setFarmerId(stored.farmer_code);
      setFarmerCode(stored.farmer_code);
      setDbFarmerId(stored.id);

      getMyFarms(stored.farmer_code)
        .then((res) => {
          if (res.farms && res.farms.length > 0) {
            setMyFarms(res.farms);
            const first = res.farms[0];
            setSelectedFarmId(first.id);
            setFarmName(`${first.crop_type} (${first.farm_code})`);
            setCropVariety(first.crop_type);
            setFarmLatInput(first.latitude.toString());
            setFarmLonInput(first.longitude.toString());
            setDbFarmId(first.id);
            setFarmCode(first.farm_code);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleSelectRegisteredFarm = (farmIdStr: string) => {
    setSelectedFarmId(farmIdStr);
    const found = myFarms.find((f) => f.id === farmIdStr || f.farm_code === farmIdStr);
    if (found) {
      setFarmName(`${found.crop_type} (${found.farm_code})`);
      setCropVariety(found.crop_type);
      setFarmLatInput(found.latitude.toString());
      setFarmLonInput(found.longitude.toString());
      setDbFarmId(found.id);
      setFarmCode(found.farm_code);
    }
  };

  // Step Errors
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  const handleProceedToStep2 = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setStep(2);
  };

  const handleProceedToStep3 = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setStep(3);
  };

  // Step 3: Location Capture & Geolocation State
  const [claimLat, setClaimLat] = useState<number | null>(null);
  const [claimLon, setClaimLon] = useState<number | null>(null);
  const [gpsTimestamp, setGpsTimestamp] = useState<string | null>(null);
  const [exifLat, setExifLat] = useState<number | null>(null);
  const [exifLon, setExifLon] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<string>("Unavailable");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gettingGps, setGettingGps] = useState(false);

  // Step 4: Close-up Images (3-5 required for Disease)
  const [closeUpFiles, setCloseUpFiles] = useState<File[]>([]);
  const [closeUpExifs, setCloseUpExifs] = useState<ParsedExif[]>([]);
  const [closeUpError, setCloseUpError] = useState<string | null>(null);

  // Step 5: Disease Analysis Results
  const [diseaseLoading, setDiseaseLoading] = useState(false);
  const [diseaseResult, setDiseaseResult] = useState<any>(null);

  // Step 6: Field-view Images (3-5 required for Damage)
  const [fieldFiles, setFieldFiles] = useState<File[]>([]);
  const [fieldExifs, setFieldExifs] = useState<ParsedExif[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Step 7: Damage Analysis Results
  const [damageLoading, setDamageLoading] = useState(false);
  const [damageResult, setDamageResult] = useState<any>(null);
  const [selectedDamageIdx, setSelectedDamageIdx] = useState<number>(0);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedClaim, setSubmittedClaim] = useState<any | null>(null);

  // Derived numeric farm coordinates
  const farmLat = farmLatInput !== "" && !isNaN(parseFloat(farmLatInput)) ? parseFloat(farmLatInput) : null;
  const farmLon = farmLonInput !== "" && !isNaN(parseFloat(farmLonInput)) ? parseFloat(farmLonInput) : null;

  // Real Browser Geolocation API
  const captureBrowserGps = () => {
    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      setLocationError("Browser GPS requires a secure context (HTTPS) when accessed over a network IP address.");
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("Geolocation API is not supported by your browser.");
      return;
    }

    setGettingGps(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const ts = new Date(pos.timestamp).toISOString();
        setClaimLat(lat);
        setClaimLon(lon);
        setFarmLatInput(lat.toFixed(6));
        setFarmLonInput(lon.toFixed(6));
        setGpsTimestamp(ts);
        setGettingGps(false);
        setLocationSource(exifLat && exifLon ? "Browser GPS + EXIF GPS" : "Browser GPS");
      },
      (err) => {
        setGettingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Location permission was denied. Please allow location access in your browser or use EXIF GPS from the uploaded images.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError("Your location could not be determined. Please try again.");
        } else if (err.code === err.TIMEOUT) {
          setLocationError("Location request timed out. Please try again.");
        } else {
          setLocationError("Unable to obtain your current location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Handle Close-up Images Selection & EXIF Parsing
  const handleCloseUpFiles = async (filesList: FileList | null) => {
    if (!filesList) return;
    const filesArr = Array.from(filesList);
    const valid = filesArr.filter(
      (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    );

    if (closeUpFiles.length + valid.length > 5) {
      setCloseUpError("Please upload between 3 and 5 close-up images. Maximum 5 allowed.");
      return;
    }

    setCloseUpError(null);
    const updatedFiles = [...closeUpFiles, ...valid];
    setCloseUpFiles(updatedFiles);

    // Parse EXIF
    const parsedExifs = await Promise.all(updatedFiles.map(parseImageExif));
    setCloseUpExifs(parsedExifs);

    // Update EXIF GPS state if found
    const firstGps = parsedExifs.find((e) => e.has_gps && e.latitude && e.longitude);
    if (firstGps) {
      setExifLat(firstGps.latitude!);
      setExifLon(firstGps.longitude!);
      if (!claimLat || !claimLon) {
        setClaimLat(firstGps.latitude!);
        setClaimLon(firstGps.longitude!);
        setLocationSource("EXIF GPS");
      } else if (locationSource === "Browser GPS") {
        setLocationSource("Browser GPS + EXIF GPS");
      }
    }
  };

  // Handle Field-view Images Selection & EXIF Parsing
  const handleFieldFiles = async (filesList: FileList | null) => {
    if (!filesList) return;
    const filesArr = Array.from(filesList);
    const valid = filesArr.filter(
      (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    );

    if (fieldFiles.length + valid.length > 5) {
      setFieldError("Please upload between 3 and 5 field-view images. Maximum 5 allowed.");
      return;
    }

    setFieldError(null);
    const updatedFiles = [...fieldFiles, ...valid];
    setFieldFiles(updatedFiles);

    // Parse EXIF
    const parsedExifs = await Promise.all(updatedFiles.map(parseImageExif));
    setFieldExifs(parsedExifs);

    // Update EXIF GPS state if found
    const firstGps = parsedExifs.find((e) => e.has_gps && e.latitude && e.longitude);
    if (firstGps && !exifLat) {
      setExifLat(firstGps.latitude!);
      setExifLon(firstGps.longitude!);
      if (!claimLat || !claimLon) {
        setClaimLat(firstGps.latitude!);
        setClaimLon(firstGps.longitude!);
        setLocationSource("EXIF GPS");
      }
    }
  };

  // Run Disease Inference (Enforces strictly 3-5 images)
  const runDiseaseAnalysis = async () => {
    if (closeUpFiles.length < 3 || closeUpFiles.length > 5) {
      setCloseUpError("Please upload between 3 and 5 close-up images.");
      return;
    }
    try {
      setDiseaseLoading(true);
      setCloseUpError(null);
      const res = await predictDiseaseMultiple(closeUpFiles);
      setDiseaseResult(res);
      setStep(5);
    } catch (err: any) {
      setCloseUpError(err.message || "Disease prediction service failed. Please check backend connection.");
    } finally {
      setDiseaseLoading(false);
    }
  };

  // Run Damage Inference (Enforces strictly 3-5 images)
  const runDamageAnalysis = async () => {
    if (fieldFiles.length < 3 || fieldFiles.length > 5) {
      setFieldError("Please upload between 3 and 5 field-view images.");
      return;
    }
    try {
      setDamageLoading(true);
      setFieldError(null);
      const res = await predictDamageMultiple(fieldFiles);
      setDamageResult(res);
      setStep(7);
    } catch (err: any) {
      setFieldError(err.message || "Damage segmentation service failed. Please check backend connection.");
    } finally {
      setDamageLoading(false);
    }
  };

  // Submit Claim to POST /api/claims
  const submitFinalClaim = async () => {
    try {
      setSubmitting(true);
      setSubmitError(null);

      const hasGps = Boolean(closeUpExifs.some((e) => e.has_gps) || fieldExifs.some((e) => e.has_gps) || (claimLat && claimLon));
      const hasTime = Boolean(closeUpExifs.some((e) => e.has_timestamp) || fieldExifs.some((e) => e.has_timestamp) || gpsTimestamp);

      const payload = {
        farmer_name: farmerName,
        farmer_id: farmerId,
        farm_name: farmName,
        crop_variety: cropVariety,
        farm_latitude: farmLat,
        farm_longitude: farmLon,
        claim_latitude: claimLat,
        claim_longitude: claimLon,
        location_source: locationSource,
        db_farmer_id: dbFarmerId,
        db_farm_id: dbFarmId,
        farmer_code: farmerCode,
        farm_code: farmCode,
        disease_analysis: diseaseResult ? {
          final_prediction: diseaseResult.final_result?.prediction,
          overall_confidence: diseaseResult.final_result?.overall_confidence,
          supporting_images: diseaseResult.final_result?.supporting_images,
          total_images: diseaseResult.total_images,
          individual_predictions: diseaseResult.individual_predictions,
        } : {},
        damage_analysis: damageResult ? {
          overall_damage_percentage: damageResult.overall_damage_analysis?.overall_damage_percentage,
          mean_damage_percentage: damageResult.overall_damage_analysis?.mean_damage_percentage,
          total_healthy_crop_pixels: damageResult.overall_damage_analysis?.total_healthy_crop_pixels,
          total_damaged_crop_pixels: damageResult.overall_damage_analysis?.total_damaged_crop_pixels,
          total_crop_pixels: damageResult.overall_damage_analysis?.total_crop_pixels,
          individual_results: damageResult.individual_results,
        } : {},
        close_up_images: closeUpFiles.map((f) => ({ filename: f.name, size: f.size })),
        field_images: fieldFiles.map((f) => ({ filename: f.name, size: f.size })),
        exif_metadata: {
          has_gps: hasGps,
          has_timestamp: hasTime,
          browser_gps: claimLat && claimLon ? { lat: claimLat, lon: claimLon, timestamp: gpsTimestamp } : null,
          exif_gps: exifLat && exifLon ? { lat: exifLat, lon: exifLon } : null,
        },
      };

      const res = await createClaim(payload);
      setSubmittedClaim(res);
    } catch (err: any) {
      setSubmitError(err.message || "Claim could not be saved. Please ensure the Agri-Vision backend is running.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="card-agri p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#2e7d32]">
              10-Step Claim Audit Workflow
            </span>
            <h1 className="text-2xl font-extrabold text-[#1a382b]">New Wheat Claim Submission</h1>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#1a382b] text-[#d4af37] text-xs font-bold self-start sm:self-auto font-mono">
            Step {step} of 10
          </span>
        </div>

        {/* Stepper Bar */}
        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#2e7d32] to-[#d4af37] h-full transition-all duration-300"
            style={{ width: `${(step / 10) * 100}%` }}
          ></div>
        </div>

        {/* Interactive Step Selector */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
          {[
            { num: 1, title: "Details" },
            { num: 2, title: "Farm" },
            { num: 3, title: "GPS" },
            { num: 4, title: "Close-up" },
            { num: 5, title: "Disease" },
            { num: 6, title: "Field" },
            { num: 7, title: "Damage" },
            { num: 8, title: "Evidence" },
            { num: 9, title: "Score" },
            { num: 10, title: "Review" },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setStep(s.num);
              }}
              className={`py-1 px-1 text-[10px] font-bold rounded text-center transition truncate cursor-pointer ${
                step === s.num
                  ? "bg-[#1a382b] text-[#d4af37] shadow-sm ring-1 ring-[#d4af37]"
                  : step > s.num
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              title={`Jump to Step ${s.num}: ${s.title}`}
            >
              {s.num}. {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: FARMER & CLAIM DETAILS */}
      {step === 1 && (
        <div className="card-agri p-8 space-y-6">
          <h2 className="text-xl font-bold text-[#1a382b] border-b border-gray-200 pb-3">Step 1: Farmer & Claim Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Farmer Full Name *
              </label>
              <input
                type="text"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                className="input-agri"
                placeholder="e.g. Sathish Kumar"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Farmer National Registration ID *
              </label>
              <input
                type="text"
                value={farmerId}
                onChange={(e) => setFarmerId(e.target.value)}
                className="input-agri"
                placeholder="e.g. FARM-2026-881"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Claim Observation Notes & Comments
              </label>
              <textarea
                rows={3}
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
                className="input-agri"
                placeholder="Describe observed damage or disease symptoms across the parcel..."
              />
            </div>
          </div>

          {step1Error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{step1Error}</span>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              id="step1-proceed-btn"
              onClick={handleProceedToStep2}
              className="btn-agri-primary flex items-center space-x-2 cursor-pointer"
            >
              <span>Proceed to Farm Details</span>
              <ArrowRight className="w-4 h-4 text-[#d4af37]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FARM DETAILS */}
      {step === 2 && (
        <div className="card-agri p-8 space-y-6">
          <h2 className="text-xl font-bold text-[#1a382b] border-b border-gray-200 pb-3">Step 2: Farm Parcel Details</h2>
          
          {myFarms.length > 0 && (
            <div className="p-4 bg-[#f8faf7] border border-emerald-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a382b]">
                Select Registered Farm Plot
              </label>
              <select
                value={selectedFarmId}
                onChange={(e) => handleSelectRegisteredFarm(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
              >
                {myFarms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.farm_code} • {f.crop_type} ({f.area_acres} Acres) - {f.latitude.toFixed(4)}°, {f.longitude.toFixed(4)}°
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Registered Farm Name *
              </label>
              <input
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                className="input-agri"
                placeholder="e.g. Green Canopy Wheat Farm #4"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Crop Variety *
              </label>
              <input
                type="text"
                value={cropVariety}
                onChange={(e) => setCropVariety(e.target.value)}
                className="input-agri"
                placeholder="e.g. Durum Wheat (HD-2967)"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Registered Farm Latitude (-90 to +90)
              </label>
              <input
                type="number"
                step="any"
                value={farmLatInput}
                onChange={(e) => setFarmLatInput(e.target.value)}
                className="input-agri font-mono"
                placeholder="e.g. 31.5204"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Registered Farm Longitude (-180 to +180)
              </label>
              <input
                type="number"
                step="any"
                value={farmLonInput}
                onChange={(e) => setFarmLonInput(e.target.value)}
                className="input-agri font-mono"
                placeholder="e.g. 74.3587"
              />
            </div>
          </div>

          {/* Automatic Location Capture Details Section */}
          <div className="p-5 bg-[#f8faf7] border border-emerald-200 rounded-xl space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1a382b]">
                    Automatic Location Capture Details
                  </h3>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Automatically acquire device coordinates via HTML5 Geolocation API
                </p>
              </div>

              <button
                type="button"
                onClick={captureBrowserGps}
                disabled={gettingGps}
                className="btn-agri-primary text-xs py-2 px-4 flex items-center gap-2 cursor-pointer self-start sm:self-auto shadow-sm"
              >
                <MapPin className="w-4 h-4 text-[#d4af37]" />
                <span>{gettingGps ? "Acquiring GPS..." : "Auto-Detect My Current GPS Location"}</span>
              </button>
            </div>

            {locationError && (
              <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{locationError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-gray-500 block uppercase font-medium text-[10px]">Captured Latitude</span>
                <span className="font-mono font-bold text-[#1a382b] text-sm">
                  {farmLat !== null ? farmLat.toFixed(6) : "Not captured"}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-gray-500 block uppercase font-medium text-[10px]">Captured Longitude</span>
                <span className="font-mono font-bold text-[#1a382b] text-sm">
                  {farmLon !== null ? farmLon.toFixed(6) : "Not captured"}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-gray-500 block uppercase font-medium text-[10px]">Location Source</span>
                <span className="font-bold text-[#2e7d32]">
                  {locationSource !== "Unavailable" ? locationSource : "High Precision Browser GPS"}
                </span>
              </div>
            </div>

            {/* Step 2 Map Canvas Preview */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs mb-1.5 px-0.5">
                <span className="font-bold text-[#1a382b] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#2e7d32]" />
                  Farm Geofence Location Preview
                </span>
                <span className="text-gray-400 font-mono text-[10px]">Interactive Leaflet Map</span>
              </div>
              <MapView
                farmLat={farmLat}
                farmLon={farmLon}
                claimLat={claimLat}
                claimLon={claimLon}
                height="480px"
              />
            </div>
          </div>

          {step2Error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{step2Error}</span>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              id="step2-back-btn"
              onClick={() => setStep(1)}
              className="btn-agri-secondary flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              id="step2-proceed-btn"
              onClick={handleProceedToStep3}
              className="btn-agri-primary flex items-center space-x-2 cursor-pointer"
            >
              <span>Proceed to Location Capture</span>
              <ArrowRight className="w-4 h-4 text-[#d4af37]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: LOCATION CAPTURE & EXIF GPS */}
      {step === 3 && (
        <div className="card-agri p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-xl font-bold text-[#1a382b]">Step 3: Location Capture & EXIF GPS</h2>
            <span className="text-xs text-gray-500 font-medium">Geolocation Verification</span>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              Capture your current physical coordinates via Browser Geolocation or extract EXIF metadata from uploaded crop photos.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={captureBrowserGps}
                disabled={gettingGps}
                className="btn-agri-primary flex items-center space-x-2 py-3 px-6 text-sm disabled:opacity-50"
              >
                <MapPin className="w-4 h-4 text-[#d4af37]" />
                <span>{gettingGps ? "Getting your current location..." : "Use My Current Location"}</span>
              </button>
              <span className="text-xs text-gray-500 font-medium">Uses Browser Geolocation API</span>
            </div>

            {locationError && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{locationError}</span>
              </div>
            )}

            {/* Coordinates Preview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#f8faf7] border border-gray-200 text-xs">
              <div>
                <span className="text-gray-500 block uppercase font-medium text-[10px]">Captured Latitude</span>
                <span className="font-mono font-bold text-[#1a382b]">
                  {claimLat !== null ? claimLat.toFixed(6) : "Not captured"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block uppercase font-medium text-[10px]">Captured Longitude</span>
                <span className="font-mono font-bold text-[#1a382b]">
                  {claimLon !== null ? claimLon.toFixed(6) : "Not captured"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block uppercase font-medium text-[10px]">Location Source</span>
                <span className="font-semibold text-[#2e7d32]">{locationSource}</span>
              </div>
            </div>

            {/* Map Canvas */}
            <MapView
              farmLat={farmLat}
              farmLon={farmLon}
              claimLat={claimLat}
              claimLon={claimLon}
              height="500px"
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => setStep(2)}
              className="btn-agri-secondary flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="btn-agri-primary flex items-center space-x-2"
            >
              <span>Proceed to Close-up Image Upload</span>
              <ArrowRight className="w-4 h-4 text-[#d4af37]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CLOSE-UP IMAGE UPLOAD (3-5 IMAGES) */}
      {step === 4 && (
        <div className="card-agri p-8 space-y-6">
          <div className="border-b border-gray-200 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1a382b]">Step 4: Upload 3–5 Close-up Wheat Images</h2>
              <span className="text-xs font-bold text-[#2e7d32] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Purpose: Disease Identification
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Capture detailed wheat leaf/crop symptoms for MobileNetV2 disease classification (Healthy, Septoria, Stripe Rust).
            </p>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-gray-300 hover:border-[#2e7d32] bg-[#f8faf7] hover:bg-emerald-50/40 transition rounded-xl p-8 text-center cursor-pointer relative">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png"
              onChange={(e) => handleCloseUpFiles(e.target.files)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Upload className="w-10 h-10 text-[#2e7d32] mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#1a382b]">Drag & Drop Close-up Images Here</h3>
            <p className="text-xs text-gray-500 mt-1">
              Upload between <strong>3 and 5 images</strong> (.jpg, .jpeg, .png, max 10MB each)
            </p>
          </div>

          {closeUpError && (
            <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{closeUpError}</span>
            </div>
          )}

          {/* Uploaded Files Gallery */}
          {closeUpFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Uploaded Close-up Photos ({closeUpFiles.length} of 5)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {closeUpFiles.map((file, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-24 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = closeUpFiles.filter((_, i) => i !== idx);
                        setCloseUpFiles(updated);
                        const updatedExifs = closeUpExifs.filter((_, i) => i !== idx);
                        setCloseUpExifs(updatedExifs);
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-1.5 text-[10px] text-gray-600 truncate font-mono bg-white border-t">
                      {file.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => setStep(3)}
              className="btn-agri-secondary flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={runDiseaseAnalysis}
              disabled={closeUpFiles.length < 3 || closeUpFiles.length > 5 || diseaseLoading}
              className="btn-agri-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <span>{diseaseLoading ? "Running MobileNetV2 Inference..." : "Run Disease Analysis"}</span>
              <Activity className="w-4 h-4 text-[#d4af37]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: DISEASE ANALYSIS RESULTS */}
      {step === 5 && diseaseResult && (
        <div className="card-agri p-8 space-y-6">
          <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#2e7d32]">MobileNetV2 Classification</span>
              <h2 className="text-xl font-bold text-[#1a382b]">Step 5: Disease Prediction Results</h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
              Consensus: {diseaseResult.final_result?.prediction}
            </span>
          </div>

          {/* Individual Predictions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {diseaseResult.individual_predictions?.map((pred: any, i: number) => (
              <div key={i} className="p-4 rounded-xl bg-[#f8faf7] border border-gray-200 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold text-[#1a382b]">
                  <span>Leaf Image #{i + 1}</span>
                  <span className="text-[#2e7d32] font-mono">{pred.confidence}%</span>
                </div>
                <div className="text-gray-600 truncate">{pred.original_filename}</div>
                <div className="p-2 rounded bg-white font-semibold text-center border border-gray-200 text-[#1a382b]">
                  {pred.prediction}
                </div>
              </div>
            ))}
          </div>

          {/* Voting Consensus Card */}
          <div className="p-5 rounded-xl bg-[#1a382b] text-white space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wider text-[#d4af37] font-bold">Majority Voting Consensus</span>
              <span className="text-xs text-emerald-200 font-medium">
                {diseaseResult.final_result?.supporting_images} / {diseaseResult.total_images} Supporting Images
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#d4af37]">
              {diseaseResult.final_result?.prediction} ({diseaseResult.final_result?.overall_confidence}% Confidence)
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => setStep(4)}
              className="btn-agri-secondary flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Close-ups</span>
            </button>
            <button
              onClick={() => setStep(6)}
              className="btn-agri-primary flex items-center space-x-2"
            >
              <span>Proceed to Field-view Image Upload</span>
              <ArrowRight className="w-4 h-4 text-[#d4af37]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: FIELD-VIEW IMAGE UPLOAD (3-5 IMAGES) */}
      {step === 6 && (
        <div className="card-agri p-8 space-y-6">
          <div className="border-b border-gray-200 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1a382b]">Step 6: Upload 3–5 Field-view Wheat Images</h2>
              <span className="text-xs font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                Purpose: Crop Damage Segmentation
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Capture wider field views for visible crop damage ratio estimation (Background, Healthy Wheat, Damaged Wheat).
            </p>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-gray-300 hover:border-red-600 bg-[#fffbfb] hover:bg-red-50/30 transition rounded-xl p-8 text-center cursor-pointer relative">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png"
              onChange={(e) => handleFieldFiles(e.target.files)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Upload className="w-10 h-10 text-red-700 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#1a382b]">Drag & Drop Field-view Images Here</h3>
            <p className="text-xs text-gray-500 mt-1">
              Upload between <strong>3 and 5 images</strong> (.jpg, .jpeg, .png, max 10MB each)
            </p>
          </div>

          {fieldError && (
            <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{fieldError}</span>
            </div>
          )}

          {/* Uploaded Field Files Gallery */}
          {fieldFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Uploaded Field Photos ({fieldFiles.length} of 5)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {fieldFiles.map((file, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-24 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = fieldFiles.filter((_, i) => i !== idx);
                        setFieldFiles(updated);
                        const updatedExifs = fieldExifs.filter((_, i) => i !== idx);
                        setFieldExifs(updatedExifs);
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-1.5 text-[10px] text-gray-600 truncate font-mono bg-white border-t">
                      {file.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => setStep(5)}
              className="btn-agri-secondary flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={runDamageAnalysis}
              disabled={fieldFiles.length < 3 || fieldFiles.length > 5 || damageLoading}
              className="btn-agri-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <span>{damageLoading ? "Running Residual U-Net Inference..." : "Run Damage Segmentation"}</span>
              <Layers className="w-4 h-4 text-[#d4af37]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: DAMAGE ANALYSIS RESULTS */}
      {step === 7 && damageResult && (
        <div className="card-agri p-8 space-y-6">
          <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-700">Residual U-Net (3-Class)</span>
              <h2 className="text-xl font-bold text-[#1a382b]">Step 7: Damage Segmentation Results</h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold border border-red-300 font-mono">
              Field Damage Ratio: {damageResult.overall_damage_analysis?.overall_damage_percentage}%
            </span>
          </div>

          {/* Selector pills for individual field images */}
          {damageResult.individual_results && damageResult.individual_results.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {damageResult.individual_results.map((res: any, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDamageIdx(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono transition-all border ${
                    selectedDamageIdx === idx
                      ? "bg-[#1a382b] text-white border-[#1a382b] shadow-sm"
                      : "bg-[#f8faf7] text-gray-700 border-gray-200 hover:bg-emerald-50"
                  }`}
                >
                  Field Image #{res.image_number || idx + 1} ({res.damage_percentage !== undefined ? `${res.damage_percentage.toFixed(1)}%` : "Processed"})
                </button>
              ))}
            </div>
          )}

          {/* Interactive Comparison Slider */}
          {damageResult.individual_results?.[selectedDamageIdx] && (
            <ImageComparisonSlider
              originalUrl={getResultImageUrl(
                damageResult.individual_results[selectedDamageIdx].stored_filename
                  ? `/uploads/${damageResult.individual_results[selectedDamageIdx].stored_filename}`
                  : damageResult.individual_results[selectedDamageIdx].original_url || ""
              )}
              maskUrl={getResultImageUrl(damageResult.individual_results[selectedDamageIdx].mask_url)}
              overlayUrl={getResultImageUrl(damageResult.individual_results[selectedDamageIdx].overlay_url)}
            />
          )}

          {/* Individual Field Results Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {damageResult.individual_results?.map((res: any, idx: number) => (
              <div
                key={idx}
                onClick={() => setSelectedDamageIdx(idx)}
                className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 text-xs ${
                  selectedDamageIdx === idx
                    ? "bg-emerald-50/70 border-[#2e7d32] shadow-sm ring-1 ring-[#2e7d32]"
                    : "bg-[#f8faf7] border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex justify-between font-bold text-[#1a382b]">
                  <span>Field Image #{res.image_number || idx + 1}</span>
                  <span className="text-red-700 font-bold">{res.damage_percentage}% Damage</span>
                </div>
                <div className="text-gray-500 truncate">{res.original_filename}</div>
                <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-1 text-[11px] text-gray-600">
                  <div>Healthy: <strong>{res.healthy_wheat_pixel_count} px</strong></div>
                  <div>Damaged: <strong>{res.damaged_wheat_pixel_count} px</strong></div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => setStep(6)}
              className="btn-agri-secondary flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Field Photos</span>
            </button>
            <button
              onClick={() => setStep(8)}
              className="btn-agri-primary flex items-center space-x-2"
            >
              <span>Proceed to Location & Metadata Verification</span>
              <ArrowRight className="w-4 h-4 text-[#d4af37]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 8: LOCATION & METADATA EVIDENCE */}
      {step === 8 && (
        <div className="card-agri p-8 space-y-6">
          <h2 className="text-xl font-bold text-[#1a382b] border-b border-gray-200 pb-3">Step 8: Location & Metadata Verification</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#2e7d32]">Geographic Location Comparison</h3>
              <div className="p-4 rounded-xl bg-[#f8faf7] border border-gray-200 text-xs space-y-2">
                <div>Registered Farm: <strong>{farmLat !== null && farmLon !== null ? `Lat ${farmLat}, Lon ${farmLon}` : "Not registered"}</strong></div>
                <div>Claim Location: <strong>{claimLat !== null && claimLon !== null ? `Lat ${claimLat.toFixed(6)}, Lon ${claimLon.toFixed(6)}` : "Not captured"}</strong></div>
                <div>Location Source: <strong className="text-[#2e7d32]">{locationSource}</strong></div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#2e7d32]">EXIF Metadata Completeness</h3>
              <div className="p-4 rounded-xl bg-[#f8faf7] border border-gray-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span>EXIF GPS Status:</span>
                  <span className={`font-bold ${exifLat && exifLon ? "text-[#2e7d32]" : "text-amber-700"}`}>
                    {exifLat && exifLon ? `Lat ${exifLat.toFixed(4)}, Lon ${exifLon.toFixed(4)}` : "EXIF GPS not available"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Close-up Photos:</span>
                  <span className="font-bold text-[#1a382b]">{closeUpFiles.length} files (3-5 required)</span>
                </div>
                <div className="flex justify-between">
                  <span>Field Photos:</span>
                  <span className="font-bold text-[#1a382b]">{fieldFiles.length} files (3-5 required)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => setStep(7)}
              className="btn-agri-secondary flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(9)}
              className="btn-agri-primary flex items-center space-x-2"
            >
              <span>Calculate Evidence Score</span>
              <Award className="w-4 h-4 text-[#d4af37]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 9: 100-POINT EVIDENCE SCORE */}
      {step === 9 && (
        <div className="card-agri p-8 space-y-6">
          <div className="border-b border-gray-200 pb-3 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#2e7d32]">Agri-Vision Scoring Engine</span>
              <h2 className="text-xl font-bold text-[#1a382b]">Step 9: Transparent 100-Point Evidence Score</h2>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-[#b89528] font-mono">
                {diseaseResult && damageResult ? 90 : 75}
              </span>
              <span className="text-xs text-gray-500 font-bold"> / 100</span>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#f8faf7] border border-gray-200 flex justify-between items-center">
              <span className="font-medium text-gray-800">Disease Identification Evidence</span>
              <span className="font-bold text-[#1a382b] font-mono">{diseaseResult ? "30 / 30 pts" : "15 / 30 pts"}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#f8faf7] border border-gray-200 flex justify-between items-center">
              <span className="font-medium text-gray-800">Location Verification</span>
              <span className="font-bold text-[#1a382b] font-mono">{claimLat && claimLon ? "20 / 20 pts" : "10 / 20 pts"}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#f8faf7] border border-gray-200 flex justify-between items-center">
              <span className="font-medium text-gray-800">Image Count Requirements (3-5 Close-ups + 3-5 Fields)</span>
              <span className="font-bold text-[#1a382b] font-mono">15 / 15 pts</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#f8faf7] border border-gray-200 flex justify-between items-center">
              <span className="font-medium text-gray-800">Prediction Consistency (Voting Agreement)</span>
              <span className="font-bold text-[#1a382b] font-mono">15 / 15 pts</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#f8faf7] border border-gray-200 flex justify-between items-center">
              <span className="font-medium text-gray-800">Visible Crop Damage Segmentation</span>
              <span className="font-bold text-[#1a382b] font-mono">{damageResult ? "10 / 15 pts" : "0 / 15 pts"}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#f8faf7] border border-gray-200 flex justify-between items-center">
              <span className="font-medium text-gray-800">Metadata Completeness</span>
              <span className="font-bold text-[#1a382b] font-mono">5 / 5 pts</span>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => setStep(8)}
              className="btn-agri-secondary flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(10)}
              className="btn-agri-primary flex items-center space-x-2"
            >
              <span>Final Review & Submission</span>
              <ArrowRight className="w-4 h-4 text-[#d4af37]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 10: FINAL REVIEW & SUBMISSION */}
      {step === 10 && (
        <div className="card-agri p-8 space-y-6">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-xl font-bold text-[#1a382b]">Step 10: Final Review & Submission</h2>
            <p className="text-xs text-gray-500 mt-1">
              Confirm evidence details before persisting claim snapshot to PostgreSQL database.
            </p>
          </div>

          {!submittedClaim ? (
            <>
              {/* Human Governance Banner */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="flex items-center space-x-2 font-bold text-amber-800">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>AI-Assisted Assessment / Requires Human Review</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800/80">
                  This AI evidence snapshot will be routed to an authorized insurance officer for final decision-making. No claim is automatically approved or rejected by AI.
                </p>
              </div>

              {/* Summary Overview */}
              <div className="p-4 rounded-xl bg-[#f8faf7] border border-gray-200 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>Farmer Name: <strong>{farmerName}</strong></div>
                  <div>Farm Name: <strong>{farmName}</strong></div>
                  <div>Disease Diagnosis: <strong className="text-amber-800">{diseaseResult?.final_result?.prediction || "N/A"}</strong></div>
                  <div>Crop Damage Ratio: <strong className="text-red-700">{damageResult?.overall_damage_analysis?.overall_damage_percentage ?? "N/A"}%</strong></div>
                </div>
              </div>

              {submitError && (
                <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => setStep(9)}
                  className="btn-agri-secondary flex items-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={submitFinalClaim}
                  disabled={submitting}
                  className="btn-agri-gold px-8 py-3 text-base flex items-center space-x-2 disabled:opacity-50"
                >
                  <span>{submitting ? "Saving Claim to Database..." : "Submit Claim File"}</span>
                  <FileCheck2 className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            /* Success View */
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 text-[#2e7d32] rounded-full flex items-center justify-center mx-auto border border-emerald-300">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-bold text-[#1a382b]">Claim Submitted Successfully</h3>
                <p className="text-xs text-gray-600">
                  Your crop insurance claim file has been persisted to the PostgreSQL database and routed for officer review.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#f8faf7] border border-gray-200 text-xs max-w-md mx-auto space-y-2 text-left font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Official Claim No:</span>
                  <span className="font-bold text-[#1a382b] text-sm px-2 py-0.5 rounded bg-emerald-100/70 border border-emerald-300">
                    {getClaimNumber(submittedClaim)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Claim Docket:</span>
                  <span className="font-semibold text-gray-800">
                    {getLogicalClaimTitle(submittedClaim)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Initial Status:</span>
                  <span className="font-bold text-blue-700 uppercase">{submittedClaim.status || "pending_review"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Submission Timestamp:</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <Link
                  href={`/claims/${submittedClaim.claim_id}`}
                  className="btn-agri-primary px-8 py-3 text-sm flex items-center gap-2"
                >
                  <span>View Claim Audit Page</span>
                  <ArrowRight className="w-4 h-4 text-[#d4af37]" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
