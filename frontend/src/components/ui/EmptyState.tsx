"use client";

import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
  className?: string;
}

export default function EmptyState({
  title = "No Records Available",
  message = "There are currently no items to display.",
  action,
  icon: Icon = FolderOpen,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`py-12 px-6 bg-white border border-slate-200 rounded-xl text-center space-y-4 ${className}`}>
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-500 border border-slate-200">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm mx-auto">
        <h3 className="text-base font-bold text-[#1a382b]">{title}</h3>
        <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
