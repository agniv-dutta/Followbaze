"use client";

import { LeadRow } from "@/features/leads/LeadRow";
import type { Lead, LeadWithFollowUpState } from "@/types";

interface FollowUpSectionProps {
  title: string;
  description?: string;
  tone: "overdue" | "today";
  items: LeadWithFollowUpState[];
  now: Date;
  onSelect: (lead: Lead) => void;
  countLabel?: string;
}

const SHELL: Record<FollowUpSectionProps["tone"], string> = {
  overdue: "border-rose-200 bg-rose-50/60",
  today: "border-amber-200 bg-amber-50/50",
};

const TITLE: Record<FollowUpSectionProps["tone"], string> = {
  overdue: "text-rose-800",
  today: "text-amber-800",
};

const ICON: Record<FollowUpSectionProps["tone"], string> = {
  overdue: "bg-rose-100 text-rose-600",
  today: "bg-amber-100 text-amber-600",
};

export function FollowUpSection({
  title,
  description,
  tone,
  items,
  now,
  onSelect,
}: FollowUpSectionProps) {
  if (items.length === 0) return null;

  return (
    <section
      aria-label={title}
      data-testid={tone === "overdue" ? "overdue-section" : "today-section"}
      className={`rounded-2xl border ${SHELL[tone]} p-4`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full ${ICON[tone]}`}
          aria-hidden="true"
        >
          {tone === "overdue" ? (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.5a.75.75 0 00-1.5 0v3.5c0 .2.08.39.22.53l2.5 2.5a.75.75 0 101.06-1.06L10.75 9.69V6.5z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M6 2a.75.75 0 01.75.75V4h6.5V2.75a.75.75 0 011.5 0V4h.25A2.25 2.25 0 0117 6.25v9A2.25 2.25 0 0114.75 17.5H5.25A2.25 2.25 0 013 15.25v-9A2.25 2.25 0 015.25 4H5.5V2.75A.75.75 0 016 2zM4.5 7.5v7.75c0 .41.34.75.75.75h9.5c.41 0 .75-.34.75-.75V7.5h-11z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
        <h2 className={`text-sm font-semibold uppercase tracking-wide ${TITLE[tone]}`}>
          {title}
        </h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {items.length}
        </span>
      </div>
      {description ? <p className="mb-3 text-sm text-slate-600">{description}</p> : null}
      <ul className="space-y-3">
        {items.map(({ lead, followUpState }) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            followUpState={followUpState}
            now={now}
            onSelect={onSelect}
            tone={tone === "overdue" ? "overdue" : "today"}
          />
        ))}
      </ul>
    </section>
  );
}
