interface SummaryBarProps {
  total: number;
  overdue: number;
  dueToday: number;
  upcoming: number;
}

function Stat({
  label,
  value,
  accent,
  emphasis,
}: {
  label: string;
  value: number;
  accent: string;
  emphasis?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 ${
        emphasis ?? "border-slate-200"
      }`}
    >
      <span className={`h-8 w-1 rounded-full ${accent}`} aria-hidden="true" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export function SummaryBar({ total, overdue, dueToday, upcoming }: SummaryBarProps) {
  return (
    <section aria-label="Pipeline summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Leads" value={total} accent="bg-slate-400" />
      <Stat
        label="Overdue"
        value={overdue}
        accent="bg-rose-500"
        emphasis={overdue > 0 ? "border-rose-200 ring-1 ring-rose-100" : undefined}
      />
      <Stat
        label="Due today"
        value={dueToday}
        accent="bg-amber-500"
        emphasis={dueToday > 0 ? "border-amber-200 ring-1 ring-amber-100" : undefined}
      />
      <Stat label="Upcoming" value={upcoming} accent="bg-emerald-500" />
    </section>
  );
}
