"use client";

import { useEffect, useState } from "react";

import { ErrorState, Spinner } from "@/components/ui/Feedback";
import { FollowUpIndicator } from "@/components/ui/FollowUpIndicator";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DiscussionComposer } from "@/features/discussions/DiscussionComposer";
import { DiscussionTimeline } from "@/features/discussions/DiscussionTimeline";
import { api, errorMessage } from "@/lib/api";
import { classifyFollowUp } from "@/lib/followUp";
import { useNow } from "@/lib/useNow";
import { LEAD_STATUSES } from "@/types";
import type { DiscussionCreateResponse, Lead, LeadDetail, LeadStatus } from "@/types";

interface LeadTimelineDialogProps {
  open: boolean;
  leadId: number | null;
  onClose: () => void;
  onLeadUpdated: (lead: Lead) => void;
}

export function LeadTimelineDialog({
  open,
  leadId,
  onClose,
  onLeadUpdated,
}: LeadTimelineDialogProps) {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const now = useNow(30_000);

  // Always fetch the latest persisted data when the dialog opens.
  useEffect(() => {
    if (!open || leadId == null) return;
    let active = true;
    setLoading(true);
    setError(null);
    setStatusError(null);
    setDetail(null);
    api
      .getLead(leadId)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, leadId]);

  async function handleStatusChange(status: LeadStatus) {
    if (!detail || savingStatus) return;
    setSavingStatus(true);
    setStatusError(null);
    try {
      const updated = await api.updateLead(detail.id, { status });
      setDetail((previous) =>
        previous
          ? { ...previous, status: updated.status, updated_at: updated.updated_at }
          : previous,
      );
      onLeadUpdated(updated);
    } catch (caught) {
      setStatusError(errorMessage(caught));
    } finally {
      setSavingStatus(false);
    }
  }

  function handleDiscussionCreated(response: DiscussionCreateResponse) {
    setDetail((previous) =>
      previous
        ? {
            ...previous,
            ...response.lead,
            discussions: [response.discussion, ...previous.discussions],
          }
        : previous,
    );
    onLeadUpdated(response.lead);
  }

  const followUpState = detail
    ? classifyFollowUp(detail.next_follow_up_at, now)
    : "unscheduled";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={detail ? detail.name : "Lead"}
      description={detail?.company ?? undefined}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Spinner className="h-5 w-5" />
          <span className="text-sm">Loading lead…</span>
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : detail ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Contact
                </dt>
                <dd className="mt-0.5 text-sm text-slate-800">
                  {detail.phone ?? "No phone on file"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Next follow-up
                </dt>
                <dd className="mt-0.5">
                  <FollowUpIndicator
                    iso={detail.next_follow_up_at}
                    state={followUpState}
                    now={now}
                  />
                </dd>
              </div>
            </div>

            <div>
              <label
                htmlFor="detail-status"
                className="text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Status
              </label>
              <div className="mt-1.5 flex items-center gap-3">
                <StatusBadge status={detail.status} />
                <select
                  id="detail-status"
                  value={detail.status}
                  disabled={savingStatus}
                  onChange={(event) => handleStatusChange(event.target.value as LeadStatus)}
                  aria-label="Update lead status"
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
                >
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                {savingStatus ? <Spinner className="h-4 w-4 text-slate-400" /> : null}
              </div>
              {statusError ? (
                <p role="alert" className="mt-1 text-sm text-rose-600">
                  {statusError}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Discussion history
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {detail.discussion_count}
              </span>
            </h3>
            <DiscussionTimeline discussions={detail.discussions} now={now} />
          </div>

          <DiscussionComposer leadId={detail.id} onCreated={handleDiscussionCreated} />
        </div>
      ) : null}
    </Modal>
  );
}
