import Link from "next/link";
import { Wheat, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#12291f] text-emerald-100/70 border-t border-[#1d3b2e] pt-10 pb-6 print:hidden">
      <div className="max-w-[96%] xl:max-w-[95%] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <img
                src="/logo-circle.png"
                alt="Agri-Vision Logo"
                className="h-9 w-9 object-contain shrink-0 drop-shadow rounded-full"
              />
              <span className="text-base font-bold text-white tracking-tight font-mono">
                AGRI<span className="text-[#d4af37]">_VISION</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-emerald-200/60">
              Institutional crop analytics and crop insurance claim verification engine.
            </p>
          </div>

          {/* Quick Workflows */}
          <div>
            <h4 className="text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-3">
              Workflows
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/claims/new" className="hover:text-white transition">
                  Submit New Claim File
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition">
                  Claims Analytics Dashboard
                </Link>
              </li>
              <li>
                <Link href="/claims" className="hover:text-white transition">
                  Policyholder Records Directory
                </Link>
              </li>
              <li>
                <Link href="/field-intelligence" className="hover:text-white transition">
                  Field Maps Overview
                </Link>
              </li>
            </ul>
          </div>

          {/* Model Audits */}
          <div>
            <h4 className="text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-3">
              Model Diagnostics
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/disease-analysis" className="hover:text-white transition">
                  MobileNetV2 Disease Studio
                </Link>
              </li>
              <li>
                <Link href="/damage-analysis" className="hover:text-white transition">
                  Residual U-Net Damage Studio
                </Link>
              </li>
              <li>
                <Link href="/model-performance" className="hover:text-white transition">
                  Technical Validation Audit
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition">
                  Evidence Engine Methodology
                </Link>
              </li>
            </ul>
          </div>

          {/* Safeguard Banner */}
          <div>
            <h4 className="text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-3">
              Human-in-the-Loop Safeguard
            </h4>
            <div className="p-3 rounded-lg bg-[#183327] border border-[#26523e] text-xs text-emerald-100/80 space-y-1">
              <div className="flex items-center space-x-1.5 text-[#d4af37] font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Decision Support Evidence Only</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-200/70">
                All AI model predictions provide decision support. Final claim approval or rejection is executed by authorized insurance personnel.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="pt-6 border-t border-[#1d3b2e] flex flex-col sm:flex-row items-center justify-between text-[11px] text-emerald-300/60 font-mono">
          <p>© 2026 Agri-Vision Platform. Decision-support crop insurance technology.</p>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <span>Pixel Accuracy: <strong>92.11%</strong></span>
            <span>Damage IoU: <strong>66.18%</strong></span>
            <span>MAE: <strong>6.12 pp</strong></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
