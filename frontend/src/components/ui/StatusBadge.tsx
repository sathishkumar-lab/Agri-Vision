"use client";

import React from "react";
import { CheckCircle2, XCircle, Clock, Info } from "lucide-react";

interface StatusBadgeProps {
  status: "approved" | "rejected" | "pending_review" | "needs_more_evidence" | string;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  switch (status) {
    case "approved":
      return (
        <span className={`badge-agri badge-approved ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
        </span>
      );
    case "rejected":
      return (
        <span className={`badge-agri badge-rejected ${className}`}>
          <XCircle className="w-3.5 h-3.5" /> Rejected
        </span>
      );
    case "needs_more_evidence":
      return (
        <span className={`badge-agri badge-needs-info ${className}`}>
          <Info className="w-3.5 h-3.5" /> Needs Info
        </span>
      );
    default:
      return (
        <span className={`badge-agri badge-pending ${className}`}>
          <Clock className="w-3.5 h-3.5" /> Pending Review
        </span>
      );
  }
}
