import { APP_TIMEZONE } from "@/lib/config";
import type { FollowUpState } from "@/types";

export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Human friendly "x ago" label used on dashboard rows. */
export function formatRelativeTime(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  const date = parseDate(iso);
  if (!date) return "—";

  const diffMs = now.getTime() - date.getTime();
  const future = diffMs < 0;
  const seconds = Math.abs(Math.floor(diffMs / 1000));

  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ${future ? "from now" : "ago"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ${future ? "from now" : "ago"}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ${future ? "from now" : "ago"}`;
  return formatDateTime(iso);
}

export function formatDateTime(
  iso: string | null | undefined,
  timeZone: string = APP_TIMEZONE,
): string {
  const date = parseDate(iso);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isSameLocalDay(a: Date, b: Date, timeZone: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(a) === fmt.format(b);
}

/** Context aware label for a follow-up, e.g. "Today, 17:00" or "Tomorrow, 09:30". */
export function formatFollowUp(
  iso: string | null | undefined,
  state: FollowUpState,
  now: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): string {
  const date = parseDate(iso);
  if (!date || state === "unscheduled") return "Not scheduled";

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  if (state === "due_today") return `Today, ${time}`;

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (isSameLocalDay(date, tomorrow, timeZone)) return `Tomorrow, ${time}`;

  return formatDateTime(iso, timeZone);
}
