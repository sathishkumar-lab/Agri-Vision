"use client";

import { useState } from "react";
import { Image as ImageIcon, Eye, Layers } from "lucide-react";

interface ImageComparisonProps {
  originalUrl: string;
  maskUrl?: string;
  overlayUrl?: string;
  maskOverlayUrl?: string;
  height?: string;
}

export default function ImageComparisonSlider({
  originalUrl,
  maskUrl,
  overlayUrl,
  maskOverlayUrl,
  height = "380px",
}: ImageComparisonProps) {
  const finalOverlayUrl = overlayUrl || maskOverlayUrl || originalUrl;
  const finalMaskUrl = maskUrl || maskOverlayUrl || originalUrl;
  const [activeTab, setActiveTab] = useState<"overlay" | "mask" | "original" | "side_by_side">("overlay");
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="bg-[#152e23] border border-[#2a4d3d] rounded-2xl p-4 shadow-xl">
      {/* Tab Switcher Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[#254d3c]">
        <div className="flex items-center space-x-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#d4af37] flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Segmentation Visuals
          </span>
        </div>
        
        <div className="flex items-center space-x-1 bg-[#10241b] p-1 rounded-xl border border-[#254d3c]">
          <button
            onClick={() => setActiveTab("overlay")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === "overlay"
                ? "bg-[#2e7d32] text-white shadow-sm font-semibold"
                : "text-emerald-200/70 hover:text-white"
            }`}
          >
            Overlay View
          </button>
          <button
            onClick={() => setActiveTab("side_by_side")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === "side_by_side"
                ? "bg-[#2e7d32] text-white shadow-sm font-semibold"
                : "text-emerald-200/70 hover:text-white"
            }`}
          >
            Slider Split
          </button>
          <button
            onClick={() => setActiveTab("mask")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === "mask"
                ? "bg-[#2e7d32] text-white shadow-sm font-semibold"
                : "text-emerald-200/70 hover:text-white"
            }`}
          >
            Raw Mask
          </button>
          <button
            onClick={() => setActiveTab("original")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === "original"
                ? "bg-[#2e7d32] text-white shadow-sm font-semibold"
                : "text-emerald-200/70 hover:text-white"
            }`}
          >
            Original Image
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center" style={{ height }}>
        {activeTab === "overlay" && (
          <img src={finalOverlayUrl} alt="Damage Segmentation Overlay" className="w-full h-full object-contain" />
        )}
        
        {activeTab === "mask" && (
          <img src={finalMaskUrl} alt="Segmentation Mask" className="w-full h-full object-contain" />
        )}

        {activeTab === "original" && (
          <img src={originalUrl} alt="Original Canopy Image" className="w-full h-full object-contain" />
        )}

        {activeTab === "side_by_side" && (
          <div className="relative w-full h-full select-none overflow-hidden">
            {/* Background Image: Original */}
            <img src={originalUrl} alt="Original" className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none" />
            
            {/* Foreground Image: Overlay with clip */}
            <div
              className="absolute top-0 left-0 h-full overflow-hidden pointer-events-none"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={finalOverlayUrl}
                alt="Overlay"
                className="absolute top-0 left-0 max-w-none h-full object-contain"
                style={{ width: "100%" }}
              />
            </div>

            {/* Slider Handle Divider */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-[#d4af37] cursor-ew-resize shadow-2xl z-20 flex items-center justify-center"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-7 h-7 rounded-full bg-[#d4af37] text-[#1a382b] flex items-center justify-center text-xs font-bold shadow-lg">
                ↔
              </div>
            </div>

            {/* Interactive Range Input */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-ew-resize z-30"
            />
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-center space-x-6 mt-3 text-xs text-emerald-200/80">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-600 inline-block shadow-sm"></span>
          <span>Class 2: Damaged Wheat</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shadow-sm"></span>
          <span>Class 1: Healthy Wheat</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-black border border-gray-600 inline-block shadow-sm"></span>
          <span>Class 0: Background</span>
        </span>
      </div>
    </div>
  );
}
