import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { hasEnvVars } from "../utils";

const BRAND_PATH = /^\/marca\/([^/]+)\/?$/;
const PROFILE_PATH = /^\/u\/([^/]+)\/?$/;
const CATEGORY_PATH = /^\/categoria\/([^/]+)\/?$/;

/**
 * Lo único que exige sesión: /app/* (publicar, dashboard, perfil, moderación).
 * Todo lo demás es público. /app/referido/* queda fuera porque solo redirige a
 * la ficha pública de la marca (enlaces antiguos ya compartidos).
 */
function requiresSession(pathname: string): boolean {
  return (
    (pathname === "/app" || pathname.startsWith("/app/")) &&
    !pathname.startsWith("/app/referido/")
  );
}

/**
 * ¿Existe la entidad de una ruta pública con parámetro?
 *
 * Tiene que decidirse aquí y no en la página: /marca/[slug] y /u/[username]
 * son PPR, así que el shell estático (y con él el status 200) sale antes de
 * que la página llegue a llamar a notFound(). Devuelve null si la ruta no es
 * de las que se comprueban.
 *
 * Marca: mismo criterio que getBrandBySlug — existe si está en `brands` (aunque
 * no tenga ofertas) o si algún referido activo lleva ese brand_slug (los
 * anteriores a la tabla brands no tienen FK).
 *
 * Corre en CADA visita a estas rutas, también cuando la página sale estática de
 * la caché, así que solo consulta columnas indexadas: brands.slug (único),
 * referrals_brand_slug_idx (parcial sobre activos) y profiles.username
 * (único). Nada de public_brands / public_profiles, que agregan.
 *
 * Categoría: existe si está activa en `categories` (slug único). Una categoría
 * sin ofertas sí existe: su página enseña el estado vacío.
 */
async function entityExists(
  supabase: SupabaseClient<Database>,
  pathname: string,
): Promise<boolean | null> {
  const brand = BRAND_PATH.exec(pathname);
  if (brand) {
    const slug = decodeURIComponent(brand[1]);
    const [bare, legacy] = await Promise.all([
      supabase.from("brands").select("slug").eq("slug", slug).limit(1),
      supabase
        .from("referrals")
        .select("id")
        .eq("brand_slug", slug)
        .eq("status", "active")
        .limit(1),
    ]);
    // Ante un error de la base se deja pasar: mejor la página que un 404 falso.
    if (bare.error || legacy.error) return true;
    return (bare.data?.length ?? 0) + (legacy.data?.length ?? 0) > 0;
  }

  const profile = PROFILE_PATH.exec(pathname);
  if (profile) {
    const username = decodeURIComponent(profile[1]);
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .eq("status", "active")
      .limit(1);
    if (error) return true;
    return (data?.length ?? 0) > 0;
  }

  const category = CATEGORY_PATH.exec(pathname);
  if (category) {
    const slug = decodeURIComponent(category[1]);
    const { data, error } = await supabase
      .from("categories")
      .select("slug")
      .eq("slug", slug)
      .eq("is_active", true)
      .limit(1);
    if (error) return true;
    return (data?.length ?? 0) > 0;
  }

  return null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // El sitio es público salvo /app/* (ver requiresSession). Sin sesión, a
  // login; con `next` para volver a donde iba tras entrar.
  if (!user && requiresSession(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if ((await entityExists(supabase, request.nextUrl.pathname)) === false) {
    // Rewrite a una ruta que no existe: Next pinta app/not-found.tsx con 404.
    // Se copian las cookies por lo mismo que explica el bloque de abajo.
    const notFound = NextResponse.rewrite(new URL("/_not-found", request.url), {
      status: 404,
    });
    supabaseResponse.cookies.getAll().forEach((c) => notFound.cookies.set(c));
    return notFound;
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
