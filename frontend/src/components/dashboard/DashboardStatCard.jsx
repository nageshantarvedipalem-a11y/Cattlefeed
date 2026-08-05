const DashboardStatCard = ({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'emerald',
  alert = false,
  skeleton = false,
}) => {
  const accents = {
    emerald: {
      card: 'border-emerald-100/80 bg-gradient-to-br from-white to-emerald-50/40',
      icon: 'bg-emerald-100 text-emerald-700 ring-emerald-200/60',
      value: 'text-emerald-950',
    },
    amber: {
      card: 'border-amber-100/80 bg-gradient-to-br from-white to-amber-50/50',
      icon: 'bg-amber-100 text-amber-700 ring-amber-200/60',
      value: 'text-amber-950',
    },
    green: {
      card: 'border-primary-100/80 bg-gradient-to-br from-white to-primary-50/50',
      icon: 'bg-primary-100 text-primary-700 ring-primary-200/60',
      value: 'text-primary-950',
    },
    teal: {
      card: 'border-teal-100/80 bg-gradient-to-br from-white to-teal-50/40',
      icon: 'bg-teal-100 text-teal-700 ring-teal-200/60',
      value: 'text-teal-950',
    },
    orange: {
      card: 'border-orange-100/80 bg-gradient-to-br from-white to-orange-50/40',
      icon: 'bg-orange-100 text-orange-700 ring-orange-200/60',
      value: 'text-orange-950',
    },
    slate: {
      card: 'border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60',
      icon: 'bg-slate-100 text-slate-600 ring-slate-200/60',
      value: 'text-slate-900',
    },
  };

  const style = alert ? accents.orange : accents[accent] || accents.emerald;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 shadow-sm shadow-emerald-950/5 transition hover:shadow-md hover:shadow-emerald-950/10 ${style.card} ${alert ? 'ring-1 ring-amber-200/80' : ''}`}
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-primary-500/5 to-amber-500/10 blur-2xl transition group-hover:scale-110" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`mt-2 truncate text-xl font-bold tracking-tight ${alert ? 'text-amber-800' : style.value}`}>
            {skeleton ? '—' : value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${style.icon}`}>
            <Icon className="h-[1.125rem] w-[1.125rem]" />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardStatCard;
