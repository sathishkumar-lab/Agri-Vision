"use client";

import React from "react";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export default function LoadingState({
  message = "Loading data...",
  className = "",
}: LoadingStateProps) {
  return (
    <div className={`py-12 px-4 flex flex-col items-center justify-center text-center space-y-3 ${className}`}>
      <div className="w-8 h-8 border-3 border-[#2e7d32] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-medium text-slate-600 font-mono">{message}</p>
    </div>
  );
}
