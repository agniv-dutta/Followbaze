"use client";

import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState, ErrorState, LeadListSkeleton } from "@/components/ui/Feedback";
import { AddLeadDialog } from "@/features/leads/AddLeadDialog";
import { FilterBar } from "@/features/leads/FilterBar";
import { FollowUpSection } from "@/features/leads/FollowUpSection";
import { LeadRow } from "@/features/leads/LeadRow";
import { LeadTimelineDialog } from "@/features/leads/LeadTimelineDialog";
import { SummaryBar } from "@/features/leads/SummaryBar";
import { useLeads } from "@/features/leads/useLeads";
import { APP_TIMEZONE } from "@/lib/config";
import { classifyFollowUp } from "@/lib/followUp";
import { useNow } from "@/lib/useNow";
import type { Lead, LeadStatus, LeadWithFollowUpState } from "@/types";

function bySoonest(a: LeadWithFollowUpState, b: LeadWithFollowUpState): number {
  return (
    new Date(a.lead.next_follow_up_at ?? 0).getTime() -
    new Date(b.lead.next_follow_up_at ?? 0).getTime()
  );
}

export function LeadDashboard() {
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">("All");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isAddOpen, setAddOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const now = useNow(30_000);
  const { leads, loading, error, reload, applyLead } = useLeads({
    status: statusFilter,
    search,
  });

  // Debounce search so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const decorated = useMemo<LeadWithFollowUpState[]>(
    () =>
      leads.map((lead) => ({
        lead,
        followUpState: classifyFollowUp(lead.next_follow_up_at, now, APP_TIMEZONE),
      })),
    [leads, now],
  );

  const overdue = useMemo(
    () => decorated.filter((item) => item.followUpState === "overdue").sort(bySoonest),
    [decorated],
  );
  const dueToday = useMemo(
    () => decorated.filter((item) => item.followUpState === "due_today").sort(bySoonest),
    [decorated],
  );
  const upcomingCount = decorated.filter((item) => item.followUpState === "upcoming").length;
  // Leads already shown in a pinned section are excluded here to avoid duplication.
  const rest = decorated.filter(
    (item) => item.followUpState === "upcoming" || item.followUpState === "unscheduled",
  );

  const hasActiveFilters = statusFilter !== "All" || search.trim() !== "";
  const showInitialLoading = loading && leads.length === 0;
  // Leads already surfaced in a pinned section are not repeated in the main list.
  const pinnedCount = overdue.length + dueToday.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <SummaryBar
          total={leads.length}
          overdue={overdue.length}
          dueToday={dueToday.length}
          upcoming={upcomingCount}
        />

        <FilterBar
          search={searchInput}
          onSearchChange={setSearchInput}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          onAddLead={() => setAddOpen(true)}
        />

        <p role="status" aria-live="polite" className="sr-only">
          {loading
            ? "Loading leads…"
            : `${leads.length} lead${leads.length === 1 ? "" : "s"} shown`}
        </p>

        {error && leads.length > 0 ? (
          <p
            role="alert"
            className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200"
          >
            {error}
          </p>
        ) : null}

        {error && leads.length === 0 ? (
          <ErrorState message={error} onRetry={reload} />
        ) : showInitialLoading ? (
          <LeadListSkeleton />
        ) : (
          <div className="space-y-6" aria-busy={loading}>
            <FollowUpSection
              tone="overdue"
              title="Overdue follow-ups"
              description="These follow-ups are past their scheduled time."
              items={overdue}
              now={now}
              onSelect={(lead) => setSelectedLeadId(lead.id)}
            />
            <FollowUpSection
              tone="today"
              title="Today's follow-ups"
              items={dueToday}
              now={now}
              onSelect={(lead) => setSelectedLeadId(lead.id)}
            />

            <section aria-label="All leads">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  All leads
                </h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  {rest.length}
                </span>
                {loading ? (
                  <span className="ml-1 text-xs font-medium text-slate-400" aria-hidden="true">
                    Updating…
                  </span>
                ) : null}
              </div>

              {rest.length === 0 ? (
                pinnedCount > 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
                    No other leads match your filters.
                  </p>
                ) : hasActiveFilters ? (
                  <EmptyState
                    title="No leads match your filters"
                    description="Try a different name or clear the status filter to see more leads."
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput("");
                          setStatusFilter("All");
                        }}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        Clear filters
                      </button>
                    }
                  />
                ) : (
                  <EmptyState
                    title="No leads yet"
                    description="Add your first lead to start tracking discussions and follow-ups."
                    action={
                      <button
                        type="button"
                        onClick={() => setAddOpen(true)}
                        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        Add Lead
                      </button>
                    }
                  />
                )
              ) : (
                <ul className="space-y-3">
                  {rest.map(({ lead, followUpState }) => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      followUpState={followUpState}
                      now={now}
                      onSelect={(selected: Lead) => setSelectedLeadId(selected.id)}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>

      <AddLeadDialog
        open={isAddOpen}
        onClose={() => setAddOpen(false)}
        onCreated={applyLead}
      />

      <LeadTimelineDialog
        open={selectedLeadId !== null}
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onLeadUpdated={applyLead}
      />
    </div>
  );
}
