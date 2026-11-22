"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerFarmer } from "@/lib/api";
import { setStoredFarmer } from "@/lib/auth";
import { UserPlus, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

export default function FarmerRegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    full_name: "",
    mobile_number: "",
    email: "",
    address: "",
    district: "Ludhiana",
    state: "Punjab",
    password: "",
    confirm_password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.full_name.trim() || !formData.mobile_number.trim() || !formData.address.trim()) {
      setError("Please fill in all mandatory fields (Name, Mobile, Address, District, State).");
      return;
    }

    if (formData.mobile_number.trim().length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (formData.password.length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        full_name: formData.full_name,
        mobile_number: formData.mobile_number,
        email: formData.email ? formData.email : null,
        address: formData.address,
        district: formData.district,
        state: formData.state,
        password: formData.password,
      };

      const res = await registerFarmer(payload);
      setStoredFarmer(res.farmer);
      router.push("/farmer/dashboard");
    } catch (err: any) {
      setError(err.message || "Farmer registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1a382b] text-[#d4af37] shadow-lg border border-[#2d5241] mb-2">
            <UserPlus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a382b] font-mono tracking-tight">
            Register New Farmer Profile
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto">
            Create your official Agri-Vision account to register farm parcels and link AI crop insurance claims.
          </p>
        </div>

        {/* Form Card */}
        <div className="card-agri p-6 sm:p-8 space-y-6 shadow-xl border border-emerald-900/10">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-800 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="e.g. Gurpreet Singh"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf7] border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="mobile_number"
                  required
                  placeholder="e.g. 9876543210"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf7] border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                name="email"
                placeholder="e.g. farmer@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-[#f8faf7] border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Address / Village <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                required
                rows={2}
                placeholder="e.g. Village Khanna, Tehsil Samrala"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-[#f8faf7] border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#2e7d32] focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  District <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="district"
                  required
                  placeholder="e.g. Ludhiana"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf7] border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="state"
                  required
                  placeholder="e.g. Punjab"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf7] border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf7] border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  required
                  placeholder="••••••••"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf7] border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#2e7d32] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-agri-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-110 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Farmer Registration</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-gray-100 text-center space-y-2">
            <p className="text-xs text-gray-600">
              Already registered with Agri-Vision?
            </p>
            <Link
              href="/farmer/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2e7d32] hover:text-[#1a382b] transition-colors"
            >
              <span>Log in to your account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
