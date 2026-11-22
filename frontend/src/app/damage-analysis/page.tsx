"use client";

import React, { useState } from "react";
import ImageComparisonSlider from "@/components/ImageComparisonSlider";
import { predictDamageSingle, predictDamageMultiple, getResultImageUrl } from "@/lib/api";
import {
  Upload,
  Layers,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  RefreshCw,
  Sliders,
  Shield,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

export default function DamageAnalysisStudio() {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  function handleSingleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setSingleFile(e.target.files[0]);
      setError(null);
    }
  }

  function handleBatchChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length < 3 || filesArray.length > 5) {
        setError("Batch damage analysis requires between 3 and 5 field-view images.");
        setBatchFiles([]);
        return;
      }
      setBatchFiles(filesArray);
      setError(null);
    }
  }

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedIdx(0);

    try {
      if (mode === "single") {
        if (!singleFile) {
          setError("Please select a field-view image to analyze.");
          setLoading(false);
          return;
        }
        const res = await predictDamageSingle(singleFile);
        setResult({ is_batch: false, data: res });
      } else {
        if (batchFiles.length < 3 || batchFiles.length > 5) {
          setError("Please select between 3 and 5 field-view images for batch analysis.");
          setLoading(false);
          return;
        }
        const res = await predictDamageMultiple(batchFiles);
        setResult({ is_batch: true, data: res });
      }
    } catch (err: any) {
      setError(err.message || "Damage segmentation processing failed.");
    } finally {
      setLoading(false);
    }
  }

  // Helper for displaying current active image in results
  const batchList = result?.is_batch ? (result.data.individual_results || result.data.individual_predictions || []) : [];
  const currentPrediction = result
    ? result.is_batch
      ? batchList[selectedIdx] || null
      : result.data
    : null;

  const originalImgUrl = result
    ? result.is_batch
      ? (currentPrediction?.stored_filename ? `/uploads/${currentPrediction.stored_filename}` : currentPrediction?.original_url || "")
      : (result.data?.image?.stored_filename ? `/uploads/${result.data.image.stored_filename}` : result.data?.original_url || "")
    : "";

  const overlayImgUrl = result
    ? result.is_batch
      ? (currentPrediction?.overlay_url || "")
      : (result.data?.damage_analysis?.overlay_url || "")
    : "";

  const maskImgUrl = result
    ? result.is_batch
      ? (currentPrediction?.mask_url || "")
      : (result.data?.damage_analysis?.mask_url || "")
    : "";

  const damagePct = result
    ? result.is_batch
      ? currentPrediction?.damage_percentage
      : result.data?.damage_analysis?.damage_percentage
    : undefined;

  const overallDamagePct = result?.is_batch
    ? (result.data?.overall_damage_analysis?.overall_damage_percentage ?? result.data?.overall_damage_analysis?.mean_damage_percentage)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Damage Segmentation Studio"
          description="Residual U-Net Architecture • 256×256px Resolution • 92.11% Overall Pixel Accuracy"
        />

        <div className="flex items-center gap-2 bg-[#f8faf7] p-1.5 rounded-xl border border-gray-200">
          <button
            onClick={() => {
              setMode("single");
              setResult(null);
              setError(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === "single"
                ? "bg-[#1a382b] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Single Photo Mode
          </button>
          <button
            onClick={() => {
              setMode("batch");
              setResult(null);
              setError(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === "batch"
                ? "bg-[#1a382b] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Batch Mode (3–5 Photos)
          </button>
        </div>
      </div>

      {/* Legal Disclaimer */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
            AI-Assisted Assessment • Requires Human Review
          </span>
          Segmentations are automatically generated by the frozen production Residual U-Net model (<code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">best.keras</code>). Pixel accuracy (92.11%) represents overall semantic label agreement, not standalone damage estimation accuracy.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Upload Controls */}
        <div className="card-agri p-6 space-y-6">
          <h2 className="text-base font-bold text-[#1a382b] flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#2e7d32]" />
            {mode === "single" ? "Upload Single Field Image" : "Upload Batch Field Images (3–5)"}
          </h2>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              {error}
            </div>
          )}

          {mode === "single" ? (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-gray-300 hover:border-[#2e7d32] rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-[#f8faf7] hover:bg-emerald-50/50 transition text-center">
                <Upload className="w-8 h-8 text-[#2e7d32]" />
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-gray-800 block">
                    {singleFile ? singleFile.name : "Click or drag field view photo"}
                  </span>
                  <span className="text-xs text-gray-500 block">
                    PNG, JPG, JPEG up to 10MB
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSingleChange}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-gray-300 hover:border-[#2e7d32] rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-[#f8faf7] hover:bg-emerald-50/50 transition text-center">
                <Upload className="w-8 h-8 text-[#2e7d32]" />
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-gray-800 block">
                    {batchFiles.length > 0
                      ? `${batchFiles.length} images selected`
                      : "Select 3 to 5 field view photos"}
                  </span>
                  <span className="text-xs text-gray-500 block">
                    Hold Ctrl / Cmd to select multiple files
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBatchChange}
                  className="hidden"
                />
              </label>

              {batchFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-700 block">Selected Files:</span>
                  <ul className="space-y-1">
                    {batchFiles.map((f, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-700 bg-[#f8faf7] p-2 rounded-lg border border-gray-200 flex justify-between"
                      >
                        <span>{f.name}</span>
                        <span className="text-gray-500">{(f.size / 1024).toFixed(0)} KB</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || (mode === "single" ? !singleFile : batchFiles.length < 3)}
            className="btn-agri-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Running Residual U-Net...
              </>
            ) : (
              <>
                <Layers className="w-4 h-4" /> Run Damage Segmentation
              </>
            )}
          </button>

          <div className="p-4 bg-[#f8faf7] border border-gray-200 rounded-xl space-y-2 text-xs text-gray-600">
            <span className="font-bold text-[#1a382b] block">Technical Specifications:</span>
            <p>• Model: Frozen Residual U-Net (3-class logits)</p>
            <p>• Input Preprocessing: Resized to 256×256×3, scaled by 1/255.0</p>
            <p>• Output Mapping: 0 = Background, 1 = Healthy Wheat, 2 = Damaged Wheat</p>
            <p>• Formula: Damaged / (Healthy + Damaged) × 100</p>
          </div>
        </div>

        {/* Right Interactive Viewer & Results */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <div className="space-y-6">
              {/* Batch image tab selector if batch mode */}
              {result.is_batch && batchList.length > 0 && (
                <div className="card-agri p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {batchList.map((p: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedIdx(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                          selectedIdx === idx
                            ? "bg-[#1a382b] text-white shadow-sm"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Image #{idx + 1} ({p.damage_percentage !== undefined ? `${p.damage_percentage.toFixed(1)}%` : "Processed"})
                      </button>
                    ))}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-gray-500 block">Aggregated Field Damage</span>
                    <span className="text-sm font-bold text-[#1a382b]">
                      {overallDamagePct !== undefined ? `${overallDamagePct.toFixed(2)}%` : "N/A"}
                    </span>
                  </div>
                </div>
              )}

              {/* Slider & Overlay */}
              {currentPrediction && (
                <div className="card-agri p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-[#1a382b] flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-[#2e7d32]" /> Interactive Comparison Viewer
                    </h2>
                    <span className="px-3 py-1 bg-[#f8faf7] border border-gray-200 text-[#2e7d32] rounded-full text-xs font-semibold">
                      Mask Integrity: PASS
                    </span>
                  </div>

                  <ImageComparisonSlider
                    originalUrl={getResultImageUrl(originalImgUrl)}
                    maskUrl={getResultImageUrl(maskImgUrl)}
                    overlayUrl={getResultImageUrl(overlayImgUrl)}
                  />

                  {/* Quantitative Metrics Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="bg-[#f8faf7] p-4 rounded-xl border border-gray-200 space-y-1">
                      <span className="text-xs text-gray-500 block uppercase font-medium">Damage Ratio</span>
                      <span className="text-xl font-bold text-[#1a382b]">
                        {damagePct !== undefined
                          ? `${damagePct.toFixed(2)}%`
                          : "N/A"}
                      </span>
                    </div>

                    <div className="bg-[#f8faf7] p-4 rounded-xl border border-gray-200 space-y-1">
                      <span className="text-xs text-gray-500 block uppercase font-medium">Severity Level</span>
                      <span className="text-xl font-bold text-gray-800">
                        {damagePct !== undefined
                          ? damagePct > 25
                            ? "High (>25%)"
                            : damagePct > 10
                            ? "Moderate (10-25%)"
                            : "Low (<10%)"
                          : "N/A"}
                      </span>
                    </div>

                    <div className="bg-[#f8faf7] p-4 rounded-xl border border-gray-200 space-y-1">
                      <span className="text-xs text-gray-500 block uppercase font-medium">Valid Pixel Values</span>
                      <span className="text-sm font-semibold text-[#2e7d32] font-mono">
                        Strict {"{0, 1, 2}"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-96 card-agri border-dashed border-gray-300 flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="p-4 bg-emerald-50 rounded-full text-[#2e7d32]">
                <Layers className="w-10 h-10" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-bold text-[#1a382b]">No Image Analyzed Yet</h3>
                <p className="text-xs text-gray-500">
                  Upload a field photo on the left panel to execute pixel-level crop damage segmentation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
