import {
  BadgePercent,
  CalendarCheck,
  Truck,
  Gift,
  Coins,
  Timer,
  PackageOpen,
  Sparkles,
  Flame,
  Clock,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { Benefit, BenefitTag, BenefitType } from "@/lib/types";

const DAY_MS = 86_400_000;

export interface BenefitTypeMeta {
  label: string;
  icon: LucideIcon;
  /** Badge suave, sobre fondo claro. */
  className: string;
  /** Sufijo del input de valor en Publicar. Vacío = el tipo no lleva valor. */
  unit: string;
}

// Las claves son los valores del enum benefit_type de Postgres. La unidad de
// cada tipo es lo que da sentido a value_amount, y es la misma regla que impone
// el CHECK `value_required` de la tabla: unit vacío = valor opcional.
export const BENEFIT_TYPE_META: Record<BenefitType, BenefitTypeMeta> = {
  discount: {
    label: "Descuento",
    icon: BadgePercent,
    className: "bg-olive-50 text-olive-700 border-olive-200",
    unit: "%",
  },
  free_months: {
    label: "Meses gratis",
    icon: CalendarCheck,
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    unit: "meses",
  },
  free_shipping: {
    label: "Envío gratis",
    icon: Truck,
    className: "bg-sky-50 text-sky-700 border-sky-100",
    unit: "",
  },
  bonus: {
    label: "Bono",
    icon: Coins,
    className: "bg-amber-50 text-amber-700 border-amber-100",
    unit: "$",
  },
  cashback: {
    label: "Cashback",
    icon: Coins,
    className: "bg-amber-50 text-amber-700 border-amber-100",
    unit: "%",
  },
  free_trial: {
    label: "Prueba gratis",
    icon: Timer,
    className: "bg-sky-50 text-sky-700 border-sky-100",
    unit: "días",
  },
  gift: {
    label: "Regalo",
    icon: Gift,
    className: "bg-rose-50 text-rose-700 border-rose-100",
    unit: "$",
  },
  bogo: {
    label: "2x1",
    icon: PackageOpen,
    className: "bg-rose-50 text-rose-700 border-rose-100",
    unit: "",
  },
  other: {
    label: "Otro",
    icon: Tag,
    className: "bg-slate-100 text-slate-700 border-slate-200",
    unit: "",
  },
};

// 'other' queda fuera del selector: es el escape hatch del esquema, no una
// opción que ofrecer a quien publica.
export const BENEFIT_TYPE_ORDER: BenefitType[] = [
  "discount",
  "free_months",
  "free_trial",
  "bonus",
  "cashback",
  "free_shipping",
  "gift",
  "bogo",
];

/**
 * El gancho de la card: lo primero que lee la persona. Un único lugar para que
 * "40% OFF" se vea igual en explorar, detalle, dashboard y perfil.
 *
 * El parámetro es estructural, no `Benefit`, para que la card de marca pueda
 * pasarle la mejor oferta agregada de `public_brands` (que no es un Benefit
 * completo) sin duplicar este switch.
 */
export function formatBenefitValue(b: { type: BenefitType; value?: string }): string {
  const v = b.value?.trim();
  switch (b.type) {
    case "discount":
      return v ? `${v}% OFF` : "Descuento";
    case "cashback":
      return v ? `${v}% de cashback` : "Cashback";
    case "free_months":
      if (!v) return "Meses gratis";
      return Number(v) === 1 ? "1 mes gratis" : `${v} meses gratis`;
    case "free_trial":
      if (!v) return "Prueba gratis";
      return Number(v) === 1 ? "1 día gratis" : `${v} días gratis`;
    case "bonus":
      return v ? `$${v} de bono` : "Bono de bienvenida";
    case "gift":
      return v ? `$${v} de regalo` : "Regalo de bienvenida";
    case "free_shipping":
      return "Envío gratis";
    case "bogo":
      return "2x1";
    case "other":
      return v ?? "Beneficio";
  }
}

export function daysUntil(iso: string, now: Date = new Date()): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS);
}

export function isExpired(b: Benefit, now: Date = new Date()): boolean {
  return b.expiresAt ? daysUntil(b.expiresAt, now) < 0 : false;
}

export function isEndingSoon(b: Benefit, now: Date = new Date()): boolean {
  if (!b.expiresAt) return false;
  const d = daysUntil(b.expiresAt, now);
  return d >= 0 && d <= 7;
}

/** "Termina en 3 días" / "Termina hoy" / "Vencido". */
export function formatExpiry(
  b: Benefit,
  now: Date = new Date(),
): string | undefined {
  if (!b.expiresAt) return undefined;
  const d = daysUntil(b.expiresAt, now);
  if (d < 0) return "Vencido";
  if (d === 0) return "Termina hoy";
  if (d === 1) return "Termina mañana";
  if (d <= 30) return `Termina en ${d} días`;
  return `Válido hasta el ${new Date(b.expiresAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })}`;
}

/**
 * Magnitud comparable entre tipos distintos, para ordenar por "mejor
 * beneficio". No es una ciencia exacta: solo tiene que producir un ranking
 * defendible entre un 40% OFF y 3 meses gratis.
 *
 * Espeja la columna `magnitude` de la vista public_referrals. Se recalcula aquí
 * porque Explorar ordena en el cliente sobre el conjunto ya cargado.
 */
export function magnitude(b: Benefit): number {
  const v = Number(b.value ?? 0) || 0;
  switch (b.type) {
    case "discount":
    case "cashback":
    case "free_trial":
      return v;
    case "free_months":
      return v * 12;
    case "bonus":
    case "gift":
      return v * 2;
    case "bogo":
      return 50;
    case "free_shipping":
      return 10;
    case "other":
      return 0;
  }
}

// El tag ya no se deriva aquí: lo calcula la vista public_referrals con las
// mismas reglas y umbrales (app_settings), así que no puede desincronizarse
// entre lo que ordena la base y lo que pinta la tarjeta.
export const TAG_STYLES: Record<
  BenefitTag,
  { label: string; icon: LucideIcon; className: string }
> = {
  new: {
    label: "Nuevo",
    icon: Sparkles,
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  popular: {
    label: "Más usado",
    icon: Flame,
    className: "bg-olive-50 text-olive-700 border-olive-200",
  },
  best_discount: {
    label: "Mejor descuento",
    icon: BadgePercent,
    className: "bg-amber-50 text-amber-700 border-amber-100",
  },
  ending_soon: {
    label: "Termina pronto",
    icon: Clock,
    className: "bg-rose-50 text-rose-700 border-rose-100",
  },
};

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}
