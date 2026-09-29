import Link from "next/link";
import {
  MousePointerClick,
  Eye,
  Layers,
  Bookmark,
  Trophy,
  ChevronRight,
  Copy,
  ArrowUpRight,
  Plus,
  Compass,
  ListChecks,
  Activity as ActivityIcon,
  BarChart3,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { CopyCodeButton } from "@/components/copy-code-button";
import { ReferralActions } from "@/components/referral-actions";
import {
  getDashboardKpis,
  getMyProfile,
  getMyReferrals,
  getMyUsesByCategory,
  getNeedsAttention,
  getRecentActivity,
  getSavedBenefits,
} from "@/lib/queries";
import {
  STATUS_LABEL,
  ATTENTION_REASON_LABEL,
  ATTENTION_REASON_ACTION,
  activityLabel,
} from "@/lib/labels";
import { formatBenefitValue, formatExpiry } from "@/lib/benefit-format";
import type { AttentionReason, BenefitStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatNumber(n: number) {
  return n.toLocaleString("es-ES");
}

// Colores de estado adaptados a fondo oscuro (los chips claros de StatusBadge no
// se reutilizan aquí para no arrastrar estilo claro al canvas oscuro).
const STATUS_DARK: Record<BenefitStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  draft: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  rejected: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  expired: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  archived: "bg-slate-700/40 text-slate-300 border-slate-600/40",
};

const REASON_DARK: Record<AttentionReason, string> = {
  expired: "text-rose-400",
  reported: "text-rose-400",
  rejected: "text-rose-400",
  expiring_soon: "text-amber-400",
  archived: "text-slate-300",
  pending_review: "text-sky-400",
  no_traction: "text-olive-400",
};

export default async function DashboardPage() {
  const [me, kpis, misReferidos, needsAttention, usesByCategory, activity, saved] =
    await Promise.all([
      getMyProfile(),
      getDashboardKpis(),
      getMyReferrals(),
      getNeedsAttention(),
      getMyUsesByCategory(),
      getRecentActivity(),
      getSavedBenefits(),
    ]);

  const firstName = me?.display_name.split(" ")[0] ?? "";
  const username = me?.username ?? "";
  const mejor = misReferidos.find((r) => r.id === kpis.topReferralId);
  const maxCatUses = Math.max(...usesByCategory.map((c) => c.uses), 1);
  const profileUrl = `misreferidos.app/u/${username}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 text-slate-200 sm:px-6 lg:px-8 lg:py-8">
      {/* ── Hero protagonista ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-linear-to-br from-slate-900 to-slate-950 p-6 sm:p-8">
        {/* glow índigo tenue + marca decorativa sobria (sin 3D) */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-olive-500/10 blur-3xl" />
        <Sparkles className="pointer-events-none absolute right-6 top-6 h-24 w-24 text-slate-800/60" />

        <div className="relative max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Hola, {firstName} 👋
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {needsAttention.length > 0
              ? `Tienes ${needsAttention.length} ${
                  needsAttention.length === 1
                    ? "beneficio que necesita"
                    : "beneficios que necesitan"
                } tu atención.`
              : "Tus beneficios están al día. Comparte más y llega a más personas."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/app/publicar"
              className="inline-flex items-center gap-2 rounded-lg bg-olive-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-brand hover:bg-olive-400"
            >
              <Plus className="h-4 w-4" />
              Publicar referido
            </Link>
            <Link
              href="/app/explorar"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors duration-150 ease-brand hover:border-slate-600 hover:bg-slate-800/50"
            >
              <Compass className="h-4 w-4" />
              Explorar
            </Link>
          </div>
        </div>
      </section>

      {/* ── Fila de KPIs ──────────────────────────────────────────────── */}
      <div className="animate-stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Usos totales"
          value={formatNumber(kpis.usosTotales)}
          icon={MousePointerClick}
          accent="text-olive-400 bg-olive-500/10"
          hint="Copias + clics"
        />
        <Kpi
          label="Vistas"
          value={formatNumber(kpis.vistas)}
          icon={Eye}
          accent="text-sky-400 bg-sky-500/10"
        />
        <Kpi
          label="Referidos activos"
          value={formatNumber(kpis.referidosActivos)}
          icon={Layers}
          accent="text-emerald-400 bg-emerald-500/10"
          hint={`de ${misReferidos.length} publicados`}
        />
        <Kpi
          label="Guardados"
          value={formatNumber(kpis.guardados)}
          icon={Bookmark}
          accent="text-amber-400 bg-amber-500/10"
        />
      </div>

      {/* ── Necesitan atención (prioridad accionable) ─────────────────── */}
      {needsAttention.length > 0 && (
        <Panel
          title="Necesitan atención"
          icon={ListChecks}
          badge={needsAttention.length}
        >
          <div className="animate-stagger divide-y divide-slate-800">
            {needsAttention.map((item) => (
              <Link
                key={item.benefit.id}
                href={`/app/referido/${item.benefit.id}`}
                className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-150 ease-brand first:pt-0 last:pb-0 hover:bg-slate-800/30"
              >
                <span
                  className={cn("text-xs font-medium", REASON_DARK[item.reason])}
                >
                  {ATTENTION_REASON_LABEL[item.reason]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                  {item.benefit.brand} · {item.message}
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-olive-400">
                  {ATTENTION_REASON_ACTION[item.reason]}
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      {/* ── Mejor referido + Perfil público ───────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bloque central protagonista */}
        <div className="lg:col-span-2">
          <Panel title="Tu mejor referido" icon={Trophy} accent="text-amber-400">
            {mejor ? (
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-2xl font-semibold text-slate-100">
                  {mejor.brand.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">{mejor.brand}</p>
                  <p className="text-3xl font-bold tracking-tight text-white">
                    {formatBenefitValue(mejor)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="rounded-md border border-slate-700 bg-slate-800/50 px-2 py-0.5">
                      {mejor.category}
                    </span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <MousePointerClick className="h-3.5 w-3.5" />
                      {formatNumber(mejor.uses)} usos
                    </span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <Eye className="h-3.5 w-3.5" />
                      {formatNumber(mejor.views)} vistas
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {mejor.code && (
                    <CopyCodeButton code={mejor.code} size="sm" label="Copiar" />
                  )}
                  <Link
                    href={`/app/referido/${mejor.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-olive-400 hover:text-olive-300"
                  >
                    Ver detalle
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Publica un beneficio y aquí verás tu referido con mejor alcance.
              </p>
            )}
          </Panel>
        </div>

        {/* Perfil público — adapta el "Your Referral Link" de la referencia */}
        <Panel title="Tu perfil público" icon={ArrowUpRight}>
          <p className="text-xs text-slate-500">
            Comparte todos tus beneficios con un solo enlace.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-300">
              {profileUrl}
            </span>
            {/* Reusa CopyCodeButton sin referralId: copia el enlace, no trackea. */}
            <CopyCodeButton
              code={`https://${profileUrl}`}
              size="sm"
              label="Copiar"
            />
          </div>
          <Link
            href={`/u/${username}`}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-olive-400 hover:text-olive-300"
          >
            Ver mi perfil público
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Panel>
      </div>

      {/* ── Mis referidos + panel lateral (categorías + actividad) ────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de referidos */}
        <div className="lg:col-span-2">
          <Panel title="Mis beneficios" icon={Layers}>
            {misReferidos.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm font-medium text-slate-200">
                  Aún no has compartido nada
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Publica tu primer código y empieza a ayudar a más personas.
                </p>
                <Link
                  href="/app/publicar"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-olive-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-brand hover:bg-olive-400"
                >
                  <Plus className="h-4 w-4" />
                  Publicar referido
                </Link>
              </div>
            ) : (
              <div className="animate-stagger divide-y divide-slate-800">
                {misReferidos.map((ref) => {
                  const expiry = formatExpiry(ref);
                  return (
                    <div
                      key={ref.id}
                      className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-slate-100">
                        {ref.brand.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-100">
                            {formatBenefitValue(ref)}
                          </h3>
                          {ref.status && (
                            <span
                              className={cn(
                                "rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                                STATUS_DARK[ref.status],
                              )}
                            >
                              {STATUS_LABEL[ref.status]}
                            </span>
                          )}
                        </div>
                        <p className="mb-2 line-clamp-1 text-sm text-slate-400">
                          {ref.brand} · {ref.headline}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {ref.code && (
                            <code className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                              {ref.code}
                            </code>
                          )}
                          <span className="flex items-center gap-1 tabular-nums">
                            <MousePointerClick className="h-3.5 w-3.5" />
                            {formatNumber(ref.uses)} usos
                          </span>
                          <span className="flex items-center gap-1 tabular-nums">
                            <Eye className="h-3.5 w-3.5" />
                            {formatNumber(ref.views)} vistas
                          </span>
                          {expiry && <span>{expiry}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {ref.code && (
                          <CopyCodeButton code={ref.code} size="sm" label="Copiar" />
                        )}
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/app/referido/${ref.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-olive-400 hover:text-olive-300"
                          >
                            Ver
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                          {ref.status && (
                            <ReferralActions
                              referralId={ref.id}
                              brand={ref.brand}
                              status={ref.status}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* Columna lateral: rendimiento por categoría + actividad */}
        <div className="space-y-6">
          <Panel title="Rendimiento por categoría" icon={BarChart3}>
            {/* Mini-stats copias/clics — adapta los sub-stats de la referencia */}
            <div className="mb-5 grid grid-cols-2 gap-3">
              <MiniStat label="Copias" value={formatNumber(kpis.copias)} icon={Copy} />
              <MiniStat
                label="Clics"
                value={formatNumber(kpis.clics)}
                icon={ArrowUpRight}
              />
            </div>

            {usesByCategory.length === 0 ? (
              <p className="text-sm text-slate-500">
                Publica beneficios para ver tus tendencias aquí.
              </p>
            ) : (
              <div className="space-y-3">
                {usesByCategory.slice(0, 5).map((c) => (
                  <div key={c.category} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{c.category}</span>
                      <span className="font-semibold tabular-nums text-slate-200">
                        {formatNumber(c.uses)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800">
                      <div
                        className="h-1.5 rounded-full bg-olive-500"
                        style={{ width: `${(c.uses / maxCatUses) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Actividad reciente" icon={ActivityIcon}>
            {activity.length === 0 ? (
              <p className="text-sm text-slate-500">
                Todavía no hay actividad. Publica un referido para empezar.
              </p>
            ) : (
              <ul className="animate-stagger space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-olive-400" />
                    <p className="text-sm leading-snug text-slate-300">
                      {activityLabel(a.type, a.brand)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* ── Guardados (compacto) ──────────────────────────────────────── */}
      {saved.length > 0 && (
        <Panel title="Guardados" icon={Bookmark}>
          <div className="animate-stagger grid gap-3 sm:grid-cols-2">
            {saved.map((b) => (
              <Link
                key={b.id}
                href={`/app/referido/${b.id}`}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 transition-colors duration-150 ease-brand hover:border-slate-700 hover:bg-slate-800/30"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-slate-100">
                  {b.brand.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {formatBenefitValue(b)}
                  </p>
                  <p className="truncate text-xs text-slate-500">{b.brand}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
              </Link>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ── Primitivas dark del dashboard ──────────────────────────────────────

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-colors duration-150 ease-brand hover:border-slate-700">
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          accent,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-2xl font-bold tabular-nums text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  accent = "text-slate-500",
  badge,
  children,
}: {
  title: string;
  icon: LucideIcon;
  accent?: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className={cn("h-4 w-4", accent)} />
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        {badge !== undefined && badge > 0 && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-300">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums text-slate-100">{value}</p>
    </div>
  );
}
