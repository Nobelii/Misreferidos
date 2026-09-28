import type { Enums, Tables } from "@/lib/database.types";

// Los enums son los de Postgres: una sola fuente de verdad. La traducción a
// español vive en lib/labels.ts y lib/benefit-format.ts, nunca en los datos.
export type BenefitType = Enums<"benefit_type">;
export type BenefitStatus = Enums<"referral_status">;
export type BrandStatus = Enums<"brand_status">;
export type VerificationStatus = Enums<"verification_status">;
export type ActivityType = Enums<"activity_type">;

/** Derivado por la vista public_referrals, no es un enum de Postgres. */
export type BenefitTag = "new" | "popular" | "best_discount" | "ending_soon";

/** Derivado por la vista my_attention_items. */
export type AttentionReason =
  | "expired"
  | "reported"
  | "rejected"
  | "expiring_soon"
  | "archived"
  | "pending_review"
  | "no_traction";

/** Sentinela de "todas las categorías" en los filtros. No existe en la base. */
export const ALL_CATEGORIES = "Todas";

export interface Category {
  slug: string;
  name: string;
  /** Nombre del icono Lucide; se resuelve a componente en lib/category-icons.tsx */
  iconName: string | null;
  count: number;
}

/**
 * Modelo de vista de un referido. Es lo que consumen las tarjetas y las
 * páginas, aplanado desde la vista public_referrals (que ya trae categoría y
 * autor resueltos, sin joins en el cliente).
 */
export interface Benefit {
  id: string;
  brand: string;
  /** Slug de la marca. Es la clave de /marca/[slug]: toda tarjeta enlaza ahí. */
  brandSlug: string;
  logoUrl?: string;
  headline: string;
  category: string;
  type: BenefitType;
  // Magnitud cruda ("40", "3"). La unidad la aporta el type, así que se puede
  // comparar y ordenar. Ausente en los tipos sin valor (free_shipping, bogo).
  value?: string;
  code?: string;
  ctaLabel: "Obtener Código" | "Copiar Código";
  description?: string;
  tag?: BenefitTag;
  /** Usos reales: copias de código + clics en el enlace. */
  uses: number;
  views: number;
  savedCount: number;
  helpfulCount: number;
  verified: boolean;
  expiresAt?: string;
  conditions?: string[];
  steps?: string[];
  redeemUrl?: string;
  publisherId?: string;
  status?: BenefitStatus;
  createdAt?: string;
  /**
   * Último uso real (copia de código o clic en el enlace), no última vista.
   * Ausente si nadie la ha usado todavía. Alimenta la franja de actividad de
   * la ficha de marca.
   */
  lastUsedAt?: string;
}

/**
 * Lo que el usuario en sesión ya hizo con un referido.
 *
 * Vive en types y no en queries porque el modal de oferta (cliente) lo recibe
 * por props, y queries.ts es `server-only`.
 */
export interface MyInteraction {
  saved: boolean;
  vote: boolean | null;
}

// ---------------------------------------------------------------------------
// Marcas / servicios
// ---------------------------------------------------------------------------

/** Modelo de vista de una marca, aplanado desde la tabla `brands`. */
export interface Brand {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string;
  logoUrl?: string;
  status: BrandStatus;
}

// Solo las columnas que consume la vista de marca: las queries seleccionan un
// subconjunto de `brands`, no la fila entera.
type BrandRow = Pick<
  Tables<"brands">,
  "id" | "name" | "slug" | "website_url" | "logo_url" | "status"
>;

export function toBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    websiteUrl: row.website_url,
    logoUrl: row.logo_url ?? undefined,
    status: row.status,
  };
}

/**
 * Una marca con sus agregados, aplanada desde la vista `public_brands`.
 *
 * Es lo que consumen la card del directorio y la cabecera de /marca/[slug].
 * `best*` describe la MEJOR oferta activa de la marca (la de mayor magnitud) y
 * es el gancho de la card: sin ella habría que pedir las ofertas de cada marca
 * por separado.
 *
 * OJO: no lleva `id`. La vista agrupa por `coalesce(brands.slug,
 * referrals.brand_slug)` para no dejar fuera los referidos anteriores a la
 * tabla `brands`, que no tienen FK. El slug es la identidad aquí.
 */
export interface BrandSummary {
  slug: string;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  offersCount: number;
  /** Usos reales sumados: copias de código + clics en el enlace. */
  totalUses: number;
  helpfulCount: number;
  /** Alguna de sus ofertas está verificada por el equipo. */
  hasVerified: boolean;
  lastPublishedAt?: string;
  bestMagnitude: number;
  bestType?: BenefitType;
  /** Magnitud cruda de la mejor oferta; misma semántica que Benefit.value. */
  bestValue?: string;
  bestCategory?: string;
  bestTag?: BenefitTag;
}

export function toBrandSummary(row: Tables<"public_brands">): BrandSummary {
  return {
    slug: row.slug!,
    name: row.name!,
    logoUrl: row.logo_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    description: row.description ?? undefined,
    offersCount: row.offers_count ?? 0,
    totalUses: row.total_uses ?? 0,
    helpfulCount: row.helpful_count ?? 0,
    hasVerified: row.has_verified ?? false,
    lastPublishedAt: row.last_published_at ?? undefined,
    bestMagnitude: Number(row.best_magnitude ?? 0),
    bestType: row.best_benefit_type ?? undefined,
    bestValue:
      row.best_value_amount != null ? String(row.best_value_amount) : undefined,
    bestCategory: row.best_category ?? undefined,
    bestTag: (row.best_tag as BenefitTag | null) ?? undefined,
  };
}

/**
 * Límites de subida de logos. Se comparten entre el cliente (feedback inmediato
 * en el modal) y la server action (validación real, no burlable). El bucket
 * `brand-logos` no impone estos límites por sí solo, así que se aplican aquí.
 */
export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

/** Dominio legible para mostrar bajo el nombre en el autocomplete ("spotify.com"). */
export function brandDomain(websiteUrl: string): string {
  try {
    return new URL(websiteUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export interface Publisher {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  verified: boolean;
  location?: string;
  joinedAt: string;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  benefitId?: string;
  // La base guarda type + metadata, nunca la frase ya renderizada: la copy se
  // arma en el cliente con activityLabel().
  brand?: string;
  at: string;
}

/**
 * Aplana una fila de public_referrals al modelo de vista.
 *
 * La vista declara casi todo como nullable porque Postgres no deduce que los
 * joins van sobre FKs NOT NULL. Los `!` de aquí son deliberados: si `id` o
 * `brand` llegaran nulos, lo roto sería la vista, no los datos.
 */
export function toBenefit(row: Tables<"public_referrals">): Benefit {
  return {
    id: row.id!,
    brand: row.brand!,
    brandSlug: row.brand_slug!,
    logoUrl: row.brand_logo_url ?? undefined,
    headline: row.title!,
    category: row.category_name!,
    type: row.benefit_type!,
    value: row.value_amount != null ? String(row.value_amount) : undefined,
    code: row.code ?? undefined,
    ctaLabel: row.code ? "Copiar Código" : "Obtener Código",
    description: row.summary ?? row.description ?? undefined,
    tag: (row.auto_tag as BenefitTag | null) ?? undefined,
    uses: (row.copies_count ?? 0) + (row.clicks_count ?? 0),
    views: row.views_count ?? 0,
    savedCount: row.saves_count ?? 0,
    helpfulCount: row.helpful_count ?? 0,
    verified: row.is_verified ?? false,
    expiresAt: row.expires_at ?? undefined,
    conditions: row.terms ?? undefined,
    steps: row.steps ?? undefined,
    redeemUrl: row.redeem_url ?? undefined,
    publisherId: row.owner_id ?? undefined,
    status: "active",
    createdAt: row.published_at ?? row.created_at ?? undefined,
    lastUsedAt: row.last_used_at ?? undefined,
  };
}

/**
 * Igual, pero desde la tabla `referrals` cruda: el dashboard tiene que ver sus
 * borradores, pendientes y rechazados, que la vista pública nunca devuelve.
 */
export function ownReferralToBenefit(
  row: Tables<"referrals"> & {
    categories?: { name: string } | null;
    brands?: { logo_url: string | null } | null;
  },
): Benefit {
  return {
    id: row.id,
    brand: row.brand,
    brandSlug: row.brand_slug,
    logoUrl: row.brands?.logo_url ?? undefined,
    headline: row.title,
    category: row.categories?.name ?? "",
    type: row.benefit_type,
    value: row.value_amount != null ? String(row.value_amount) : undefined,
    code: row.code ?? undefined,
    ctaLabel: row.code ? "Copiar Código" : "Obtener Código",
    description: row.summary ?? row.description ?? undefined,
    uses: row.copies_count + row.clicks_count,
    views: row.views_count,
    savedCount: row.saves_count,
    helpfulCount: row.helpful_count,
    verified: row.verification_status === "verified",
    expiresAt: row.expires_at ?? undefined,
    conditions: row.terms ?? undefined,
    steps: row.steps ?? undefined,
    redeemUrl: row.redeem_url ?? undefined,
    publisherId: row.owner_id,
    status: row.status,
    createdAt: row.published_at ?? row.created_at,
    lastUsedAt: row.last_used_at ?? undefined,
  };
}

export function toPublisher(row: Tables<"public_profiles">): Publisher {
  return {
    id: row.id!,
    username: row.username!,
    name: row.display_name!,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    verified: row.is_verified ?? false,
    location: row.location ?? undefined,
    joinedAt: row.created_at!,
  };
}
