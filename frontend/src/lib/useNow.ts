"use client";

import { useEffect, useState } from "react";

/**
 * Returns a `Date` that refreshes on an interval so relative times and
 * follow-up classifications stay current without a full page reload.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
