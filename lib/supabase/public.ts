import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Cliente sin cookies, para leer datos públicos que se pueden cachear.
 *
 * El cliente de `server.ts` lee cookies(), y cualquier cosa que toque cookies
 * es request-scoped: no puede vivir dentro de un `"use cache"`. Este no tiene
 * sesión, así que consulta como `anon` y el RLS le muestra exactamente lo que
 * vería un visitante sin cuenta — que es justo lo que queremos cachear.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
}
