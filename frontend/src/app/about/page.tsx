"use client";

import React from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { ShieldCheck, MapPin, Layers, Award, ArrowRight, Cpu } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-[#2e7d32] rounded-full text-xs font-bold uppercase tracking-wider">
          Enterprise Crop Analytics Platform
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a382b] tracking-tight">
          About Agri-Vision
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          Agri-Vision is an institutional AI crop image analytics platform engineered specifically for agricultural insurance claim verification. Combining dual computer vision models, EXIF geospatial geofencing, and a 100-point evidence scoring engine, Agri-Vision provides transparent, objective decision support for claims officers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-agri p-6 space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-[#2e7d32] rounded-xl w-fit">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#1a382b]">Dual Deep-Learning Models</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Integrates a frozen MobileNetV2 classifier for close-up leaf disease identification (Healthy, Septoria, Stripe Rust) alongside a frozen Residual U-Net segmentation model (256×256px resolution) for pixel-level field damage ratio calculations.
          </p>
        </div>

        <div className="card-agri p-6 space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-[#2e7d32] rounded-xl w-fit">
            <MapPin className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#1a382b]">Geospatial EXIF Geofencing</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Extracts photo acquisition GPS metadata directly from EXIF headers and measures Haversine distance against registered policy farm plot coordinates, ensuring photos were taken directly at the claimed location.
          </p>
        </div>

        <div className="card-agri p-6 space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-[#2e7d32] rounded-xl w-fit">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#1a382b]">100-Point Evidence Engine</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Synthesizes disease consensus, location proximity, photo sample size (3–5 images per modality), and metadata integrity into a transparent 100-point confidence audit score.
          </p>
        </div>

        <div className="card-agri p-6 space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-[#2e7d32] rounded-xl w-fit">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#1a382b]">Human-in-the-Loop Governance</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Strict safety compliance ensures AI outputs are categorized as &quot;AI-Assisted Assessment / Requires Human Review&quot;. Claims adjusters retain ultimate authority to approve, reject, or request additional field evidence.
          </p>
        </div>
      </div>

      <div className="card-agri p-8 text-center space-y-4 bg-[#f8faf7]">
        <h3 className="text-lg font-bold text-[#1a382b]">Ready to Explore Agri-Vision?</h3>
        <p className="text-xs text-gray-600 max-w-xl mx-auto">
          Process insurance claims with confidence through our guided workflow or inspect model benchmark evaluations.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Link
            href="/claims/new"
            className="btn-agri-gold flex items-center gap-2"
          >
            Submit New Claim <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/model-performance"
            className="btn-agri-secondary flex items-center gap-2"
          >
            View Model Metrics <Cpu className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
