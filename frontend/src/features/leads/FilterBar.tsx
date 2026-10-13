"use client";

import { LEAD_STATUSES } from "@/types";
import type { LeadStatus } from "@/types";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: LeadStatus | "All";
  onStatusChange: (value: LeadStatus | "All") => void;
  onAddLead: () => void;
}

export function FilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  onAddLead,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.08 3.08a1 1 0 01-1.42 1.42l-3.08-3.08A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search leads by name"
          aria-label="Search leads by name"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:text-brand-600"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      <label className="flex w-full items-center gap-2 text-sm text-slate-600 sm:w-auto">
        <span className="sr-only sm:not-sr-only">Status</span>
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as LeadStatus | "All")}
          aria-label="Filter by status"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:w-auto"
        >
          <option value="All">All statuses</option>
          {LEAD_STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onAddLead}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:w-auto"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M10 4v12M4 10h12" strokeLinecap="round" />
        </svg>
        Add Lead
      </button>
    </div>
  );
}
