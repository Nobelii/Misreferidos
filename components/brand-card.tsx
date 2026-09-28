import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { BenefitTypeBadge } from "@/components/benefit-type-badge";
import { TAG_STYLES, formatBenefitValue, formatCount } from "@/lib/benefit-format";
import type { BrandSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * La marca en el directorio. Sustituye a la tarjeta por oferta: si Spotify
 * tiene cinco códigos, aquí es una sola card y no cinco.
 *
 * El gancho es la MEJOR oferta de la marca (la de mayor magnitud), no un
 * contador de usos: "Hasta 3 meses gratis" dice qué ganas, "21 usos" no.
 * `best*` viene ya calculado por la vista public_brands.
 */
export function BrandCard({ brand }: { brand: BrandSummary }) {
  const tag = brand.bestTag ? TAG_STYLES[brand.bestTag] : null;
  const TagIcon = tag?.icon;

  const hook = brand.bestType
    ? formatBenefitValue({ type: brand.bestType, value: brand.bestValue })
    : null;

  return (
    <Link href={`/marca/${brand.slug}`} className="group block">
      <Card
        className={cn(
          "relative flex h-full flex-col gap-3 p-4 bg-paper border-line shadow-sm cursor-pointer",
          "transition-[transform,box-shadow,border-color] duration-200 ease-brand hover:shadow-md hover:-translate-y-0.5 hover:border-olive-300",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <BrandMark
            brand={brand.name}
            logoUrl={brand.logoUrl}
            size={40}
            className="h-10 w-10 rounded-lg border border-line"
            textClassName="text-base"
          />
          {tag && TagIcon && (
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
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-medium text-ink">
              {brand.name}
            </span>
            {brand.hasVerified && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-olive-600" />
            )}
          </div>

          {hook && (
            <p className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink">
              {/* "Hasta" solo cuando hay más de una: con una sola oferta no hay
                  un rango del que ésta sea el techo. */}
              {brand.offersCount > 1 ? `Hasta ${hook}` : hook}
            </p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {brand.bestType && <BenefitTypeBadge type={brand.bestType} />}
            {brand.bestCategory && (
              <Badge variant="secondary" className="w-fit text-[10px] font-medium">
                {brand.bestCategory}
              </Badge>
            )}
          </div>

          <p className="mt-1 text-[11px] tabular-nums text-slate-400">
            {brand.offersCount === 1
              ? "1 oferta"
              : `${brand.offersCount} ofertas`}
            {brand.totalUses > 0 && ` · ${formatCount(brand.totalUses)} usos`}
          </p>
        </div>

        <span
          className={cn(
            buttonVariants({ size: "sm" }),
            "pointer-events-none mt-1 w-full",
          )}
        >
          Ver ofertas
        </span>
      </Card>
    </Link>
  );
}
