import { formatFollowUp } from "@/lib/dates";
import { FOLLOW_UP_LABELS } from "@/lib/followUp";
import type { FollowUpState } from "@/types";

const TONE: Record<FollowUpState, string> = {
  overdue: "text-rose-600",
  due_today: "text-amber-600",
  upcoming: "text-slate-500",
  unscheduled: "text-slate-400",
};

export function FollowUpIndicator({
  iso,
  state,
  now,
}: {
  iso: string | null;
  state: FollowUpState;
  now: Date;
}) {
  const label = formatFollowUp(iso, state, now);
  if (state === "unscheduled") {
    return <span className="text-sm text-slate-400">No follow-up</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${TONE[state]}`}>
      {state === "overdue" ? (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.5a.75.75 0 00-1.5 0v3.5c0 .2.08.39.22.53l2.5 2.5a.75.75 0 101.06-1.06L10.75 9.69V6.5z"
            clipRule="evenodd"
          />
        </svg>
      ) : null}
      <span>
        <span className="sr-only">{FOLLOW_UP_LABELS[state]}: </span>
        {label}
      </span>
    </span>
  );
}
