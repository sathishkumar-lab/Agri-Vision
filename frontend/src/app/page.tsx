import Link from "next/link";
import {
  Wheat,
  ShieldCheck,
  Activity,
  Layers,
  MapPin,
  ArrowRight,
  Search,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <section className="bg-[#1a382b] text-white rounded-2xl p-8 sm:p-12 border border-[#2d5241] shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left Column: Headline & Action */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#254d3c] border border-[#d4af37]/40 text-[#d4af37] text-xs font-semibold tracking-wide uppercase font-mono">
              <Wheat className="w-3.5 h-3.5" />
              <span>Institutional Crop Insurance Analytics</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Evidence-Based <br />
              <span className="text-[#d4af37]">Crop Claim Verification</span>
            </h1>

            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-xl">
              Agri-Vision integrates dual computer vision models (MobileNetV2 &amp; Residual U-Net), satellite spatial verification, and 100-point transparent evidence scoring for crop insurance adjusters.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                href="/claims/new"
                className="btn-agri-gold w-full sm:w-auto text-sm px-6 py-3"
              >
                <span>Initiate New Claim Audit</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/dashboard"
                className="btn-agri-secondary w-full sm:w-auto text-sm px-6 py-3 bg-[#254d3c] text-white border-[#386b54] hover:bg-[#2d5c48]"
              >
                <Search className="w-4 h-4 text-[#d4af37]" />
                <span>Executive Dashboard</span>
              </Link>
            </div>

            {/* Metrics Bar */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-[#2a5241] max-w-md font-mono">
              <div>
                <div className="text-xl font-bold text-[#d4af37]">92.11%</div>
                <div className="text-[11px] text-emerald-200/70">Pixel Accuracy</div>
              </div>
              <div>
                <div className="text-xl font-bold text-[#d4af37]">66.18%</div>
                <div className="text-[11px] text-emerald-200/70">Damage IoU</div>
              </div>
              <div>
                <div className="text-xl font-bold text-[#d4af37]">6.12 pp</div>
                <div className="text-[11px] text-emerald-200/70">Damage MAE</div>
              </div>
            </div>
          </div>

          {/* Right Column: Key Summary Card */}
          <div className="lg:col-span-5">
            <div className="card-agri-dark space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#2d5241]">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded bg-[#2e7d32] border border-[#d4af37]/40 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase font-mono">Sample Audit File</h3>
                    <p className="text-[11px] text-emerald-200/70 font-mono">CLM-2026-8841</p>
                  </div>
                </div>
                <span className="badge-agri badge-approved">
                  AI Decision Support
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg bg-[#12291f] border border-[#254d3c] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Disease Classification</span>
                  </div>
                  <span className="font-mono font-bold text-[#d4af37]">Stripe Rust (98.4%)</span>
                </div>

                <div className="p-3 rounded-lg bg-[#12291f] border border-[#254d3c] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-red-400" />
                    <span>Damage Segmentation</span>
                  </div>
                  <span className="font-mono font-bold text-red-400">19.54% Crop Loss</span>
                </div>

                <div className="p-3 rounded-lg bg-[#12291f] border border-[#254d3c] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>Geofence Verification</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">0.6 km (Pass)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#2d5241]">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-emerald-200/80">Agri-Vision Evidence Score</span>
                  <span className="font-bold text-[#d4af37]">88 / 100</span>
                </div>
                <div className="w-full bg-[#12291f] h-2 rounded-full overflow-hidden border border-[#254d3c]">
                  <div className="bg-[#d4af37] h-full rounded-full" style={{ width: "88%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Specific Portal Selection Section */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#2e7d32]">Role-Based Access</span>
          <h2 className="text-2xl font-extrabold text-[#1a382b]">Dedicated Portals for Farmers &amp; Officers</h2>
          <p className="text-xs text-gray-500">
            Select your specialized workspace to manage crop damage claims or perform official evidence audits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Farmer Portal Card */}
          <div className="card-agri p-6 space-y-5 border-2 border-emerald-900/10 hover:border-[#2e7d32] transition-all group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#2e7d32] flex items-center justify-center font-bold">
                  <Wheat className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#2e7d32] text-[10px] font-bold uppercase tracking-wider font-mono border border-emerald-200">
                  Producers &amp; Claimants
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1a382b]">Farmer Portal</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Log in with your mobile number to view registered wheat fields, submit multi-zone leaf and canopy photos, and track insurance adjusters' determination decisions.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/farmer/login"
                className="btn-agri-primary text-xs py-2.5 px-4 font-bold flex items-center gap-1.5 flex-1 justify-center"
              >
                <span>Farmer Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/farmer/register"
                className="py-2.5 px-4 text-xs font-bold text-[#2e7d32] hover:bg-emerald-50 rounded-lg border border-emerald-200 text-center"
              >
                Register
              </Link>
            </div>
          </div>

          {/* Field Officer Portal Card */}
          <div className="card-agri p-6 space-y-5 border-2 border-amber-900/10 hover:border-[#d4af37] transition-all group flex flex-col justify-between bg-gradient-to-br from-white to-amber-50/30">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6 text-amber-800" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 text-[10px] font-bold uppercase tracking-wider font-mono border border-amber-200">
                  Insurance Adjusters
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1a382b]">Field Officer Portal</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Authorized insurance adjusters and field agronomists authenticate with Badge ID to review MobileNetV2 consensus, Residual U-Net damage segmentation, and sign off.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/officer/login"
                className="btn-agri-gold text-xs py-2.5 px-4 font-bold flex items-center gap-1.5 flex-1 justify-center"
              >
                <span>Field Officer Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/claims"
                className="py-2.5 px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 text-center"
              >
                Claims Queue
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* 4-Pillar Workflow Section */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#2e7d32]">System Workflow</span>
          <h2 className="text-2xl font-extrabold text-[#1a382b]">End-to-End Claim Verification</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-agri space-y-3">
            <div className="w-8 h-8 rounded bg-[#1a382b] text-[#d4af37] flex items-center justify-center font-bold font-mono text-sm">
              01
            </div>
            <h3 className="text-sm font-bold text-[#1a382b]">Claim Setup</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Record policyholder registration, crop variety, and registered farm coordinates.
            </p>
          </div>

          <div className="card-agri space-y-3">
            <div className="w-8 h-8 rounded bg-[#1a382b] text-[#d4af37] flex items-center justify-center font-bold font-mono text-sm">
              02
            </div>
            <h3 className="text-sm font-bold text-[#1a382b]">3–5 Close-up Leaf AI</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              MobileNetV2 neural network performs 3-class disease diagnosis with voting agreement.
            </p>
          </div>

          <div className="card-agri space-y-3">
            <div className="w-8 h-8 rounded bg-[#1a382b] text-[#d4af37] flex items-center justify-center font-bold font-mono text-sm">
              03
            </div>
            <h3 className="text-sm font-bold text-[#1a382b]">3–5 Field Canopy AI</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Residual U-Net model segments background, healthy, and damaged crop pixels.
            </p>
          </div>

          <div className="card-agri space-y-3">
            <div className="w-8 h-8 rounded bg-[#1a382b] text-[#d4af37] flex items-center justify-center font-bold font-mono text-sm">
              04
            </div>
            <h3 className="text-sm font-bold text-[#1a382b]">100-Point Audit</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Engine aggregates evidence metrics into a transparent score for officer sign-off.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
