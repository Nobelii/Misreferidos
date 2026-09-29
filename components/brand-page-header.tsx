import Link from "next/link";
import {
  BadgeCheck,
  ExternalLink,
  Layers,
  MousePointerClick,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/brand-mark";
import { brandDomain, type BrandSummary } from "@/lib/types";

function formatNumber(n: number) {
  return n.toLocaleString("es-ES");
}

/**
 * Cabecera de /marca/[slug]: quién es la marca y cuánto la usa la comunidad.
 *
 * Las tres métricas salen de agregados que ya calcula la vista `public_brands`,
 * así que no cuesta ninguna query extra. No hay estrellas: no existe un voto
 * por marca, solo el "¿te sirvió?" por oferta, y pintar un ★ inventado sería
 * mentir sobre un dato que no tenemos.
 */
export function BrandPageHeader({ brand }: { brand: BrandSummary }) {
  const domain = brand.websiteUrl ? brandDomain(brand.websiteUrl) : null;

  const metrics: { icon: LucideIcon; value: string; label: string }[] = [
    {
      icon: Layers,
      value: formatNumber(brand.offersCount),
      label: brand.offersCount === 1 ? "oferta activa" : "ofertas activas",
    },
    {
      icon: MousePointerClick,
      value: formatNumber(brand.totalUses),
      label: brand.totalUses === 1 ? "uso" : "usos",
    },
    {
      icon: ThumbsUp,
      value: formatNumber(brand.helpfulCount),
      label: brand.helpfulCount === 1 ? "voto útil" : "votos útiles",
    },
  ];

  return (
    <Card className="p-6 md:p-8 bg-paper border-line shadow-xs">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <BrandMark
          brand={brand.name}
          logoUrl={brand.logoUrl}
          size={80}
          className="h-20 w-20 shrink-0 rounded-2xl border border-line"
          textClassName="text-3xl"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              {brand.name}
            </h1>
            {brand.hasVerified && (
              <span
                className="flex items-center gap-1 rounded-full border border-olive-200 bg-olive-50 px-2 py-0.5 text-[11px] font-medium text-olive-700"
                title="Alguna de sus ofertas está verificada por el equipo"
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                Verificada
              </span>
            )}
          </div>

          {brand.description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              {brand.description}
            </p>
          )}

          {domain && brand.websiteUrl && (
            <Link
              href={brand.websiteUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-2 inline-flex items-center gap-1 text-sm text-olive-700 transition-colors hover:text-olive-900 hover:underline"
            >
              {domain}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}

          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
            {metrics.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3">
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
        </div>
      </div>
    </Card>
  );
}
