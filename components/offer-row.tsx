"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Clock, Hash, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BenefitTypeBadge } from "@/components/benefit-type-badge";
import {
  TAG_STYLES,
  formatBenefitValue,
  formatCount,
  formatExpiry,
  isEndingSoon,
} from "@/lib/benefit-format";
import { recentUseLabel } from "@/lib/format-time";
import type { Benefit } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Una oferta dentro de la ficha de marca. Tres zonas en fila: el gancho a la
 * izquierda separado por un divisor, el detalle en el centro y el CTA a la
 * derecha. Debajo, una franja de actividad reciente si la hay.
 *
 * A diferencia de BenefitCard no repite el logo ni el nombre de la marca: la
 * cabecera de la página ya los dio, y repetirlos doce veces es ruido.
 *
 * El CTA es un <a> real con href="?oferta=<id>" aunque abra un modal: así
 * conserva el "abrir en pestaña nueva", el menú contextual y el hover con la
 * URL, y sin JS la navegación normal deja la página con el modal ya abierto
 * (el servidor lee ?oferta= y lo monta). El onClick solo intercepta el clic
 * simple con botón izquierdo.
 */
export function OfferRow({
  benefit,
  href,
  onSelect,
}: {
  benefit: Benefit;
  href: string;
  onSelect: () => void;
}) {
  const tag = benefit.tag ? TAG_STYLES[benefit.tag] : null;
  const TagIcon = tag?.icon;
  const expiry = formatExpiry(benefit);
  const endingSoon = isEndingSoon(benefit);

  // La oferta más usada de la marca se destaca. Se deriva del mismo auto_tag
  // que ya pinta el badge "Más usado", así que no hace falta ningún campo
  // nuevo ni tocar is_featured.
  const highlighted = benefit.tag === "popular";

  // La hora se calcula tras montar, nunca en el render del servidor: esta
  // página está cacheada y Cache Components prohíbe leer la hora en prerender.
  // Consecuencia: la franja de actividad aparece con la hidratación.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const activity = now === null ? null : recentUseLabel(benefit.lastUsedAt, now);

  return (
    <Card
      className={cn(
        "overflow-hidden p-0 shadow-xs transition-[box-shadow,border-color] duration-200 ease-brand hover:shadow-md",
        highlighted
          ? "border-olive-300 bg-olive-50/40 ring-1 ring-olive-200"
          : "border-line bg-paper hover:border-olive-300",
      )}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
        {/* El gancho. Ancho fijo en sm+ para que todas las filas alineen el
            bloque central, sin importar si pone "2x1" o "3 meses gratis". El
            divisor pasa de vertical a horizontal al apilarse en móvil. */}
        <div className="shrink-0 border-b border-line pb-4 sm:w-44 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
          <p className="font-display text-3xl font-semibold leading-none tracking-tight text-ink">
            {formatBenefitValue(benefit)}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {benefit.tag && tag && TagIcon && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 px-1.5 py-0.5 text-[10px] font-semibold",
                  tag.className,
                )}
              >
                <TagIcon className="h-3 w-3" />
                {tag.label}
              </Badge>
            )}
            <BenefitTypeBadge type={benefit.type} />
            <Badge variant="secondary" className="w-fit text-[10px] font-medium">
              {benefit.category}
            </Badge>
            {benefit.verified && (
              <BadgeCheck className="h-3.5 w-3.5 text-olive-600" />
            )}
          </div>

          <p className="mt-1.5 text-sm leading-snug text-ink line-clamp-2">
            {benefit.headline}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 tabular-nums">
              <Users className="h-3 w-3" />
              {formatCount(benefit.uses)} usos
            </span>
            {expiry && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  endingSoon && "font-medium text-rose-600",
                )}
              >
                <Clock className="h-3 w-3" />
                {expiry}
              </span>
            )}
          </div>
        </div>

        {/* CTA. Con código, el código real va detrás difuminado y el botón lo
            tapa a medias — el efecto "hay algo que revelar" de CouponFollow.
            OJO: el blur es decorativo, no protección: el código viaja en el
            HTML igual que antes. Por eso el botón se llama "Ver código" y no
            "Desbloquear". */}
        <div className="relative shrink-0 sm:w-auto">
          {benefit.code && (
            // Ancho FIJO y overflow-hidden a propósito: el CHECK code_len
            // admite hasta 40 caracteres, y una caja que creciera con el
            // contenido se metería por debajo de la descripción.
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-32 items-center justify-end overflow-hidden rounded-md border border-dashed border-olive-300 bg-olive-50/70 pr-3 sm:flex"
            >
              <span className="select-none whitespace-nowrap font-mono text-sm font-bold tracking-widest text-ink blur-[3px]">
                {benefit.code}
              </span>
            </div>
          )}

          <a
            href={href}
            onClick={(e) => {
              // Se respetan ctrl/cmd/shift y el botón central: quien pide una
              // pestaña nueva la recibe, no un modal.
              if (
                e.metaKey ||
                e.ctrlKey ||
                e.shiftKey ||
                e.altKey ||
                e.button !== 0
              ) {
                return;
              }
              e.preventDefault();
              onSelect();
            }}
            className={cn(
              buttonVariants({ size: "sm" }),
              "relative w-full gap-1.5 shadow-xs sm:w-auto sm:min-w-34",
              // Deja asomar el código difuminado por la derecha.
              benefit.code && "sm:mr-16",
            )}
          >
            <Hash className="h-3.5 w-3.5" />
            {benefit.code ? "Ver código" : "Ir a la oferta"}
          </a>
        </div>
      </div>

      {/* Prueba social. Solo si hay uso reciente de verdad — sin actividad no
          se pinta nada, en vez de rellenar con una frase vacía. */}
      {activity && (
        <div
          className={cn(
            "flex items-center gap-1.5 border-t px-5 py-2 text-xs font-medium",
            highlighted
              ? "border-olive-200 bg-emerald-50/60 text-emerald-800"
              : "border-line bg-emerald-50/70 text-emerald-800",
          )}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          {activity}
        </div>
      )}
    </Card>
  );
}
