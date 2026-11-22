"use client";

import React from "react";

interface PageHeaderProps {
  category?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  category = "Agri-Vision Platform",
  title,
  description,
  action,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}>
      <div className="space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#2e7d32]">
          {category}
        </span>
        <h1 className="text-2xl font-extrabold text-[#1a382b] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
