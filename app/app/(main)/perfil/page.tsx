import Link from "next/link";
import {
  ExternalLink,
  BadgeCheck,
  MapPin,
  CalendarDays,
  MousePointerClick,
  Eye,
  Bookmark,
  Layers,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { ActivityFeed } from "@/components/activity-feed";
import { ProfileForm } from "@/components/profile-form";
import { AvatarUpload } from "@/components/avatar-upload";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";
import { categoryIcon } from "@/lib/category-icons";
import {
  computeTrustSignals,
  getDashboardKpis,
  getMyNotificationPreferences,
  getMyProfile,
  getMyReferrals,
  getMyUsesByCategory,
  getRecentActivity,
} from "@/lib/queries";
import { formatCount } from "@/lib/benefit-format";
import { brandColor } from "@/lib/brand";

export const metadata = {
  title: "Mi cuenta | MisReferidos",
};

function formatNumber(n: number) {
  return n.toLocaleString("es-ES");
}

export default async function PerfilPage() {
  const me = await getMyProfile();
  if (!me) return null;

  const [kpis, mine, usesByCategory, activity, prefs] = await Promise.all([
    getDashboardKpis(),
    getMyReferrals(),
    getMyUsesByCategory(),
    getRecentActivity(),
    getMyNotificationPreferences(),
  ]);

  // La reputación se calcula, no se guarda: sale de lo que publica, de cuánto
  // se le verifica y de cuánto mantiene al día.
  const trust = computeTrustSignals(
    {
      publicados: mine.length,
      verificados: mine.filter((b) => b.verified).length,
      activos: mine.filter((b) => b.status === "active").length,
    },
    me.created_at,
  );

  const topCategories = usesByCategory.slice(0, 4);
  const maxCatUses = Math.max(...topCategories.map((c) => c.uses), 1);

  const joined = new Date(me.created_at).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-8">
      {/* Identidad */}
      <Card className="p-6 bg-white/70 border-slate-200/70">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-bold text-white ${brandColor(
              me.display_name,
            )}`}
          >
            {me.display_name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {me.display_name}
              </h1>
              {me.is_verified && (
                <Badge
                  variant="outline"
                  className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verificado
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-400">@{me.username}</p>
            {me.bio && <p className="text-sm text-slate-600">{me.bio}</p>}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              {me.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {me.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                En la comunidad desde {joined}
              </span>
            </div>
          </div>

          <Link href={`/u/${me.username}`} className="shrink-0">
            <Button variant="outline" className="gap-1.5">
              <ExternalLink className="w-4 h-4" />
              Ver mi perfil público
            </Button>
          </Link>
        </div>
      </Card>

      {/* Reputación — lo que sustituye a las "ganancias" como medida de estatus */}
      <Card className="p-6 bg-white/70 border-slate-200/70 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-olive-50 text-olive-600">
              <Trophy className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">{trust.level}</h2>
              <p className="text-xs text-muted-foreground">
                Tu reputación crece cuando publicas, te verificamos y mantienes
                tus beneficios al día.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Progreso al siguiente nivel</span>
            <span className="tabular-nums font-medium text-slate-700">
              {trust.progress}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-olive-600 h-2 rounded-full transition-all"
              style={{ width: `${trust.progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <TrustStat label="Publicados" value={trust.publicados} />
          <TrustStat
            label="Verificados"
            value={trust.verificados}
            icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
          />
          <TrustStat label="Activos" value={trust.activos} />
          <TrustStat label="Vigencia" value={`${trust.vigencia}%`} />
        </div>
      </Card>

      {/* Métricas de uso — nunca dinero */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Usos totales"
          value={formatNumber(kpis.usosTotales)}
          icon={MousePointerClick}
          accent="text-olive-600 bg-olive-50"
          hint="Personas que usaron tus códigos"
        />
        <StatCard
          label="Vistas"
          value={formatNumber(kpis.vistas)}
          icon={Eye}
          accent="text-sky-600 bg-sky-50"
        />
        <StatCard
          label="Guardados"
          value={formatNumber(kpis.guardados)}
          icon={Bookmark}
          accent="text-amber-600 bg-amber-50"
        />
        <StatCard
          label="Referidos activos"
          value={kpis.referidosActivos}
          icon={Layers}
          accent="text-emerald-600 bg-emerald-50"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Categorías frecuentes */}
          <Card className="p-6 bg-white/70 border-slate-200/70">
            <h2 className="font-semibold text-slate-900 mb-1">
              Tus categorías
            </h2>
            <p className="text-xs text-muted-foreground mb-5">
              Donde más aporta lo que compartes.
            </p>

            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Publica tu primer beneficio para ver tus categorías aquí.
              </p>
            ) : (
              <div className="space-y-4">
                {topCategories.map((c) => {
                  const Icon = categoryIcon(c.iconName);
                  return (
                    <div key={c.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-700">
                          <Icon className="w-4 h-4 text-slate-400" />
                          {c.category}
                        </span>
                        <span className="text-xs text-slate-500 tabular-nums">
                          {formatCount(c.uses)} usos
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-slate-900 h-1.5 rounded-full"
                          style={{ width: `${(c.uses / maxCatUses) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Configuración */}
          <Card className="p-6 bg-white/70 border-slate-200/70 space-y-5">
            <div>
              <h2 className="font-semibold text-slate-900">Tus datos</h2>
              <p className="text-xs text-muted-foreground">
                Así te ve el resto de la comunidad.
              </p>
            </div>

            <AvatarUpload name={me.display_name} initialUrl={me.avatar_url} />

            <ProfileForm
              initial={{
                displayName: me.display_name,
                username: me.username,
                bio: me.bio ?? "",
                location: me.location ?? "",
              }}
            />
          </Card>

          {/* Notificaciones */}
          <Card className="p-6 bg-white/70 border-slate-200/70 space-y-4">
            <div>
              <h2 className="font-semibold text-slate-900">Notificaciones</h2>
              <p className="text-xs text-muted-foreground">
                Te avisamos solo de lo que te sirve.
              </p>
            </div>
            <NotificationPreferencesForm
              initial={{
                notifyUses: prefs?.notify_uses ?? true,
                notifyVerification: prefs?.notify_verification ?? true,
                notifyExpiration: prefs?.notify_expiration ?? true,
                notifyNews: prefs?.notify_news ?? false,
              }}
            />
          </Card>

          {/* Zona de peligro */}
          <Card className="p-6 border-rose-200 bg-rose-50/40 space-y-3">
            <div>
              <h2 className="font-semibold text-rose-900">Cerrar mi cuenta</h2>
              <p className="text-xs text-rose-700/80">
                Se eliminan tus datos y tus beneficios dejan de aparecer en
                Explorar. No se puede deshacer.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
            >
              Eliminar cuenta
            </Button>
          </Card>
        </div>

        {/* Actividad */}
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-slate-900">Tu actividad</h2>
            <p className="text-xs text-muted-foreground">
              Lo último que pasó con tus beneficios.
            </p>
          </div>
          <ActivityFeed items={activity} />
        </div>
      </div>
    </div>
  );
}

function TrustStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white/60 p-3">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
        {value}
      </p>
    </div>
  );
}
