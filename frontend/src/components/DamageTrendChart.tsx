"use client";

import React, { useState } from "react";
import { Observation } from "@/lib/api";

interface DamageTrendChartProps {
  observations: Observation[];
}

export default function DamageTrendChart({ observations }: DamageTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Filter valid observations that have damage_percentage
  const validData = observations
    .filter((o) => o.status === "finalized" || (o.damage_percentage !== undefined && o.damage_percentage !== null))
    .sort((a, b) => new Date(a.observation_date).getTime() - new Date(b.observation_date).getTime());

  if (validData.length < 2) {
    return (
      <div className="w-full bg-[#f8faf7] border border-dashed border-gray-300 rounded-2xl p-8 text-center my-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-[#2e7d32] mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h4 className="text-[#1a382b] font-bold text-base">Not enough observations to calculate a trend.</h4>
        <p className="text-gray-500 text-xs mt-1">
          Perform at least 2 farm observations over time to generate a temporal crop damage trend line.
        </p>
      </div>
    );
  }

  // Chart dimensions
  const width = 650;
  const height = 240;
  const padding = { top: 30, right: 30, bottom: 45, left: 50 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Calculate damage bounds (Y-axis 0 to maxDamage)
  const maxDamage = Math.max(50, Math.ceil(Math.max(...validData.map((d) => d.damage_percentage || 0)) / 10) * 10 + 10);
  const minDamage = 0;

  // Generate coordinates
  const points = validData.map((d, i) => {
    const x = padding.left + (i / (validData.length - 1)) * chartW;
    const yVal = d.damage_percentage || 0;
    const y = padding.top + chartH - ((yVal - minDamage) / (maxDamage - minDamage)) * chartH;
    const dateStr = new Date(d.observation_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return { x, y, dateStr, ...d };
  });

  // SVG Line path string
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Gradient area path string
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  // Grid ticks
  const yTicks = [0, 25, 50, 75, 100].filter((t) => t <= maxDamage);

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-6 my-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#1a382b] tracking-wide uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2e7d32] animate-pulse"></span>
            Observed Crop Damage Trend
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Estimated Damage Percentage over time across farm observations
          </p>
        </div>
        <div className="text-xs text-[#2e7d32] font-mono font-bold bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
          {validData.length} Observations Recorded
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          <defs>
            <linearGradient id="damageGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2e7d32" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2e7d32" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines & labels */}
          {yTicks.map((tick) => {
            const yPos = padding.top + chartH - ((tick - minDamage) / (maxDamage - minDamage)) * chartH;
            return (
              <g key={`y-grid-${tick}`}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text x={padding.left - 10} y={yPos + 4} textAnchor="end" className="text-[10px] fill-gray-500 font-mono">
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Gradient area under line */}
          <path d={areaPath} fill="url(#damageGradient)" />

          {/* Main trend line */}
          <path d={linePath} fill="none" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points & X-axis labels */}
          {points.map((p, idx) => (
            <g key={`point-${idx}`}>
              {/* X-axis tick label */}
              <text x={p.x} y={padding.top + chartH + 20} textAnchor="middle" className="text-[11px] fill-gray-700 font-bold">
                {p.dateStr}
              </text>
              <text x={p.x} y={padding.top + chartH + 34} textAnchor="middle" className="text-[9px] fill-gray-400 font-mono">
                {p.observation_code}
              </text>

              {/* Data Point Dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIdx === idx ? 7 : 5}
                className="fill-[#d4af37] stroke-[#1a382b] stroke-2 cursor-pointer transition-all duration-200 hover:fill-white"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />

              {/* Value Label above point */}
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                className="text-[11px] fill-[#1a382b] font-bold font-mono"
              >
                {(p.damage_percentage || 0).toFixed(1)}%
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#1a382b] border border-[#2d5241] text-white text-xs px-3 py-1.5 rounded-xl shadow-xl pointer-events-none transition-all duration-200">
            <span className="font-mono font-bold text-[#d4af37]">{points[hoveredIdx].observation_code}</span>:{" "}
            <span className="font-bold text-white">{(points[hoveredIdx].damage_percentage || 0).toFixed(1)}% Estimated Damage</span>{" "}
            ({points[hoveredIdx].disease_result || "Healthy"}) on {points[hoveredIdx].dateStr}
          </div>
        )}
      </div>
    </div>
  );
}

