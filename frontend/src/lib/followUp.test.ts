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
});
