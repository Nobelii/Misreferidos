"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Json } from "@/lib/database.types";

export interface PublishInput {
  brand: string;
  /** FK a la marca seleccionada/creada. Puede venir vacío en llamadas legadas. */
  brandId: string;
  benefitType: Enums<"benefit_type">;
  value: string;
  title: string;
  code: string;
  redeemUrl: string;
  categorySlug: string;
  description: string;
  conditions: string[];
  expiresAt: string;
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Alta de un referido. Nace 'active': se publica al instante, sin cola de
 * moderación. published_at lo sella el trigger set_published_at en el INSERT
 * (lo exige el CHECK published_consistency).
 *
 * Las validaciones del formulario espejan los CHECK de la tabla (code_or_url,
 * value_required, redeem_url_fmt). Aquí no se revalidan a mano a propósito: si
 * algo se cuela, la base lo rechaza, y ese es el punto de tenerlos en la base.
 */
export async function publishReferral(input: PublishInput): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", input.categorySlug)
    .single();

  if (!category) return { ok: false, error: "Esa categoría no existe." };

  const conditions = input.conditions.map((c) => c.trim()).filter(Boolean);

  const { data, error } = await supabase
    .from("referrals")
    .insert({
      owner_id: user.id,
      category_id: category.id,
      // Se guardan ambos: brand_id (relación con la marca moderada) y brand
      // (nombre denormalizado) para no romper la búsqueda por texto ni la vista.
      brand_id: input.brandId || null,
      brand: input.brand.trim(),
      title: input.title.trim(),
      benefit_type: input.benefitType,
      value_amount: input.value.trim() ? Number(input.value) : null,
      code: input.code.trim() || null,
      redeem_url: input.redeemUrl.trim() || null,
      description: input.description.trim() || null,
      terms: conditions.length > 0 ? conditions : null,
      expires_at: input.expiresAt || null,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    // Los CHECK de la tabla llegan aquí como errores de Postgres. Traducimos los
    // que el usuario puede corregir; el resto sale como fallo genérico.
    if (error.message.includes("code_or_url"))
      return { ok: false, error: "Hace falta un código o un enlace." };
    if (error.message.includes("value_required"))
      return { ok: false, error: "Este tipo de beneficio necesita un valor." };
    if (error.message.includes("redeem_url_fmt"))
      return { ok: false, error: "El enlace debe empezar por http:// o https://" };
    if (error.message.includes("title_len"))
      return { ok: false, error: "El título debe tener entre 5 y 120 caracteres." };
    return { ok: false, error: "No pudimos publicarlo. Inténtalo de nuevo." };
  }

  // Ya es público desde este mismo instante, así que hay que refrescar también
  // las vistas que lo listan, no solo el dashboard del autor. El catálogo y la
  // ficha de marca están cacheados por horas: sin invalidar sus tags, el
  // referido no aparecería hasta que caducara la entrada.
  revalidatePath("/app/dashboard");
  revalidatePublisher(user.id);
  await revalidateCatalogAndBrandOf(data.id);
  return { ok: true, id: data.id };
}

/**
 * Registra una vista, una copia de código o un clic en el enlace.
 *
 * El contador de `referrals` lo sube un trigger, no esta función: así el número
 * no depende de que el cliente se acuerde de incrementarlo, y el índice único
 * de dedupe evita que refrescar la página infle las vistas.
 */
export async function trackEvent(
  referralId: string,
  kind: Enums<"event_kind">,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("referral_events").insert({
    referral_id: referralId,
    actor_id: user?.id ?? null,
    kind,
  });
}

export async function toggleSave(referralId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: existing } = await supabase
    .from("saved_referrals")
    .select("referral_id")
    .eq("user_id", user.id)
    .eq("referral_id", referralId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("saved_referrals")
      .delete()
      .eq("user_id", user.id)
      .eq("referral_id", referralId);
    revalidatePath("/app/dashboard");
    return false;
  }

  await supabase
    .from("saved_referrals")
    .insert({ user_id: user.id, referral_id: referralId });
  revalidatePath("/app/dashboard");
  return true;
}

export async function updateMyProfile(input: {
  displayName: string;
  username: string;
  bio: string;
  location: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // El username anterior también hay que invalidarlo: si cambia de @luis a
  // @luisf, la entrada cacheada de @luis quedaría sirviendo un perfil que ya no
  // existe con ese nombre.
  const { data: previous } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName.trim(),
      username: input.username.trim().toLowerCase(),
      bio: input.bio.trim() || null,
      location: input.location.trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "Ese nombre de usuario ya está tomado." };
    if (error.message.includes("username_format"))
      return {
        ok: false,
        error: "Solo minúsculas, números, guion bajo y punto (3-30 caracteres).",
      };
    return { ok: false, error: "No pudimos guardar los cambios." };
  }

  // updateTag y no revalidateTag: dentro de una Server Action da semántica
  // read-your-own-writes, así que quien acaba de editar su perfil lo ve
  // actualizado de inmediato en vez de esperar a la revalidación.
  const nextUsername = input.username.trim().toLowerCase();
  updateTag(`profile:${nextUsername}`);
  if (previous && previous.username !== nextUsername) {
    updateTag(`profile:${previous.username}`);
  }
  revalidatePath("/app/perfil");
  return { ok: true, id: user.id };
}

// ---------------------------------------------------------------------------
// Interacciones de usuario
// ---------------------------------------------------------------------------

/**
 * Los dos tags de caché del catálogo público (ver lib/queries.ts):
 *   - `catalog`      → getBrands, getCategories, getHomeStats. Alimenta la home
 *                      y Explorar, que son idénticas para todo el mundo.
 *   - `brand:<slug>` → getBrandBySlug + getOffersByBrand, o sea cabecera y
 *                      listado de una ficha de marca.
 *
 * Todo eso vive con cacheLife("hours"), así que sin invalidar explícitamente un
 * referido recién publicado tardaría en aparecer. Se usa updateTag y no
 * revalidateTag porque dentro de una Server Action da read-your-own-writes:
 * quien publica lo ve al instante en vez de esperar a la revalidación.
 */
function revalidateCatalog(): void {
  updateTag("catalog");
  revalidatePath("/");
  revalidatePath("/app");
  revalidatePath("/app/explorar");
}

/**
 * El perfil público del autor (/u/[username]) lista sus referidos, también
 * cacheados. Se invalida cuando publica, pausa o borra alguno.
 */
function revalidatePublisher(ownerId: string): void {
  updateTag(`publisher:${ownerId}`);
}

/** Invalida solo una ficha de marca. */
function revalidateBrandSlug(slug: string | null): void {
  if (!slug) return;

  updateTag(`brand:${slug}`);
  revalidatePath(`/marca/${slug}`);
}

/**
 * El slug de marca de un referido.
 *
 * Lee de la tabla `referrals` y no de la vista `public_referrals` a propósito:
 * la vista solo trae los activos, así que al pausar uno no se podría averiguar
 * qué ficha hay que refrescar. El RLS sigue mandando — cualquiera ve los
 * activos, y los pausados solo su autor, que es justo quien los pausa.
 */
async function brandSlugOf(referralId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("referrals")
    .select("brand_slug")
    .eq("id", referralId)
    .maybeSingle();

  return data?.brand_slug ?? null;
}

/**
 * Invalida la ficha de marca de un referido. Sustituye a los
 * `revalidatePath("/app/referido/<id>")` de antes: esa ruta ya solo redirige,
 * así que revalidarla no refrescaba nada.
 *
 * NO toca el catálogo, y es deliberado: votar "¿te sirvió?" cambia el contador
 * de la cabecera de la marca, pero no la card del directorio. Si esto tirase
 * también de `catalog`, un solo voto vaciaría la caché de la home y de Explorar
 * — justo lo que la caché existe para evitar.
 *
 * El slug se busca aquí y no se recibe por parámetro para que la action siga
 * siendo autónoma: quien la llame no tiene que saber de rutas.
 */
async function revalidateBrandOf(referralId: string): Promise<void> {
  revalidateBrandSlug(await brandSlugOf(referralId));
}

/**
 * Para lo que sí cambia el directorio: publicar, pausar, borrar, retirar o
 * verificar. Todo eso mueve el nº de ofertas, los usos o el sello de verificada
 * que enseña la card de marca.
 */
async function revalidateCatalogAndBrandOf(referralId: string): Promise<void> {
  revalidateCatalog();
  await revalidateBrandOf(referralId);
}

/** "¿Te sirvió?". Un voto por persona; volver a votar lo mismo lo retira. */
export async function voteHelpful(
  referralId: string,
  isHelpful: boolean,
): Promise<boolean | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: existing } = await supabase
    .from("referral_votes")
    .select("is_helpful")
    .eq("user_id", user.id)
    .eq("referral_id", referralId)
    .maybeSingle();

  if (existing?.is_helpful === isHelpful) {
    await supabase
      .from("referral_votes")
      .delete()
      .eq("user_id", user.id)
      .eq("referral_id", referralId);
    await revalidateBrandOf(referralId);
    return null;
  }

  await supabase
    .from("referral_votes")
    .upsert({ user_id: user.id, referral_id: referralId, is_helpful: isHelpful });

  await revalidateBrandOf(referralId);
  return isHelpful;
}

export async function reportReferral(
  referralId: string,
  reason: Enums<"report_reason">,
  details: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data, error } = await supabase
    .from("reports")
    .insert({
      referral_id: referralId,
      reporter_id: user.id,
      reason,
      details: details.trim() || null,
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    // El índice reports_one_open_per_user_idx impide reportar dos veces el
    // mismo referido mientras el primer reporte siga abierto.
    if (error.code === "23505")
      return { ok: false, error: "Ya reportaste este referido. Lo estamos revisando." };
    return { ok: false, error: "No pudimos enviar el reporte." };
  }

  await revalidateBrandOf(referralId);
  return { ok: true, id: data.id };
}

export async function updateNotificationPreferences(prefs: {
  notifyUses: boolean;
  notifyVerification: boolean;
  notifyExpiration: boolean;
  notifyNews: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("notification_preferences")
    .update({
      notify_uses: prefs.notifyUses,
      notify_verification: prefs.notifyVerification,
      notify_expiration: prefs.notifyExpiration,
      notify_news: prefs.notifyNews,
    })
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "No pudimos guardar tus preferencias." };

  revalidatePath("/app/perfil");
  return { ok: true, id: user.id };
}

// ---------------------------------------------------------------------------
// Gestión de los referidos propios
// ---------------------------------------------------------------------------

/**
 * Pausar / reactivar. Sin cola de moderación, reactivar devuelve el referido
 * directamente a 'active': guard_referral_moderation ya admite ese estado para
 * el autor. Sigue bloqueándole 'rejected' y 'expired' (staff y cron).
 */
export async function setMyReferralStatus(
  referralId: string,
  status: "archived" | "active",
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("referrals")
    .update({ status })
    .eq("id", referralId)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: "No pudimos cambiar el estado." };

  // Pausar lo saca de Explorar y reactivar lo devuelve, sin pasos intermedios.
  revalidatePath("/app/dashboard");
  revalidatePublisher(user.id);
  await revalidateCatalogAndBrandOf(referralId);
  return { ok: true, id: referralId };
}

export async function deleteReferral(referralId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // El slug se lee ANTES de borrar: después la fila ya no existe y no habría
  // forma de saber qué ficha de marca refrescar.
  const slug = await brandSlugOf(referralId);

  const { error } = await supabase
    .from("referrals")
    .delete()
    .eq("id", referralId)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: "No pudimos eliminarlo." };

  revalidatePath("/app/dashboard");
  revalidatePublisher(user.id);
  revalidateCatalog();
  revalidateBrandSlug(slug);
  return { ok: true, id: referralId };
}

// ---------------------------------------------------------------------------
// Moderación
//
// Estas actions no comprueban el rol: lo hacen las policies de staff y el
// trigger guard_referral_moderation. Si un usuario normal llamara a
// approveReferral(), la base rechazaría el UPDATE. La comprobación de
// isStaff() en la UI es para no enseñar botones inútiles, no es la seguridad.
// ---------------------------------------------------------------------------

async function audit(
  action: string,
  entity: string,
  entityId: string,
  diff?: Json,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("audit_log").insert({
    actor_id: user?.id ?? null,
    action,
    entity,
    entity_id: entityId,
    diff: diff ?? null,
  });
}

function moderationError(message: string): ActionResult {
  return { ok: false, error: message };
}

/**
 * Aprobar / rechazar un referido.
 *
 * Sin consumidor en la UI desde la migración 20260728000000: ya no hay cola de
 * aprobación previa. rejectReferral sigue siendo la vía para retirar un
 * referido reportado, y approveReferral la de restaurarlo. Se conservan ambas.
 */
export async function approveReferral(referralId: string): Promise<ActionResult> {
  const supabase = await createClient();
  // published_at lo sella el trigger set_published_at al pasar a 'active'.
  const { error } = await supabase
    .from("referrals")
    .update({ status: "active" })
    .eq("id", referralId);

  if (error) return moderationError("No se pudo aprobar.");

  await audit("referral.approve", "referral", referralId);
  revalidatePath("/app/moderacion");
  await revalidateCatalogAndBrandOf(referralId);
  return { ok: true, id: referralId };
}

export async function rejectReferral(referralId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("referrals")
    .update({ status: "rejected" })
    .eq("id", referralId);

  if (error) return moderationError("No se pudo rechazar.");

  await audit("referral.reject", "referral", referralId);
  revalidatePath("/app/moderacion");
  // Rechazar lo retira del catálogo, así que hay que sacarlo de la caché.
  await revalidateCatalogAndBrandOf(referralId);
  return { ok: true, id: referralId };
}

export async function setVerification(
  referralId: string,
  status: Enums<"verification_status">,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("referrals")
    .update({ verification_status: status })
    .eq("id", referralId);

  if (error) return moderationError("No se pudo cambiar la verificación.");

  await audit("referral.verify", "referral", referralId, { verification_status: status });
  revalidatePath("/app/moderacion");
  await revalidateCatalogAndBrandOf(referralId);
  return { ok: true, id: referralId };
}

export async function toggleFeatured(
  referralId: string,
  featured: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("referrals")
    .update({ is_featured: featured })
    .eq("id", referralId);

  if (error) return moderationError("No se pudo destacar.");

  await audit("referral.feature", "referral", referralId, { is_featured: featured });
  revalidatePath("/app/moderacion");
  await revalidateBrandOf(referralId);
  return { ok: true, id: referralId };
}

export async function resolveReport(
  reportId: string,
  status: "resolved" | "dismissed",
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El CHECK resolved_consistency exige resolved_at cuando el estado es
  // resolved o dismissed, así que va en el mismo UPDATE.
  const { error } = await supabase
    .from("reports")
    .update({
      status,
      moderator_id: user?.id ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) return moderationError("No se pudo resolver el reporte.");

  await audit("report.resolve", "report", reportId, { status });
  revalidatePath("/app/moderacion");
  return { ok: true, id: reportId };
}

/** Las notas viven en report_notes, invisibles para quien reportó. */
export async function addReportNote(
  reportId: string,
  note: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("report_notes")
    .insert({ report_id: reportId, author_id: user.id, note: note.trim() });

  if (error) return moderationError("No se pudo guardar la nota.");

  revalidatePath("/app/moderacion");
  return { ok: true, id: reportId };
}
