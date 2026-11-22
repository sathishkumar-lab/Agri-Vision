"use client";

import React from "react";
import PageHeader from "@/components/ui/PageHeader";
import { Cpu, Layers, Activity, Shield, BarChart2 } from "lucide-react";

export default function ModelPerformanceAudit() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Technical Model Performance & Evaluation Audit"
        description="Authoritative Metrics Measured Against Frozen 44-Image Option-2 Benchmark Dataset"
      />

      {/* Important Provenance Banner */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
        <Shield className="w-5 h-5 text-[#2e7d32] shrink-0 mt-0.5" />
        <div className="text-xs text-[#1a382b] leading-relaxed">
          <span className="font-bold text-[#1a382b] uppercase tracking-wider block mb-0.5">
            Frozen Production Weights • Scientific Verification Provenance
          </span>
          Production models (<code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[#1a382b]">best.keras</code> Residual U-Net &amp; <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[#1a382b]">final_wheat_inference_model.keras</code> MobileNetV2) are permanently frozen. Evaluation metrics are strictly reported on original human-annotated ground-truth test data.
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Residual U-Net Damage Segmentation Section */}
        <div className="card-agri p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1a382b] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#2e7d32]" /> Residual U-Net Damage Segmentation Metrics
              </h2>
              <p className="text-xs text-gray-500 font-mono">
                Architecture: Residual U-Net • Model File: ml/damage_segmentation/models/production/best.keras
              </p>
            </div>
            <div className="px-4 py-2 bg-[#f8faf7] border border-gray-200 rounded-xl text-right">
              <span className="text-xs text-gray-500 block">Overall Pixel Accuracy</span>
              <span className="text-xl font-bold text-[#2e7d32] font-mono">92.11%</span>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-[#f8faf7] p-4 rounded-xl border border-gray-200 space-y-1">
              <span className="text-xs text-gray-500 block uppercase font-medium">Overall Pixel Accuracy</span>
              <span className="text-xl font-bold text-[#2e7d32] font-mono">92.11%</span>
              <span className="text-[10px] text-gray-500 block">Total correct pixels</span>
            </div>

            <div className="bg-[#f8faf7] p-4 rounded-xl border border-gray-200 space-y-1">
              <span className="text-xs text-gray-500 block uppercase font-medium">Mean IoU (mIoU)</span>
              <span className="text-xl font-bold text-gray-900 font-mono">81.52%</span>
              <span className="text-[10px] text-gray-500 block">Mean across 3 classes</span>
            </div>

            <div className="bg-[#f8faf7] p-4 rounded-xl border border-gray-200 space-y-1">
              <span className="text-xs text-gray-500 block uppercase font-medium">Damage IoU</span>
              <span className="text-xl font-bold text-amber-700 font-mono">66.18%</span>
              <span className="text-[10px] text-gray-500 block">Intersection over union</span>
            </div>

            <div className="bg-[#f8faf7] p-4 rounded-xl border border-gray-200 space-y-1">
              <span className="text-xs text-gray-500 block uppercase font-medium">Damage Dice / F1</span>
              <span className="text-xl font-bold text-amber-700 font-mono">79.65%</span>
              <span className="text-[10px] text-gray-500 block">Harmonic mean precision/recall</span>
            </div>

            <div className="bg-[#f8faf7] p-4 rounded-xl border border-gray-200 space-y-1">
              <span className="text-xs text-gray-500 block uppercase font-medium">Damage Precision</span>
              <span className="text-xl font-bold text-gray-900 font-mono">74.05%</span>
              <span className="text-[10px] text-gray-500 block">Positive predictive value</span>
            </div>

            <div className="bg-[#f8faf7] p-4 rounded-xl border border-gray-200 space-y-1">
              <span className="text-xs text-gray-500 block uppercase font-medium">Damage Recall</span>
              <span className="text-xl font-bold text-gray-900 font-mono">86.16%</span>
              <span className="text-[10px] text-gray-500 block">Sensitivity to damaged wheat</span>
            </div>

            <div className="bg-[#f8faf7] p-4 rounded-xl border border-gray-200 space-y-1">
              <span className="text-xs text-gray-500 block uppercase font-medium">Damage % MAE</span>
              <span className="text-xl font-bold text-[#2e7d32] font-mono">6.12 pp</span>
              <span className="text-[10px] text-gray-500 block">Mean absolute error (pp)</span>
            </div>

            <div className="bg-[#f8faf7] p-4 rounded-xl border border-gray-200 space-y-1">
              <span className="text-xs text-gray-500 block uppercase font-medium">Damage % RMSE</span>
              <span className="text-xl font-bold text-[#2e7d32] font-mono">10.63 pp</span>
              <span className="text-[10px] text-gray-500 block">Root mean squared error</span>
            </div>
          </div>

          {/* IoU Class Breakdown Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#1a382b] uppercase tracking-wider">
              Per-Class Intersection-over-Union (IoU) Breakdown
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-[#f8faf7] text-gray-600 font-semibold">
                    <th className="p-3">Class Index</th>
                    <th className="p-3">Class Label</th>
                    <th className="p-3">Class IoU</th>
                    <th className="p-3">Dice / F1 Score</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800 bg-white">
                  <tr>
                    <td className="p-3 font-bold">0</td>
                    <td className="p-3 font-semibold">Background</td>
                    <td className="p-3 text-[#2e7d32] font-bold">88.96%</td>
                    <td className="p-3">94.16%</td>
                    <td className="p-3 text-gray-500 font-sans">Benchmark Validated</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">1</td>
                    <td className="p-3 font-semibold">Healthy Wheat</td>
                    <td className="p-3 text-[#2e7d32] font-bold">89.41%</td>
                    <td className="p-3 text-[#2e7d32] font-bold">94.41%</td>
                    <td className="p-3 text-gray-500 font-sans">Benchmark Validated</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">2</td>
                    <td className="p-3 font-semibold">Damaged Wheat</td>
                    <td className="p-3 text-amber-700 font-bold">66.18%</td>
                    <td className="p-3 text-amber-700 font-bold">79.65%</td>
                    <td className="p-3 text-gray-500 font-sans">Benchmark Validated</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 2. MobileNetV2 Disease Classification Section */}
        <div className="card-agri p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1a382b] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#2e7d32]" /> MobileNetV2 Disease Identification Metrics
              </h2>
              <p className="text-xs text-gray-500 font-mono">
                Architecture: MobileNetV2 • Model File: models/final_wheat_inference_model.keras
              </p>
            </div>
            <div className="px-4 py-2 bg-[#f8faf7] border border-gray-200 rounded-xl text-right">
              <span className="text-xs text-gray-500 block">Test Accuracy</span>
              <span className="text-xl font-bold text-[#2e7d32] font-mono">94.20%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#f8faf7] p-5 rounded-xl border border-gray-200 space-y-2">
              <span className="text-xs text-gray-500 font-semibold block uppercase">Class 1: Healthy Wheat</span>
              <div className="text-2xl font-bold text-[#2e7d32] font-mono">96.5% F1</div>
              <p className="text-xs text-gray-600">High precision identification of uninfected crop foliage.</p>
            </div>

            <div className="bg-[#f8faf7] p-5 rounded-xl border border-gray-200 space-y-2">
              <span className="text-xs text-gray-500 font-semibold block uppercase">Class 2: Septoria Leaf Blotch</span>
              <div className="text-2xl font-bold text-[#2e7d32] font-mono">93.1% F1</div>
              <p className="text-xs text-gray-600">Detects necrotic lesions and pycnidia specks.</p>
            </div>

            <div className="bg-[#f8faf7] p-5 rounded-xl border border-gray-200 space-y-2">
              <span className="text-xs text-gray-500 font-semibold block uppercase">Class 3: Stripe Rust / Yellow Rust</span>
              <div className="text-2xl font-bold text-[#2e7d32] font-mono">93.0% F1</div>
              <p className="text-xs text-gray-600">Identifies yellow linear pustule stripes along veins.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
