import type { LeadStatus } from "@/types";

/** Visual treatment for each pipeline status (badge colours). */
export const STATUS_STYLES: Record<LeadStatus, string> = {
  New: "bg-slate-100 text-slate-700 ring-slate-200",
  Contacted: "bg-blue-50 text-blue-700 ring-blue-200",
  Qualified: "bg-violet-50 text-violet-700 ring-violet-200",
  "Proposal Sent": "bg-amber-50 text-amber-700 ring-amber-200",
  Won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Lost: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const STATUS_DOT: Record<LeadStatus, string> = {
  New: "bg-slate-400",
  Contacted: "bg-blue-500",
  Qualified: "bg-violet-500",
  "Proposal Sent": "bg-amber-500",
  Won: "bg-emerald-500",
  Lost: "bg-rose-500",
};
