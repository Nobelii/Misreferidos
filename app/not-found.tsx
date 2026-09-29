import { Suspense } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { ErrorTicket } from "@/components/error-ticket";
import { Button } from "@/components/ui/button";
import { getBrands } from "@/lib/queries";

export const metadata = {
  title: "Página no encontrada | MisReferidos",
  robots: { index: false, follow: true },
};

/**
 * Salidas útiles en vez de un callejón sin salida: las marcas más usadas. Va
 * en su propio Suspense con fallback vacío y a prueba de fallos: si la base no
 * responde, el 404 se pinta igual, solo sin la lista.
 */
async function PopularBrands() {
  const brands = await getBrands(8).catch(() => []);
  if (brands.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
        Marcas populares
      </h2>
      <ul className="flex flex-wrap justify-center gap-2">
        {brands.map((b) => (
          <li key={b.slug}>
            <Link
              href={`/marca/${b.slug}`}
              className="inline-block rounded-full border border-line bg-paper px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-olive-300 hover:text-ink"
            >
              {b.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function NotFound() {
  return (
    <PublicShell className="max-w-2xl items-center justify-center gap-10 py-16">
      <ErrorTicket code="404" label="No encontrado" />

      <div className="space-y-3 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Este cupón no existe
        </h1>
        <p className="mx-auto max-w-md text-muted-foreground">
          Puede que la marca o el perfil ya no esté, que el enlace esté mal escrito
          o que la página se haya movido. Busca la marca que querías:
        </p>
      </div>

      {/* Formulario GET normal: funciona aunque no cargue el JS. */}
      <form action="/explorar" role="search" className="w-full max-w-md">
        <label className="flex items-center gap-2.5 rounded-full border border-line bg-paper px-4 py-2.5 text-slate-400 focus-within:border-olive-400 focus-within:ring-2 focus-within:ring-olive-400/40">
          <Search className="h-4 w-4 shrink-0" />
          <input
            type="search"
            name="q"
            placeholder="Busca una marca…"
            aria-label="Buscar una marca"
            className="flex-1 bg-transparent text-sm text-slate-700 outline-hidden placeholder:text-slate-400"
          />
        </label>
      </form>

      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/">Ir al inicio</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/explorar">Explorar marcas</Link>
        </Button>
      </div>

      <Suspense fallback={null}>
        <PopularBrands />
      </Suspense>
    </PublicShell>
  );
}
