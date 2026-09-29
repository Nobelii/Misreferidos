"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  toBrand,
  type Brand,
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_BYTES,
} from "@/lib/types";

type Ok = { ok: true; brand: Brand };
type Err = { ok: false; error: string };
export type CreateBrandResult = Ok | Err;

const BRAND_COLUMNS = "id, name, slug, website_url, logo_url, status";

/**
 * Alta de una marca. Nace 'approved': se puede usar y su logo es público desde
 * el primer momento, sin cola de moderación. El logo se sube al bucket
 * `brand-logos` con el cliente de servidor autenticado (respeta la RLS de
 * storage) — nunca con service role.
 *
 * El logo es OBLIGATORIO: sin él no se crea la marca.
 */
export async function createBrand(
  formData: FormData,
): Promise<CreateBrandResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // --- Validación server-side (espeja la del modal, pero es la que manda) ---
  const name = String(formData.get("name") ?? "").trim();
  const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();
  const categorySlug = String(formData.get("categorySlug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const file = formData.get("logo");

  if (!name) return { ok: false, error: "El nombre de la marca es obligatorio." };
  if (name.length > 80)
    return { ok: false, error: "El nombre no puede pasar de 80 caracteres." };
  if (!/^https?:\/\/.+\..+/.test(websiteUrl))
    return { ok: false, error: "La URL debe empezar por http:// o https://" };
  if (description.length > 280)
    return { ok: false, error: "La descripción no puede pasar de 280 caracteres." };

  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Sube el logo de la marca." };
  if (!ALLOWED_LOGO_TYPES.includes(file.type as (typeof ALLOWED_LOGO_TYPES)[number]))
    return { ok: false, error: "El logo debe ser PNG, JPG, WEBP o SVG." };
  if (file.size > MAX_LOGO_BYTES)
    return { ok: false, error: "El logo pesa demasiado (máx. 2 MB)." };

  // Categoría opcional: se resuelve de slug a id.
  let categoryId: string | null = null;
  if (categorySlug) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    categoryId = category?.id ?? null;
  }

  // --- Subida del logo -------------------------------------------------------
  // La carpeta es el uid: la policy de storage solo deja escribir ahí. El nombre
  // es aleatorio para no colisionar ni filtrar el nombre del archivo original.
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("brand-logos")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError)
    return { ok: false, error: "No pudimos subir el logo. Inténtalo de nuevo." };

  const {
    data: { publicUrl },
  } = supabase.storage.from("brand-logos").getPublicUrl(path);

  // --- Alta de la marca ------------------------------------------------------
  const { data, error } = await supabase
    .from("brands")
    .insert({
      name,
      website_url: websiteUrl,
      logo_url: publicUrl,
      category_id: categoryId,
      description: description || null,
      status: "approved",
      created_by: user.id,
    })
    .select(BRAND_COLUMNS)
    .single();

  if (error) {
    // El índice único brands_name_lower_uidx impide marcas duplicadas.
    if (error.code === "23505")
      return { ok: false, error: "Esa marca ya existe. Búscala en la lista." };
    // Si el insert falla, el logo ya subido queda huérfano; lo limpiamos.
    await supabase.storage.from("brand-logos").remove([path]);
    // Trigger enforce_rate_limit (migración 20260928010000).
    if (error.message.includes("rate_limit"))
      return {
        ok: false,
        error: "Has creado varias marcas seguidas. Espera un rato e inténtalo de nuevo.",
      };
    return { ok: false, error: "No pudimos crear la marca. Inténtalo de nuevo." };
  }

  return { ok: true, brand: toBrand(data) };
}

// ===========================================================================
// Moderación de marcas (staff)
//
// El flujo de aprobación previa está desactivado: una marca nueva nace
// 'approved'. Estas actions se conservan como herramienta *a posteriori* — el
// staff puede marcar una marca como 'rejected' para retirarla — y como puerta
// de vuelta si algún día se reactiva la moderación previa.
//
// El rol NO se comprueba aquí: lo impone la policy "staff modera marcas" del
// UPDATE de `brands`. Si un usuario normal llamara a approveBrand(), la base
// rechazaría el UPDATE.
// ===========================================================================

type ActionResult = { ok: true; id: string } | { ok: false; error: string };

async function setBrandStatus(
  brandId: string,
  status: "approved" | "rejected",
  action: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El slug hace falta para invalidar la caché de su ficha.
  const { data: brand } = await supabase
    .from("brands")
    .select("slug")
    .eq("id", brandId)
    .maybeSingle();

  const { error } = await supabase
    .from("brands")
    .update({ status })
    .eq("id", brandId);

  if (error)
    return {
      ok: false,
      error: status === "approved" ? "No se pudo aprobar." : "No se pudo rechazar.",
    };

  // Traza de moderación, igual que approveReferral() en lib/actions.ts.
  await supabase.from("audit_log").insert({
    actor_id: user?.id ?? null,
    action,
    entity: "brand",
    entity_id: brandId,
    diff: { status },
  });

  // El catálogo (home, Explorar) y la ficha de la marca están cacheados por
  // horas: sin invalidar sus tags el cambio no se vería. Ver los tags en
  // lib/queries.ts.
  updateTag("catalog");
  if (brand?.slug) {
    updateTag(`brand:${brand.slug}`);
    revalidatePath(`/marca/${brand.slug}`);
  }
  revalidatePath("/app/moderacion");
  revalidatePath("/app/explorar");
  revalidatePath("/app");
  revalidatePath("/");
  return { ok: true, id: brandId };
}

export async function approveBrand(brandId: string): Promise<ActionResult> {
  return setBrandStatus(brandId, "approved", "brand.approve");
}

export async function rejectBrand(brandId: string): Promise<ActionResult> {
  return setBrandStatus(brandId, "rejected", "brand.reject");
}
