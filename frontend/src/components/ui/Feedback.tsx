import type { ReactNode } from "react";

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />;
}

export function LeadListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-28" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 13h6m-6 4h6M8 3h8l4 4v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center"
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-11a1 1 0 011 1v3a1 1 0 11-2 0V8a1 1 0 011-1zm0 7a1 1 0 100 2 1 1 0 000-2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-rose-800">Could not load leads</h3>
      <p className="mt-1 max-w-sm text-sm text-rose-700">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
