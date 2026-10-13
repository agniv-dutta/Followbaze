/**
 * Follow-up classification — the frontend mirror of the backend logic.
 *
 * States are mutually exclusive so every lead lands in exactly one bucket:
 *   unscheduled -> no timestamp (or an unparseable one; never shown as overdue)
 *   overdue     -> timestamp is before "now" (real instant comparison)
 *   due_today   -> timestamp is in the future and within today's local day
 *   upcoming    -> timestamp is after today's local day
 *
 * Calendar boundaries are computed in the configured app timezone so midnight
 * transitions are handled correctly.
 */

import { APP_TIMEZONE } from "@/lib/config";
import type { FollowUpState } from "@/types";

function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Offset (ms) between the given instant's wall clock in `timeZone` and UTC. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

function localMidnight(year: number, month: number, day: number, timeZone: string): number {
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = timeZoneOffsetMs(new Date(guess), timeZone);
  return guess - offset;
}

export function classifyFollowUp(
  iso: string | null | undefined,
  now: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): FollowUpState {
  if (!iso) return "unscheduled";
  const scheduled = new Date(iso);
  if (Number.isNaN(scheduled.getTime())) return "unscheduled";

  const scheduledMs = scheduled.getTime();
  const nowMs = now.getTime();
  if (scheduledMs < nowMs) return "overdue";

  // Derive both boundaries from today's local calendar date instead of adding a
  // fixed number of hours to "now": a late-evening "now" plus 24+ hours jumps
  // two midnights, which would misclassify tomorrow as today. `localMidnight`
  // normalises out-of-range days (e.g. day 32) into the following month/year.
  const { year, month, day } = zonedParts(now, timeZone);
  const startToday = localMidnight(year, month, day, timeZone);
  const startTomorrow = localMidnight(year, month, day + 1, timeZone);

  if (scheduledMs >= startToday && scheduledMs < startTomorrow) return "due_today";
  return "upcoming";
}

export const FOLLOW_UP_LABELS: Record<FollowUpState, string> = {
  overdue: "Overdue",
  due_today: "Due today",
  upcoming: "Upcoming",
  unscheduled: "Not scheduled",
};
