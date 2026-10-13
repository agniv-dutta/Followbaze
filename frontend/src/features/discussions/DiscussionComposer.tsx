"use client";

import { useState, type FormEvent } from "react";

import { Spinner } from "@/components/ui/Feedback";
import { api, errorMessage } from "@/lib/api";
import type { DiscussionCreateResponse } from "@/types";

interface DiscussionComposerProps {
  leadId: number;
  onCreated: (response: DiscussionCreateResponse) => void;
}

export function DiscussionComposer({ leadId, onCreated }: DiscussionComposerProps) {
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmed = note.trim();
    if (!trimmed) {
      setNoteError("Add a note before saving.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setNoteError(null);
    try {
      const response = await api.createDiscussion(leadId, {
        note: trimmed,
        // Sent as a local wall-clock string; the backend interprets it in the
        // configured app timezone (Asia/Kolkata by default).
        follow_up_at: followUp ? followUp : null,
      });
      onCreated(response);
      setNote("");
      setFollowUp("");
    } catch (caught) {
      // Keep the typed note so nothing is lost on failure.
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-slate-200 pt-4" noValidate>
      <div>
        <label htmlFor="discussion-note" className="mb-1 block text-sm font-medium text-slate-700">
          Add discussion note
        </label>
        <textarea
          id="discussion-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          aria-invalid={Boolean(noteError)}
          aria-describedby={noteError ? "discussion-note-error" : undefined}
          placeholder="What was discussed?"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {noteError ? (
          <p id="discussion-note-error" className="mt-1 text-sm text-rose-600">
            {noteError}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="discussion-follow-up" className="mb-1 block text-sm font-medium text-slate-700">
          Next follow-up <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="discussion-follow-up"
          type="datetime-local"
          value={followUp}
          onChange={(event) => setFollowUp(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:w-auto"
        />
        <p className="mt-1 text-xs text-slate-400">
          Leave empty to keep the existing reminder.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {submitting ? <Spinner /> : null}
          {submitting ? "Saving…" : "Save discussion"}
        </button>
      </div>
    </form>
  );
}
