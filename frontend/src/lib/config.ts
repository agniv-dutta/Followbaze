/** Runtime configuration sourced from environment variables at build time. */

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

/** Timezone used for "due today" grouping and date display. */
export const APP_TIMEZONE =
  process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Asia/Kolkata";
