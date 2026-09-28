import {
  Zap,
  ShieldCheck,
  Layers,
  MousePointerClick,
  type LucideIcon,
} from "lucide-react";
import type { HomeStats } from "@/lib/queries";

function formatNumber(n: number) {
  return n.toLocaleString("es-ES");
}

/**
 * Banda de transición entre el hero y el catálogo: confianza + métricas reales,
 * en una fila fina y editorial. Mezcla mensajes fijos con números de la base.
 */
export function StatsRow({ stats }: { stats: HomeStats }) {
  const items: { icon: LucideIcon; value: string; label: string }[] = [
    { icon: Zap, value: "< 1 min", label: "Publicar un referido" },
    { icon: ShieldCheck, value: "100%", label: "Gratis y verificado" },
    { icon: Layers, value: formatNumber(stats.activos), label: "Referidos activos" },
    {
      icon: MousePointerClick,
      value: formatNumber(stats.usosTotales),
      label: "Usos de la comunidad",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl border border-line bg-paper/60 px-5 py-5 sm:px-7 lg:grid-cols-4 lg:divide-x lg:divide-line">
      {items.map(({ icon: Icon, value, label }) => (
        <div key={label} className="flex items-center gap-3 lg:justify-center">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-olive-200 bg-olive-50 text-olive-700">
            <Icon className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-medium leading-tight text-ink tabular-nums">
              {value}
            </p>
            <p className="text-xs leading-tight text-slate-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
