import Link from "next/link";
import { BadgeCheck, Users, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { BenefitTypeBadge } from "@/components/benefit-type-badge";
import { brandColor } from "@/lib/brand";
import {
  TAG_STYLES,
  formatBenefitValue,
  formatCount,
  formatExpiry,
  isEndingSoon,
} from "@/lib/benefit-format";
import type { Benefit } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BenefitCard({
  benefit,
  featured = false,
}: {
  benefit: Benefit;
  featured?: boolean;
}) {
  const tag = benefit.tag ? TAG_STYLES[benefit.tag] : null;
  const TagIcon = tag?.icon;
  const expiry = formatExpiry(benefit);
  const endingSoon = isEndingSoon(benefit);

  return (
    // Enlaza a la ficha de la marca con el modal de esta oferta ya abierto.
    // Esta tarjeta ya no vive en Explorar (ahí van marcas), pero sí en el
    // dashboard, el perfil, /u/[username] y los guardados.
    <Link
      href={`/marca/${benefit.brandSlug}?oferta=${benefit.id}`}
      className={cn("group block", featured && "sm:col-span-2")}
    >
      <Card
        className={cn(
          "relative flex flex-col gap-3 p-4 h-full bg-paper border-line shadow-xs cursor-pointer",
          "transition-[transform,box-shadow,border-color] duration-200 ease-brand hover:shadow-md hover:-translate-y-0.5 hover:border-olive-300",
          featured && "ring-1 ring-olive-200 hover:shadow-lg",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          {benefit.logoUrl ? (
            <BrandMark brand={benefit.brand} logoUrl={benefit.logoUrl} />
          ) : (
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-semibold",
                brandColor(benefit.brand),
              )}
            >
              {benefit.brand.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-1">
            {benefit.tag && tag && TagIcon && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 text-[10px] font-semibold px-1.5 py-0.5",
                  tag.className,
                )}
              >
                <TagIcon className="w-3 h-3" />
                {tag.label}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-slate-400">
              {benefit.brand}
            </span>
            {benefit.verified && (
              <BadgeCheck className="w-3.5 h-3.5 text-olive-600" />
            )}
          </div>

          {/* El beneficio real es lo primero que se lee: qué ganas, no cómo se
              llama la promoción. */}
          <p
            className={cn(
              "font-display font-semibold leading-tight text-ink tracking-tight",
              featured ? "text-3xl" : "text-2xl",
            )}
          >
            {formatBenefitValue(benefit)}
          </p>
          <p className="text-xs text-slate-500 leading-snug line-clamp-2">
            {benefit.headline}
          </p>

          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <BenefitTypeBadge type={benefit.type} />
            <Badge
              variant="secondary"
              className="w-fit text-[10px] font-medium"
            >
              {benefit.category}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
            {typeof benefit.uses === "number" && (
              <span className="flex items-center gap-1 tabular-nums">
                <Users className="w-3 h-3" />
                {formatCount(benefit.uses)} usos
              </span>
            )}
            {expiry && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  endingSoon && "text-rose-600 font-medium",
                )}
              >
                <Clock className="w-3 h-3" />
                {expiry}
              </span>
            )}
          </div>
        </div>

        <span
          className={cn(
            buttonVariants({ size: "sm" }),
            "w-full mt-1 pointer-events-none",
          )}
        >
          {benefit.ctaLabel}
        </span>
      </Card>
    </Link>
  );
}
