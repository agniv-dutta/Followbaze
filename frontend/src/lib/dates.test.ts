import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "@/lib/dates";

const NOW = new Date("2026-01-15T12:00:00.000Z");

function ago(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

describe("formatRelativeTime", () => {
  it("reports very recent times as just now", () => {
    expect(formatRelativeTime(ago(5_000), NOW)).toBe("just now");
  });

  it("reports minutes", () => {
    expect(formatRelativeTime(ago(2 * 60_000), NOW)).toBe("2 mins ago");
  });

  it("reports hours", () => {
    expect(formatRelativeTime(ago(2 * 60 * 60_000), NOW)).toBe("2 hours ago");
  });

  it("uses singular units", () => {
    expect(formatRelativeTime(ago(60 * 60_000), NOW)).toBe("1 hour ago");
  });

  it("reports days", () => {
    expect(formatRelativeTime(ago(3 * 24 * 60 * 60_000), NOW)).toBe("3 days ago");
  });

  it("handles missing values", () => {
    expect(formatRelativeTime(null, NOW)).toBe("—");
  });
});
