"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({
  title = "Error Encountered",
  message = "An unexpected error occurred while processing your request.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`p-6 bg-red-50/80 border border-red-200 rounded-xl text-red-900 space-y-3 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold">{title}</h4>
          <p className="text-xs text-red-700 leading-relaxed">{message}</p>
        </div>
      </div>
      {onRetry && (
        <div className="pt-2 border-t border-red-200/60">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}
    </div>
  );
}
