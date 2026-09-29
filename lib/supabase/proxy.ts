import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { hasEnvVars } from "../utils";

const BRAND_PATH = /^\/marca\/([^/]+)\/?$/;
const PROFILE_PATH = /^\/u\/([^/]+)\/?$/;

/**
 * ¿Existe la entidad de una ruta pública con parámetro?
 *
 * Tiene que decidirse aquí y no en la página: /marca/[slug] y /u/[username]
 * son PPR, así que el shell estático (y con él el status 200) sale antes de
 * que la página llegue a llamar a notFound(). Devuelve null si la ruta no es
 * de las que se comprueban.
 *
 * Marca: mismo criterio que getBrandBySlug — public_brands agrupa también los
 * referidos anteriores a la tabla brands, y una marca recién creada sin ofertas
 * solo está en brands.
 */
async function entityExists(
  supabase: SupabaseClient<Database>,
  pathname: string,
): Promise<boolean | null> {
  const brand = BRAND_PATH.exec(pathname);
  if (brand) {
    const slug = decodeURIComponent(brand[1]);
    const [agg, bare] = await Promise.all([
      supabase.from("public_brands").select("slug").eq("slug", slug).limit(1),
      supabase.from("brands").select("slug").eq("slug", slug).limit(1),
    ]);
    // Ante un error de la base se deja pasar: mejor la página que un 404 falso.
    if (agg.error || bare.error) return true;
    return (agg.data?.length ?? 0) + (bare.data?.length ?? 0) > 0;
  }

  const profile = PROFILE_PATH.exec(pathname);
  if (profile) {
    const username = decodeURIComponent(profile[1]);
    const { data, error } = await supabase
      .from("public_profiles")
      .select("username")
      .eq("username", username)
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

  // Allowlist de rutas públicas. Es deny-by-default: lo que no esté aquí exige
  // sesión. `/marca/` y `/u/` son las dos caras del catálogo público — se
  // comparten y se indexan, así que no pueden pedir login.
  if (
    request.nextUrl.pathname !== "/" &&
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/u/") &&
    !request.nextUrl.pathname.startsWith("/marca/") &&
    request.nextUrl.pathname !== "/sitemap.xml" &&
    request.nextUrl.pathname !== "/robots.txt" &&
    // Solo redirige a /marca/[slug], que es público. Pedir sesión aquí mandaría
    // a login a quien abre un enlace viejo ya compartido, en vez de llevarlo a
    // la oferta.
    !request.nextUrl.pathname.startsWith("/app/referido/")
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
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
