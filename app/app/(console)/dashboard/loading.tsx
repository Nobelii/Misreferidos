// Skeleton en tonos dark: mantiene la silueta del dashboard (hero + KPIs +
// protagonista + paneles) para que el streaming de Suspense no parpadee
// claro→oscuro. No usa el <Skeleton> claro de shadcn a propósito.
function Bar({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-slate-800/60 ${className}`} />
  );
}

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Hero */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <Bar className="h-8 w-56" />
        <Bar className="mt-3 h-4 w-80" />
        <div className="mt-5 flex gap-3">
          <Bar className="h-9 w-40" />
          <Bar className="h-9 w-28" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <Bar className="h-9 w-9 rounded-lg" />
            <Bar className="mt-3 h-7 w-20" />
            <Bar className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Protagonista + lateral */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
          <Bar className="h-4 w-40" />
          <div className="mt-5 flex items-center gap-5">
            <Bar className="h-16 w-16 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Bar className="h-3 w-20" />
              <Bar className="h-8 w-40" />
              <Bar className="h-3 w-56" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <Bar className="h-4 w-36" />
          <Bar className="mt-4 h-10 w-full" />
          <Bar className="mt-3 h-3 w-32" />
        </div>
      </div>

      {/* Lista + paneles */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
          <Bar className="h-4 w-32" />
          <div className="mt-4 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <Bar className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Bar className="h-5 w-32" />
                  <Bar className="h-3 w-3/4" />
                  <Bar className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <Bar className="h-4 w-44" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Bar key={i} className="h-6 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
