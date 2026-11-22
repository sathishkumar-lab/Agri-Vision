"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface SuccessMessageProps {
  title?: string;
  message: string;
  className?: string;
}

export default function SuccessMessage({
  title = "Action Completed",
  message,
  className = "",
}: SuccessMessageProps) {
  return (
    <div className={`p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-3 ${className}`}>
      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">{title}</h4>
        <p className="text-xs text-emerald-900 font-medium">{message}</p>
      </div>
    </div>
  );
}
