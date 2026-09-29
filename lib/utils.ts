import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Destino interno seguro para el `?next=` de los flujos de auth.
 *
 * Sin esto, /auth/callback?next=https://evil.com (o `//evil.com`, que el
 * navegador lee como URL absoluta) es un open redirect: el enlace sale de
 * nuestro dominio, pasa el login real y deja a la víctima en una copia falsa.
 * Solo se aceptan rutas relativas al propio sitio.
 */
export function safeNextPath(next: string | null, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
