"use client";

import { formatDateTime, formatRelativeTime } from "@/lib/dates";
import type { Discussion } from "@/types";

export function DiscussionTimeline({
  discussions,
  now,
}: {
  discussions: Discussion[];
  now: Date;
}) {
  if (discussions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        No discussions yet. Add the first note below.
      </p>
    );
  }

  return (
    <ol className="space-y-4" aria-label="Discussion history">
      {discussions.map((discussion) => (
        <li key={discussion.id} className="relative border-l border-slate-200 pl-4">
          <span
            className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white"
            aria-hidden="true"
          />
          <p className="whitespace-pre-wrap text-sm text-slate-800">{discussion.note}</p>
          <p className="mt-1 text-xs text-slate-400">
            {formatDateTime(discussion.created_at)}
            <span aria-hidden="true"> · </span>
            {formatRelativeTime(discussion.created_at, now)}
          </p>
        </li>
      ))}
    </ol>
  );
}
