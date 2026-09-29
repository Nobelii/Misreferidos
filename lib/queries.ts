import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Enums } from "@/lib/database.types";
import {
  toBenefit,
  toPublisher,
  toBrand,
  toBrandSummary,
  ownReferralToBenefit,
  type ActivityItem,
  type AttentionReason,
  type Benefit,
  type Brand,
  type BrandSummary,
  type Category,
  type MyInteraction,
  type Publisher,
} from "@/lib/types";

// Todas las lecturas pasan por el cliente de servidor, así que el RLS es quien
// decide qué se devuelve. No hay filtros de seguridad en el cliente: si una
// query intenta leer algo que no le toca, la base devuelve cero filas.

/** Columnas de public_referrals que consumen las tarjetas. */
const CARD_COLUMNS = `
  id, slug, owner_id, brand, brand_slug, title, summary, description,
  benefit_type, value_amount, value_label, code, redeem_url, terms, steps,
  expires_at, published_at, created_at,
  views_count, copies_count, clicks_count, saves_count, helpful_count,
  verification_status, is_featured, is_verified, has_code,
  category_slug, category_name, category_icon,
  username, display_name, avatar_url, owner_verified, magnitude, auto_tag,
  brand_logo_url, brand_id, last_used_at
`;

/**
 * ID del usuario en sesión, verificando el JWT **localmente** con getClaims()
 * en vez de getUser(), que hace un viaje de red al servidor de Auth cada vez.
 * El middleware ya valida la sesión con getClaims, así que esto es coherente.
 *
 * Envuelto en cache(): si una página lo llama desde dos queries distintas
 * (p. ej. getMyProfile + getMyNotificationPreferences), solo se evalúa una vez.
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

// cache(): el layout de la consola y la página del dashboard lo piden ambos;
// así se resuelve una sola vez por request.
export const getMyProfile = cache(async () => {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return data;
});

// ---------------------------------------------------------------------------
// Catálogo público
// ---------------------------------------------------------------------------

/**
 * Todas las ofertas activas, sin agrupar por marca.
 *
 * SIN USO desde que Explorar y la home pasaron a ser un directorio de marcas
 * (ver getBrands). Se conserva porque es la lectura genérica del catálogo y no
 * depende de ninguna decisión de producto.
 */
export async function getActiveBenefits(limit = 60): Promise<Benefit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_referrals")
    .select(CARD_COLUMNS)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(toBenefit);
}

export async function getBenefitById(id: string): Promise<Benefit | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_referrals")
    .select(CARD_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  return data ? toBenefit(data) : null;
}

export async function getSimilarBenefits(
  benefit: Benefit,
  limit = 4,
): Promise<Benefit[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_referrals")
    .select(CARD_COLUMNS)
    .eq("category_name", benefit.category)
    .neq("id", benefit.id)
    .order("views_count", { ascending: false })
    .limit(limit);

  return (data ?? []).map(toBenefit);
}

// ---------------------------------------------------------------------------
// Marcas (directorio y página de marca)
// ---------------------------------------------------------------------------

/**
 * El directorio de marcas. Una sola query: la vista `public_brands` ya trae los
 * agregados y la mejor oferta de cada marca, así que no hay N+1 ni hace falta
 * agrupar en JS.
 *
 * Las marcas SIN ofertas activas no aparecen aquí a propósito: un directorio de
 * marcas vacías no le sirve a nadie. Su página individual sí funciona, ver
 * getBrandBySlug().
 *
 * Cacheada con el tag `catalog`: alimenta la home y Explorar, que son idénticas
 * para todo el mundo. Sin esto ambas pegaban a la base en cada visita.
 */
export async function getBrands(limit = 60): Promise<BrandSummary[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("public_brands")
    .select("*")
    .order("total_uses", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(toBrandSummary);
}

/**
 * Una marca por su slug, para la cabecera de /marca/[slug].
 *
 * Cacheada y con el cliente sin cookies, por el mismo motivo que
 * getPublisherByUsername(): /marca/[slug] tiene que poder devolver un 404 real.
 * Si la lectura ocurriera dentro del Suspense, el shell ya se habría enviado
 * con un 200 y notFound() solo podría cambiar el HTML, no el status.
 *
 * El fallback a `brands` cubre a la marca recién creada que todavía no tiene
 * ninguna oferta: no está en public_brands, pero su página debe existir igual
 * (cabecera + estado vacío) en vez de dar 404.
 */
export async function getBrandBySlug(slug: string): Promise<BrandSummary | null> {
  "use cache";
  cacheTag(`brand:${slug}`);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("public_brands")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (data) return toBrandSummary(data);

  const { data: bare } = await supabase
    .from("brands")
    .select("name, slug, logo_url, website_url, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!bare) return null;

  return {
    slug: bare.slug,
    name: bare.name,
    logoUrl: bare.logo_url ?? undefined,
    websiteUrl: bare.website_url,
    description: bare.description ?? undefined,
    offersCount: 0,
    totalUses: 0,
    helpfulCount: 0,
    hasVerified: false,
    bestMagnitude: 0,
  };
}

/**
 * El slug de marca de un referido. Solo para la redirección de la ruta antigua
 * /app/referido/[id] → /marca/[slug]?oferta=[id].
 *
 * Cacheada por dos motivos: la marca de un referido no cambia nunca en la
 * práctica, y sobre todo porque con Cache Components una lectura SIN cachear
 * fuera de <Suspense> rompe el build. Una página que solo redirige no tiene
 * shell que enseñar, así que envolverla en Suspense convertiría el 307 en una
 * navegación de cliente.
 */
export async function getBrandSlugOfReferral(id: string): Promise<string | null> {
  "use cache";
  cacheTag(`referral-brand:${id}`);
  cacheLife("days");

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("public_referrals")
    .select("brand_slug")
    .eq("id", id)
    .maybeSingle();

  return data?.brand_slug ?? null;
}

/**
 * Las ofertas activas de una marca. Filtra por `brand_slug` y no por `brand_id`
 * porque brand_id es nullable: los referidos anteriores a la tabla `brands`
 * solo llevan el nombre denormalizado y quedarían fuera. Lo cubre el índice
 * parcial referrals_brand_slug_idx.
 *
 * Comparte el tag `brand:<slug>` con getBrandBySlug: publicar, pausar o votar
 * en una oferta invalida cabecera y listado de una sola vez (ver
 * revalidateBrandOf en lib/actions.ts).
 */
export async function getOffersByBrand(
  slug: string,
  limit = 60,
): Promise<Benefit[]> {
  "use cache";
  cacheTag(`brand:${slug}`);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("public_referrals")
    .select(CARD_COLUMNS)
    .eq("brand_slug", slug)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(toBenefit);
}

/**
 * Categorías con su conteo de referidos activos. El count sale de un head-count
 * por categoría en vez de traerse las filas: Explorar solo necesita el número.
 *
 * Cacheada: el listado de categorías es idéntico para todo el mundo y solo
 * cambia cuando alguien publica. El tag `catalog` lo invalidan las actions que
 * mueven el catálogo.
 */
export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");

  const supabase = createPublicClient();

  const [{ data: categories }, { data: rows }] = await Promise.all([
    supabase
      .from("categories")
      .select("slug, name, icon_name")
      .eq("is_active", true)
      .order("position"),
    supabase.from("public_referrals").select("category_slug"),
  ]);

  const counts = new Map<string, number>();
  for (const r of rows ?? []) {
    if (r.category_slug) {
      counts.set(r.category_slug, (counts.get(r.category_slug) ?? 0) + 1);
    }
  }

  return (categories ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    iconName: c.icon_name,
    count: counts.get(c.slug) ?? 0,
  }));
}

export interface HomeStats {
  activos: number;
  nuevosHoy: number;
  enTendencia: string;
  usosTotales: number;
}

/**
 * La banda de métricas de la home. Cacheada con el mismo tag que el catálogo:
 * son cifras de comunidad, no del visitante, y "nuevos hoy" con una hora de
 * desfase sigue siendo verdad.
 */
export async function getHomeStats(): Promise<HomeStats> {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("public_referrals")
    .select("category_name, copies_count, clicks_count, published_at");

  const rows = data ?? [];
  const since = Date.now() - 86_400_000;

  const byCategory = new Map<string, number>();
  let usosTotales = 0;
  let nuevosHoy = 0;

  for (const r of rows) {
    const uses = (r.copies_count ?? 0) + (r.clicks_count ?? 0);
    usosTotales += uses;
    if (r.published_at && new Date(r.published_at).getTime() >= since) nuevosHoy++;
    if (r.category_name) {
      byCategory.set(r.category_name, (byCategory.get(r.category_name) ?? 0) + uses);
    }
  }

  const enTendencia =
    [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return { activos: rows.length, nuevosHoy, enTendencia, usosTotales };
}

// ---------------------------------------------------------------------------
// Perfil público (/u/[username])
// ---------------------------------------------------------------------------

/**
 * Cacheada a propósito, y con el cliente sin cookies.
 *
 * /u/[username] tiene que poder devolver un 404 real: si esta lectura ocurriera
 * dentro del Suspense, el shell ya se habría enviado con un 200 y notFound()
 * solo podría cambiar el HTML, no el status. Al estar cacheada puede correr en
 * el shell, antes de que la respuesta se comprometa.
 */
export async function getPublisherByUsername(
  username: string,
): Promise<Publisher | null> {
  "use cache";
  cacheTag(`profile:${username}`);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  return data ? toPublisher(data) : null;
}

export async function getPublisherById(id: string): Promise<Publisher | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data ? toPublisher(data) : null;
}

/**
 * Los referidos de un perfil público. Cacheados con el tag `publisher:<id>`,
 * que invalidan las acciones del propio autor (publicar, pausar, borrar): sin
 * esto /u/[username] pegaba a la base en cada visita aunque el perfil ya
 * estuviera cacheado.
 */
export async function getBenefitsByPublisher(
  ownerId: string,
  limit = 24,
): Promise<Benefit[]> {
  "use cache";
  cacheTag(`publisher:${ownerId}`);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("public_referrals")
    .select(CARD_COLUMNS)
    .eq("owner_id", ownerId)
    .order("published_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(toBenefit);
}

// ---------------------------------------------------------------------------
// Dashboard (privado, RLS por auth.uid())
// ---------------------------------------------------------------------------

/** Incluye pausados y caducados: la vista pública solo trae los activos. */
export async function getMyReferrals(): Promise<Benefit[]> {
  const supabase = await createClient();
  // Embebe el logo de la marca vía la FK brand_id, igual que hace la vista
  // pública: así la tarjeta del dashboard se ve como la de Explorar.
  const { data } = await supabase
    .from("referrals")
    .select("*, categories(name), brands(logo_url)")
    .order("created_at", { ascending: false });

  return (data ?? []).map(ownReferralToBenefit);
}

export interface DashboardKpis {
  usosTotales: number;
  /** Copias de código, ya incluidas en usosTotales; se exponen para desglose. */
  copias: number;
  /** Clics en el enlace, ya incluidos en usosTotales. */
  clics: number;
  vistas: number;
  guardados: number;
  referidosActivos: number;
  /**
   * ID del mejor referido. La ficha completa la resuelve la página desde la
   * lista de getMyReferrals que ya tiene en memoria, en vez de un segundo
   * viaje a la base encadenado a este RPC.
   */
  topReferralId: string | null;
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_dashboard_stats");
  const stats = data?.[0];

  if (!stats) {
    return {
      usosTotales: 0,
      copias: 0,
      clics: 0,
      vistas: 0,
      guardados: 0,
      referidosActivos: 0,
      topReferralId: null,
    };
  }

  const copias = Number(stats.total_copies);
  const clics = Number(stats.total_clicks);

  return {
    // "Usos" es lo que la gente hizo con el referido: copiar el código o entrar
    // por el enlace. Las vistas se cuentan aparte porque mirar no es usar.
    usosTotales: copias + clics,
    copias,
    clics,
    vistas: Number(stats.total_views),
    guardados: Number(stats.total_saves),
    referidosActivos: Number(stats.active_referrals),
    topReferralId: stats.top_referral_id,
  };
}

export interface CategoryUsage {
  category: string;
  iconName: string | null;
  uses: number;
}

/** Desglose de usos por categoría de los referidos propios. */
export async function getMyUsesByCategory(): Promise<CategoryUsage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("referrals")
    .select("copies_count, clicks_count, categories(name, icon_name)");

  const map = new Map<string, CategoryUsage>();
  for (const r of data ?? []) {
    const cat = r.categories;
    if (!cat?.name) continue;
    const current = map.get(cat.name) ?? {
      category: cat.name,
      iconName: cat.icon_name,
      uses: 0,
    };
    current.uses += r.copies_count + r.clicks_count;
    map.set(cat.name, current);
  }

  return [...map.values()].sort((a, b) => b.uses - a.uses);
}

export interface AttentionItem {
  benefit: Pick<Benefit, "id" | "brand" | "headline">;
  reason: AttentionReason;
  message: string;
}

const ATTENTION_ORDER: AttentionReason[] = [
  "expired",
  "reported",
  "rejected",
  "expiring_soon",
  "archived",
  "pending_review",
  "no_traction",
];

export async function getNeedsAttention(): Promise<AttentionItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("my_attention_items").select("*");

  const items = (data ?? [])
    .filter((r) => r.reason)
    .map((r) => {
      const reason = r.reason as AttentionReason;
      return {
        benefit: { id: r.id!, brand: r.brand!, headline: r.title! },
        reason,
        message: attentionMessage(reason, r.expires_at),
      };
    });

  return items.sort(
    (a, b) => ATTENTION_ORDER.indexOf(a.reason) - ATTENTION_ORDER.indexOf(b.reason),
  );
}

function attentionMessage(reason: AttentionReason, expiresAt: string | null): string {
  switch (reason) {
    case "expired":
      return "Ya venció y sigue publicado";
    case "reported":
      return "Alguien reportó un problema";
    case "rejected":
      return "No pasó la revisión";
    case "expiring_soon": {
      if (!expiresAt) return "Termina pronto";
      const d = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
      if (d <= 0) return "Termina hoy";
      return `Termina en ${d} ${d === 1 ? "día" : "días"}`;
    }
    case "archived":
      return "Pausado, no aparece en Explorar";
    case "pending_review":
      return "En revisión por el equipo";
    case "no_traction":
      return "Publicado pero nadie lo ha usado";
  }
}

export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity")
    .select("id, type, referral_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((a) => ({
    id: String(a.id),
    type: a.type,
    benefitId: a.referral_id ?? undefined,
    brand:
      a.metadata && typeof a.metadata === "object" && "brand" in a.metadata
        ? String((a.metadata as { brand?: unknown }).brand ?? "")
        : undefined,
    at: a.created_at,
  }));
}

export async function getSavedBenefits(): Promise<Benefit[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_referrals")
    .select("referral_id")
    .order("created_at", { ascending: false });

  const ids = (data ?? []).map((r) => r.referral_id);
  if (ids.length === 0) return [];

  const { data: rows } = await supabase
    .from("public_referrals")
    .select(CARD_COLUMNS)
    .in("id", ids);

  return (rows ?? []).map(toBenefit);
}

/**
 * Estado de guardado y voto del usuario sobre un referido concreto.
 *
 * SIN USO desde que el detalle pasó a modal: la ficha de marca los necesita
 * todos de golpe y usa getMyInteractions(). Se conserva porque es la lectura
 * puntual obvia para cualquier vista futura de un solo referido.
 */
export async function getMyInteraction(referralId: string) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  if (!userId) return { saved: false, vote: null as boolean | null };

  const [{ data: saved }, { data: vote }] = await Promise.all([
    supabase
      .from("saved_referrals")
      .select("referral_id")
      .eq("user_id", userId)
      .eq("referral_id", referralId)
      .maybeSingle(),
    supabase
      .from("referral_votes")
      .select("is_helpful")
      .eq("user_id", userId)
      .eq("referral_id", referralId)
      .maybeSingle(),
  ]);

  return { saved: Boolean(saved), vote: vote?.is_helpful ?? null };
}

/**
 * Todo lo que el usuario en sesión ha guardado o votado, indexado por referido.
 *
 * La ficha de marca abre el detalle en un modal, sin ir al servidor: para que
 * el "¿te sirvió?" y el "guardar" salgan ya en su estado real hay que tenerlos
 * antes, no pedirlos al abrir cada modal.
 *
 * No recibe la lista de ids a propósito, aunque filtrar por ellos sería más
 * ajustado: pedirlos obligaría a esperar primero a las ofertas, y eso encadena
 * dos viajes a la base en vez de lanzarlos en paralelo. Son las filas propias
 * del usuario (el RLS no deja otra cosa), así que el volumen es trivial.
 *
 * Devuelve un Map vacío sin sesión: un anónimo no tiene nada que consultar.
 */
export async function getMyInteractions(): Promise<Map<string, MyInteraction>> {
  const result = new Map<string, MyInteraction>();

  const userId = await getCurrentUserId();
  if (!userId) return result;

  const supabase = await createClient();
  const [{ data: saved }, { data: votes }] = await Promise.all([
    supabase
      .from("saved_referrals")
      .select("referral_id")
      .eq("user_id", userId),
    supabase
      .from("referral_votes")
      .select("referral_id, is_helpful")
      .eq("user_id", userId),
  ]);

  for (const row of saved ?? []) {
    result.set(row.referral_id, { saved: true, vote: null });
  }
  for (const row of votes ?? []) {
    const prev = result.get(row.referral_id);
    result.set(row.referral_id, {
      saved: prev?.saved ?? false,
      vote: row.is_helpful,
    });
  }

  return result;
}

export async function getMyNotificationPreferences() {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return data;
}

// ---------------------------------------------------------------------------
// Moderación
// ---------------------------------------------------------------------------

export async function isStaff(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_staff");
  return data ?? false;
}

/**
 * Marcas en estado 'pending'.
 *
 * SIN USO: el flujo de aprobación previa está desactivado y una marca nueva
 * nace 'approved', así que esto devuelve vacío salvo por filas anteriores a la
 * migración 20260728000000. Se conserva como puerta de vuelta por si se
 * reactiva la moderación previa.
 */
export async function getPendingBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brands")
    .select("id, name, slug, website_url, logo_url, status")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (data ?? []).map(toBrand);
}

export interface PendingReferral {
  id: string;
  brand: string;
  title: string;
  benefitType: string;
  valueLabel: string;
  category: string;
  code: string | null;
  redeemUrl: string | null;
  isFeatured: boolean;
  verified: boolean;
  ownerName: string;
  ownerUsername: string;
  createdAt: string;
}

/**
 * La antigua cola de moderación. La policy "staff ve todos los referidos" es la
 * que permite este SELECT; a un usuario normal le devolvería solo los suyos.
 *
 * SIN USO desde la migración 20260728000000: los referidos nacen 'active'. Se
 * conserva junto a approveReferral/rejectReferral por si se reactiva el flujo.
 */
export async function getPendingReferrals(): Promise<PendingReferral[]> {
  const supabase = await createClient();
  // El embed va con el nombre de la FK: `profiles` a secas es ambiguo, porque
  // referrals llega a profiles por tres caminos (owner_id, y en muchos-a-muchos
  // vía referral_votes y saved_referrals). PostgREST se niega a adivinar.
  const { data, error } = await supabase
    .from("referrals")
    .select(
      "id, brand, title, benefit_type, value_amount, value_label, code, redeem_url, is_featured, verification_status, created_at, categories(name), profiles!referrals_owner_id_fkey(display_name, username)",
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    brand: r.brand,
    title: r.title,
    benefitType: r.benefit_type,
    valueLabel: formatValue(r.benefit_type, r.value_amount, r.value_label),
    category: r.categories?.name ?? "",
    code: r.code,
    redeemUrl: r.redeem_url,
    isFeatured: r.is_featured,
    verified: r.verification_status === "verified",
    ownerName: r.profiles?.display_name ?? "",
    ownerUsername: r.profiles?.username ?? "",
    createdAt: r.created_at,
  }));
}

// Versión mínima de formatBenefitValue() para la cola: allí no hay un Benefit
// completo, solo las tres columnas que definen el gancho.
function formatValue(
  type: string,
  amount: number | null,
  label: string | null,
): string {
  if (label) return label;
  if (amount === null) return type === "free_shipping" ? "Envío gratis" : "2x1";
  switch (type) {
    case "discount":
      return `${amount}% OFF`;
    case "cashback":
      return `${amount}% de cashback`;
    case "free_months":
      return `${amount} ${amount === 1 ? "mes" : "meses"} gratis`;
    case "free_trial":
      return `${amount} ${amount === 1 ? "día" : "días"} de prueba`;
    case "bonus":
      return `$${amount} de bono`;
    case "gift":
      return `Regalo de $${amount}`;
    default:
      return String(amount);
  }
}

export interface OpenReport {
  id: string;
  referralId: string;
  brand: string;
  title: string;
  reason: Enums<"report_reason">;
  details: string | null;
  status: Enums<"report_status">;
  reporterUsername: string | null;
  createdAt: string;
  notes: { id: string; note: string; createdAt: string }[];
}

export async function getOpenReports(): Promise<OpenReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, referral_id, reason, details, status, created_at, referrals(brand, title), profiles!reports_reporter_id_fkey(username), report_notes(id, note, created_at)",
    )
    .in("status", ["open", "reviewing"])
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    referralId: r.referral_id,
    brand: r.referrals?.brand ?? "",
    title: r.referrals?.title ?? "",
    reason: r.reason,
    details: r.details,
    status: r.status,
    reporterUsername: r.profiles?.username ?? null,
    createdAt: r.created_at,
    notes: (r.report_notes ?? []).map((n) => ({
      id: n.id,
      note: n.note,
      createdAt: n.created_at,
    })),
  }));
}

// ---------------------------------------------------------------------------
// Reputación (derivada, nunca almacenada)
// ---------------------------------------------------------------------------

export type TrustLevel =
  | "Nuevo en la comunidad"
  | "Colaborador"
  | "Confiable"
  | "Referente";

export interface TrustSignals {
  level: TrustLevel;
  /** Progreso hacia el siguiente nivel, 0-100. */
  progress: number;
  publicados: number;
  verificados: number;
  activos: number;
  /** % de sus publicaciones que siguen activas. */
  vigencia: number;
  mesesEnLaComunidad: number;
}

/**
 * Reputación derivada de señales reales (cuánto publica, cuánto se verifica,
 * cuánto mantiene al día), no de una cifra inventada. Es lo que sustituye a las
 * "ganancias" como medida de estatus en la comunidad.
 */
export function computeTrustSignals(
  stats: {
    publicados: number;
    verificados: number;
    activos: number;
  },
  joinedAt: string,
  now: Date = new Date(),
): TrustSignals {
  const { publicados, verificados, activos } = stats;
  const vigencia = publicados ? Math.round((activos / publicados) * 100) : 0;

  const mesesEnLaComunidad = Math.max(
    0,
    Math.round((now.getTime() - new Date(joinedAt).getTime()) / (30 * 86_400_000)),
  );

  // Publicar suma, que te verifiquen suma más, mantener al día suma, y la
  // antigüedad pesa poco: llevar años sin aportar no es reputación.
  const score =
    publicados * 4 +
    verificados * 12 +
    vigencia * 0.4 +
    Math.min(mesesEnLaComunidad, 12) * 2;

  const level: TrustLevel =
    score >= 100
      ? "Referente"
      : score >= 60
        ? "Confiable"
        : score >= 25
          ? "Colaborador"
          : "Nuevo en la comunidad";

  const NEXT: Record<TrustLevel, number> = {
    "Nuevo en la comunidad": 25,
    Colaborador: 60,
    Confiable: 100,
    Referente: 100,
  };
  const progress =
    level === "Referente" ? 100 : Math.round((score / NEXT[level]) * 100);

  return {
    level,
    progress: Math.min(100, Math.max(0, progress)),
    publicados,
    verificados,
    activos,
    vigencia,
    mesesEnLaComunidad,
  };
}

/**
 * Rutas públicas indexables para sitemap.xml: marcas con al menos una oferta
 * activa y perfiles con algo publicado. Un perfil vacío es contenido pobre y
 * no aporta nada al índice.
 */
export async function getSitemapEntries(): Promise<{
  brands: { slug: string; lastModified?: string }[];
  profiles: { username: string }[];
}> {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");

  const supabase = createPublicClient();
  const [brands, profiles] = await Promise.all([
    supabase
      .from("public_brands")
      .select("slug, last_published_at")
      .gt("offers_count", 0),
    supabase
      .from("public_profiles")
      .select("username")
      .gt("active_referrals", 0),
  ]);

  if (brands.error) throw brands.error;
  if (profiles.error) throw profiles.error;

  return {
    brands: (brands.data ?? []).flatMap((b) =>
      b.slug ? [{ slug: b.slug, lastModified: b.last_published_at ?? undefined }] : [],
    ),
    profiles: (profiles.data ?? []).flatMap((p) =>
      p.username ? [{ username: p.username }] : [],
    ),
  };
}
