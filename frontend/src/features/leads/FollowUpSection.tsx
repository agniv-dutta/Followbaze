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
