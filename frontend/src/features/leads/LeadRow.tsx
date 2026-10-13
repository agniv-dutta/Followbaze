"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { FollowUpIndicator } from "@/components/ui/FollowUpIndicator";
import { formatRelativeTime } from "@/lib/dates";
import type { FollowUpState, Lead } from "@/types";

interface LeadRowProps {
  lead: Lead;
  followUpState: FollowUpState;
  now: Date;
  onSelect: (lead: Lead) => void;
  tone?: "overdue" | "today" | "default";
}

const TONE_BORDER: Record<NonNullable<LeadRowProps["tone"]>, string> = {
  overdue: "border-l-4 border-l-rose-500",
  today: "border-l-4 border-l-amber-500",
  default: "",
};

export function LeadRow({ lead, followUpState, now, onSelect, tone = "default" }: LeadRowProps) {
  const latest = lead.latest_discussion;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(lead)}
        aria-label={`Open ${lead.name}`}
        aria-haspopup="dialog"
        title={lead.name}
        className={`group grid w-full grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_auto_auto] md:items-center md:gap-4 ${TONE_BORDER[tone]}`}
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{lead.name}</p>
          {lead.company ? (
            <p className="truncate text-sm text-slate-500">{lead.company}</p>
          ) : (
            <p className="text-sm text-slate-400">No company</p>
          )}
        </div>

        <div className="min-w-0">
          {latest ? (
            <>
              <p className="truncate text-sm text-slate-700">{latest.note}</p>
              <p className="text-xs text-slate-400">
                {formatRelativeTime(latest.created_at, now)}
                {lead.discussion_count > 1 ? ` · ${lead.discussion_count} discussions` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">No discussions yet</p>
          )}
        </div>

        <div className="flex items-center gap-2 md:justify-end">
          <StatusBadge status={lead.status} />
        </div>

        <div className="flex items-center justify-between gap-3 md:min-w-[12rem] md:justify-end">
          <FollowUpIndicator iso={lead.next_follow_up_at} state={followUpState} now={now} />
          <svg
            viewBox="0 0 20 20"
            className="hidden h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-brand-500 md:block"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
    </li>
  );
}
