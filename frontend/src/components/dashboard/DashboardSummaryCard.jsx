const DashboardSummaryCard = ({ label, value, sub, icon: Icon, alert = false, skeleton = false }) => (
  <div
    className={`flex items-center gap-3 rounded-xl border bg-white/90 p-3.5 shadow-sm shadow-emerald-950/5 transition hover:shadow-md ${
      alert ? 'border-amber-200/90 bg-amber-50/30' : 'border-emerald-100/70'
    }`}
  >
    {Icon && (
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          alert ? 'bg-amber-100 text-amber-700' : 'bg-primary-50 text-primary-700'
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
    )}
    <div className="min-w-0 flex-1">
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`truncate text-base font-bold ${alert ? 'text-amber-800' : 'text-slate-900'}`}>
        {skeleton ? '—' : value}
      </p>
      <p className="truncate text-[11px] text-slate-400">{sub}</p>
    </div>
  </div>
);

export default DashboardSummaryCard;
