import { describe, expect, it } from "vitest";

import { classifyFollowUp } from "@/lib/followUp";

const IST = "Asia/Kolkata";
const NOW = new Date("2026-01-15T04:30:00.000Z"); // 10:00 IST

function ist(iso: string): string {
  return iso;
}

describe("classifyFollowUp", () => {
  it("returns unscheduled for null", () => {
    expect(classifyFollowUp(null, NOW, IST)).toBe("unscheduled");
  });

  it("returns unscheduled for an invalid timestamp", () => {
    expect(classifyFollowUp("not-a-date", NOW, IST)).toBe("unscheduled");
  });

  it("flags a previous day as overdue", () => {
    expect(classifyFollowUp(ist("2026-01-14T04:30:00.000Z"), NOW, IST)).toBe("overdue");
  });

  it("flags an earlier-today instant as overdue", () => {
    expect(classifyFollowUp(ist("2026-01-14T20:00:00.000Z"), NOW, IST)).toBe("overdue");
  });

  it("marks a later-today instant as due_today", () => {
    expect(classifyFollowUp(ist("2026-01-15T09:30:00.000Z"), NOW, IST)).toBe("due_today");
  });

  it("marks far-future instants as upcoming", () => {
    expect(classifyFollowUp(ist("2026-01-20T04:30:00.000Z"), NOW, IST)).toBe("upcoming");
  });

  it("never marks a future appointment as overdue", () => {
    expect(classifyFollowUp(ist("2026-01-15T05:00:00.000Z"), NOW, IST)).toBe("due_today");
  });

  it("uses local calendar boundaries across midnight", () => {
    // 20:00Z on the 15th is 01:30 IST on the 16th; 21:00Z is the same local day.
    const now = new Date("2026-01-15T20:00:00.000Z");
    expect(classifyFollowUp("2026-01-15T21:00:00.000Z", now, IST)).toBe("due_today");
    // 19:00Z is 00:30 IST on the 16th: same local day but already past.
    expect(classifyFollowUp("2026-01-15T19:00:00.000Z", now, IST)).toBe("overdue");
  });

  it("keeps tomorrow as upcoming even when now is late in the local day", () => {
    // 23:00 IST on the 15th (17:30Z). Adding a fixed 24h+ would reach the 17th,
    // so a naive implementation would wrongly bucket tomorrow as due_today.
    const now = new Date("2026-01-15T17:30:00.000Z");
    expect(classifyFollowUp("2026-01-16T02:30:00.000Z", now, IST)).toBe("upcoming");
    // 18:00Z is 23:30 IST, still later today -> due_today.
    expect(classifyFollowUp("2026-01-15T18:00:00.000Z", now, IST)).toBe("due_today");
    // 18:30Z is exactly midnight IST on the 16th -> upcoming, not due today.
    expect(classifyFollowUp("2026-01-15T18:30:00.000Z", now, IST)).toBe("upcoming");
  });

  it("rolls the next-day boundary across month and year ends", () => {
    const monthEnd = new Date("2026-01-31T17:30:00.000Z"); // 23:00 IST, 31 Jan
    expect(classifyFollowUp("2026-02-01T02:30:00.000Z", monthEnd, IST)).toBe("upcoming");
    const yearEnd = new Date("2026-12-31T17:30:00.000Z"); // 23:00 IST, 31 Dec
    expect(classifyFollowUp("2027-01-01T02:30:00.000Z", yearEnd, IST)).toBe("upcoming");
  });
});
