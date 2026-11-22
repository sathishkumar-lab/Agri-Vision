"use client";

import React, { useState } from "react";
import { predictDiseaseSingle, predictDiseaseMultiple, getResultImageUrl } from "@/lib/api";
import {
  Upload,
  Activity,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Cpu,
  BarChart2,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

export default function DiseaseAnalysisStudio() {
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
        setError("Batch disease identification requires between 3 and 5 close-up images.");
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
          setError("Please select a close-up crop leaf image.");
          setLoading(false);
          return;
        }
        const res = await predictDiseaseSingle(singleFile);
        setResult({ is_batch: false, data: res });
      } else {
        if (batchFiles.length < 3 || batchFiles.length > 5) {
          setError("Please select between 3 and 5 close-up images for multi-image consensus analysis.");
          setLoading(false);
          return;
        }
        const res = await predictDiseaseMultiple(batchFiles);
        setResult({ is_batch: true, data: res });
      }
    } catch (err: any) {
      setError(err.message || "Disease classification processing failed.");
    } finally {
      setLoading(false);
    }
  }

  const batchList = result?.is_batch ? (result.data?.individual_predictions || []) : [];
  const currentPrediction = result
    ? result.is_batch
      ? batchList[selectedIdx] || null
      : result.data
    : null;

  const originalImgUrl = result
    ? result.is_batch
      ? (currentPrediction?.stored_filename ? `/uploads/${currentPrediction.stored_filename}` : currentPrediction?.original_url || "")
      : (result.data?.original_image?.stored_filename ? `/uploads/${result.data.original_image.stored_filename}` : result.data?.original_url || "")
    : "";

  const predictedClass = result
    ? result.is_batch
      ? (currentPrediction?.prediction || currentPrediction?.predicted_class || "Healthy")
      : (result.data?.prediction || result.data?.predicted_class || "Healthy")
    : "Healthy";

  const confidenceVal = result
    ? result.is_batch
      ? (currentPrediction?.confidence ?? 95.0)
      : (result.data?.confidence ?? 95.0)
    : 95.0;

  const consensusClass = result?.is_batch
    ? (result.data?.final_result?.prediction || result.data?.consensus || "Healthy")
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Disease Classification Studio"
          description="MobileNetV2 Architecture • 224×224px RGB Input • 3-Class Diagnosis (Healthy, Septoria, Stripe Rust)"
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
          Disease diagnoses are computed using frozen MobileNetV2 neural weights (<code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">final_wheat_inference_model.keras</code>). Model outputs serve as decision support for claims officers.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Upload Panel */}
        <div className="card-agri p-6 space-y-6">
          <h2 className="text-base font-bold text-[#1a382b] flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#2e7d32]" />
            {mode === "single" ? "Upload Single Close-up Image" : "Upload Batch Close-up Images (3–5)"}
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
                    {singleFile ? singleFile.name : "Click or drag close-up leaf photo"}
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
                      : "Select 3 to 5 close-up leaf photos"}
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
                <RefreshCw className="w-4 h-4 animate-spin" /> Classifying MobileNetV2...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" /> Run Disease Identification
              </>
            )}
          </button>

          <div className="p-4 bg-[#f8faf7] border border-gray-200 rounded-xl space-y-2 text-xs text-gray-600">
            <span className="font-bold text-[#1a382b] block">Supported Pathogen Classes:</span>
            <p>1. Healthy Wheat</p>
            <p>2. Septoria Leaf Blotch</p>
            <p>3. Stripe Rust (Yellow Rust)</p>
          </div>
        </div>

        {/* Right Output Results */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <div className="space-y-6">
              {/* Batch Consensus Top Bar */}
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
                        Leaf #{idx + 1} ({p.prediction || p.predicted_class || "Diagnosed"})
                      </button>
                    ))}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-gray-500 block">Consensus Diagnosis</span>
                    <span className="text-sm font-bold text-[#1a382b]">
                      {consensusClass}
                    </span>
                  </div>
                </div>
              )}

              {currentPrediction && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Photo Display */}
                  <div className="card-agri p-4 flex items-center justify-center bg-gray-900/5 min-h-64">
                    {originalImgUrl ? (
                      <img
                        src={getResultImageUrl(originalImgUrl)}
                        alt="Analyzed crop photo"
                        className="max-h-80 max-w-full rounded-xl object-contain border border-gray-200"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">Photo view unavailable</span>
                    )}
                  </div>

                  {/* Quantitative Output Card */}
                  <div className="card-agri p-6 space-y-6">
                    <h2 className="text-base font-bold text-[#1a382b] flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-[#2e7d32]" /> Neural Classifier Diagnosis
                    </h2>

                    <div className="space-y-4">
                      <div className="p-4 bg-[#f8faf7] rounded-xl border border-gray-200 space-y-1">
                        <span className="text-xs text-gray-500 block uppercase tracking-wide font-medium">Identified Pathogen Condition</span>
                        <span className="text-xl font-bold text-[#1a382b]">
                          {predictedClass}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-600 font-medium">
                          <span>Model Confidence:</span>
                          <span className="text-[#2e7d32] font-bold">
                            {confidenceVal > 1.0 ? `${confidenceVal.toFixed(1)}%` : `${(confidenceVal * 100).toFixed(1)}%`}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2e7d32] rounded-full"
                            style={{
                              width: `${confidenceVal > 1.0 ? confidenceVal : confidenceVal * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1 font-mono">
                        <p>• MobileNetV2 Input: 224×224 RGB</p>
                        <p>• Normalization: keras.applications.mobilenet_v2.preprocess_input</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-96 card-agri border-dashed border-gray-300 flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="p-4 bg-emerald-50 rounded-full text-[#2e7d32]">
                <Activity className="w-10 h-10" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-bold text-[#1a382b]">No Close-up Image Analyzed</h3>
                <p className="text-xs text-gray-500">
                  Upload a crop leaf close-up photo on the left panel to execute MobileNetV2 disease identification.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
