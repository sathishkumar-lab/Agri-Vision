"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Wheat,
  LayoutDashboard,
  FileText,
  PlusCircle,
  Activity,
  Layers,
  MapPin,
  Award,
  Info,
  Menu,
  X,
  UserCheck,
  ShieldCheck,
  LogOut,
  ChevronDown,
  User,
  LogIn,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  getStoredFarmer,
  getStoredOfficer,
  clearStoredFarmer,
  clearStoredOfficer,
  getActiveSession,
} from "@/lib/auth";
import { Farmer, FieldOfficer } from "@/lib/api";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authDropdownOpen, setAuthDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [officer, setOfficer] = useState<FieldOfficer | null>(null);

  const updateSessions = () => {
    const session = getActiveSession();
    setFarmer(session.farmer);
    setOfficer(session.officer);
  };

  useEffect(() => {
    updateSessions();

    const handleAuthChange = () => {
      updateSessions();
    };

    window.addEventListener("agri_vision_auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("agri_vision_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAuthDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFarmerLogout = () => {
    clearStoredFarmer();
    setAuthDropdownOpen(false);
    router.push("/farmer/login");
  };

  const handleOfficerLogout = () => {
    clearStoredOfficer();
    setAuthDropdownOpen(false);
    router.push("/officer/login");
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(officer
      ? [{ href: "/officer/dashboard", label: "Officer Console", icon: ShieldCheck }]
      : [{ href: "/farmer/dashboard", label: "Farmer Portal", icon: UserCheck }]),
    { href: "/claims", label: "Claims", icon: FileText },
    { href: "/disease-analysis", label: "Disease Studio", icon: Activity },
    { href: "/damage-analysis", label: "Damage Studio", icon: Layers },
    { href: "/field-intelligence", label: "Field Maps", icon: MapPin },
    { href: "/model-performance", label: "Model Audit", icon: Award },
    { href: "/about", label: "About", icon: Info },
  ];

  return (
    <header className="sticky top-0 z-[9999] bg-[#1a382b] text-white border-b border-[#2d5241] shadow-sm print:hidden">
      <div className="max-w-[96%] xl:max-w-[95%] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <img
              src="/logo-circle.png"
              alt="Agri-Vision Logo"
              className="h-11 w-11 object-contain shrink-0 group-hover:scale-105 transition-transform duration-200 drop-shadow-md rounded-full"
            />
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1 font-mono">
                AGRI<span className="text-[#d4af37]">_VISION</span>
              </span>
              <span className="text-[10px] text-emerald-200/70 tracking-wider uppercase block font-medium -mt-1">
                Crop Claim Verification
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href ||
                (link.href !== "/dashboard" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#254d3c] text-[#d4af37] border border-[#d4af37]/30"
                      : "text-emerald-100/80 hover:text-white hover:bg-[#224738]"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? "text-[#d4af37]" : "text-emerald-300/70"
                    }`}
                  />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* CTA & User Session Controls */}
          <div className="flex items-center space-x-3">
            {/* New Claim CTA */}
            <Link
              href="/claims/new"
              className="btn-agri-gold text-xs shadow-sm hover:brightness-105 hidden sm:inline-flex"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Claim</span>
            </Link>

            {/* Separate Login / Active Session Dropdown */}
            <div className="relative" ref={dropdownRef}>
              {officer ? (
                /* Field Officer Active Pill */
                <button
                  type="button"
                  onClick={() => setAuthDropdownOpen(!authDropdownOpen)}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-[#254d3c] hover:bg-[#2e5c49] border border-[#d4af37]/40 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-[#d4af37] text-[#12291f] flex items-center justify-center font-mono text-[10px] font-extrabold">
                    🛡️
                  </div>
                  <div className="text-left hidden md:block">
                    <span className="block text-white text-[11px] font-bold leading-tight truncate max-w-[120px]">
                      {officer.full_name}
                    </span>
                    <span className="block text-[9px] text-[#d4af37] font-mono leading-none">
                      Badge {officer.badge_number}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-300" />
                </button>
              ) : farmer ? (
                /* Farmer Active Pill */
                <button
                  type="button"
                  onClick={() => setAuthDropdownOpen(!authDropdownOpen)}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-[#224b38] hover:bg-[#2c5f47] border border-emerald-400/40 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-[#2e7d32] text-white flex items-center justify-center text-[11px]">
                    🌾
                  </div>
                  <div className="text-left hidden md:block">
                    <span className="block text-white text-[11px] font-bold leading-tight truncate max-w-[120px]">
                      {farmer.full_name}
                    </span>
                    <span className="block text-[9px] text-emerald-300 font-mono leading-none">
                      Farmer Portal
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-300" />
                </button>
              ) : (
                /* Not Logged In: "Sign In" Dropdown Pill */
                <button
                  type="button"
                  onClick={() => setAuthDropdownOpen(!authDropdownOpen)}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#254d3c] hover:bg-[#2d5c48] border border-emerald-500/40 text-xs font-bold text-emerald-100 hover:text-white transition-all cursor-pointer shadow-xs"
                >
                  <User className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Sign In</span>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-300/80" />
                </button>
              )}

              {/* Dropdown Menu */}
              {authDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-100 py-2 z-[10000] animate-in fade-in zoom-in-95 duration-100">
                  {officer ? (
                    /* Field Officer Menu */
                    <>
                      <div className="px-4 py-2.5 border-b border-gray-100 bg-[#f8faf7]">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#d4af37] uppercase tracking-wider font-mono">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#2e7d32]" />
                          <span>Field Officer Session</span>
                        </div>
                        <div className="font-bold text-xs text-gray-900 mt-0.5">
                          {officer.full_name}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {officer.role} ({officer.badge_number})
                        </div>
                      </div>

                      <div className="py-1 text-xs">
                        <Link
                          href="/officer/dashboard"
                          onClick={() => setAuthDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 font-medium text-gray-700"
                        >
                          <Award className="w-4 h-4 text-[#d4af37]" />
                          <span>Officer Dashboard</span>
                        </Link>
                        <Link
                          href="/claims"
                          onClick={() => setAuthDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 font-medium text-gray-700"
                        >
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <span>Claims Audit Queue</span>
                        </Link>
                        <Link
                          href="/field-intelligence"
                          onClick={() => setAuthDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 font-medium text-gray-700"
                        >
                          <MapPin className="w-4 h-4 text-amber-600" />
                          <span>Field Geofence Maps</span>
                        </Link>
                      </div>

                      <div className="border-t border-gray-100 py-1 text-xs">
                        <Link
                          href="/farmer/login"
                          onClick={() => setAuthDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-gray-600"
                        >
                          <Wheat className="w-4 h-4 text-[#2e7d32]" />
                          <span>Switch to Farmer Login</span>
                        </Link>
                        <button
                          type="button"
                          onClick={handleOfficerLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 font-bold text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </>
                  ) : farmer ? (
                    /* Farmer Menu */
                    <>
                      <div className="px-4 py-2.5 border-b border-gray-100 bg-[#f8faf7]">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#2e7d32] uppercase tracking-wider font-mono">
                          <Wheat className="w-3.5 h-3.5" />
                          <span>Farmer Session</span>
                        </div>
                        <div className="font-bold text-xs text-gray-900 mt-0.5">
                          {farmer.full_name}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {farmer.farmer_code}
                        </div>
                      </div>

                      <div className="py-1 text-xs">
                        <Link
                          href="/farmer/dashboard"
                          onClick={() => setAuthDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 font-medium text-gray-700"
                        >
                          <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                          <span>Farmer Dashboard</span>
                        </Link>
                        <Link
                          href="/claims/new"
                          onClick={() => setAuthDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 font-medium text-gray-700"
                        >
                          <PlusCircle className="w-4 h-4 text-[#d4af37]" />
                          <span>Submit Crop Claim</span>
                        </Link>
                        <Link
                          href="/claims"
                          onClick={() => setAuthDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 font-medium text-gray-700"
                        >
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span>My Claim Statuses</span>
                        </Link>
                      </div>

                      <div className="border-t border-gray-100 py-1 text-xs">
                        <Link
                          href="/officer/login"
                          onClick={() => setAuthDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-gray-600"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
                          <span>Switch to Field Officer Login</span>
                        </Link>
                        <button
                          type="button"
                          onClick={handleFarmerLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 font-bold text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Guest: Separate Logins */
                    <>
                      <div className="px-4 py-2 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        Choose Login Portal
                      </div>

                      <div className="p-1 space-y-1">
                        <Link
                          href="/farmer/login"
                          onClick={() => setAuthDropdownOpen(false)}
                          className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-emerald-50 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#2e7d32] flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                            <Wheat className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900 group-hover:text-[#2e7d32]">
                              Farmer Login
                            </div>
                            <div className="text-[11px] text-gray-500 leading-tight">
                              Submit claims &amp; farm plot records
                            </div>
                          </div>
                        </Link>

                        <Link
                          href="/officer/login"
                          onClick={() => setAuthDropdownOpen(false)}
                          className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-amber-50 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900 group-hover:text-amber-800">
                              Field Officer Login
                            </div>
                            <div className="text-[11px] text-gray-500 leading-tight">
                              Insurance adjusters &amp; audit officers
                            </div>
                          </div>
                        </Link>
                      </div>

                      <div className="border-t border-gray-100 p-2 bg-gray-50/70 rounded-b-xl text-center">
                        <Link
                          href="/login"
                          onClick={() => setAuthDropdownOpen(false)}
                          className="text-[11px] font-bold text-[#2e7d32] hover:underline inline-flex items-center gap-1"
                        >
                          <span>Portal Selection Hub →</span>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-emerald-100 hover:text-white hover:bg-[#254d3c]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#12291f] border-b border-[#2a4d3d] px-4 pt-3 pb-6 space-y-3">
          {/* Mobile Role Buttons */}
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[#2a4d3d]">
            <Link
              href="/farmer/login"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg bg-[#1a382b] border border-[#2e7d32] text-xs font-bold text-emerald-200 text-center flex items-center justify-center gap-1.5"
            >
              <Wheat className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Farmer Login</span>
            </Link>
            <Link
              href="/officer/login"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg bg-[#254d3c] border border-[#d4af37]/40 text-xs font-bold text-amber-200 text-center flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Officer Login</span>
            </Link>
          </div>

          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-semibold ${
                    isActive
                      ? "bg-[#254d3c] text-[#d4af37]"
                      : "text-emerald-100 hover:bg-[#1a382b]"
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#d4af37]" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#2a4d3d]">
            <Link
              href="/claims/new"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-agri-gold w-full text-xs justify-center"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Initiate New Claim</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
