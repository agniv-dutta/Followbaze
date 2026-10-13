export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7l8-4 8 4-8 4-8-4z" strokeLinejoin="round" />
              <path d="M4 12l8 4 8-4M4 17l8 4 8-4" strokeLinejoin="round" opacity="0.6" />
            </svg>
          </span>
          <div>
            <h1 className="text-base font-semibold leading-tight text-slate-900">Followbaze</h1>
            <p className="text-xs text-slate-500">Sales pipeline &amp; follow-ups</p>
          </div>
        </div>
        <p className="hidden text-xs font-medium text-slate-400 sm:block">Single-screen CRM</p>
      </div>
    </header>
  );
}
