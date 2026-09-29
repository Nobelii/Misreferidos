import Link from "next/link";
import type { BrandSummary } from "@/lib/types";

/** Primera letra para agrupar: sin tildes, y todo lo no alfabético bajo "#". */
function initial(name: string): string {
  const c = name.normalize("NFD").replace(/\p{Diacritic}/gu, "").charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

/**
 * Todas las marcas del directorio, de la A a la Z, como enlaces simples.
 *
 * Existe por el enlazado interno: el grid de Explorar pagina el render (24 y
 * "Ver más" en el cliente), así que sin esto las marcas menos usadas no
 * recibirían ningún enlace HTML y Google solo las conocería por el sitemap.
 * Es texto plano en un Server Component: cuesta poco aunque haya cientos.
 */
export function BrandIndex({ brands }: { brands: BrandSummary[] }) {
  if (brands.length === 0) return null;

  const groups = new Map<string, BrandSummary[]>();
  for (const b of [...brands].sort((a, b) => a.name.localeCompare(b.name, "es"))) {
    const key = initial(b.name);
    const list = groups.get(key);
    if (list) list.push(b);
    else groups.set(key, [b]);
  }
  const letters = [...groups.keys()].sort((a, b) =>
    a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b),
  );

  return (
    <div className="space-y-6">
      <nav aria-label="Letras" className="flex flex-wrap gap-1">
        {letters.map((l) => (
          <a
            key={l}
            href={`#marcas-${l}`}
            className="flex h-8 min-w-8 items-center justify-center rounded-md border border-line bg-paper px-2 text-xs font-semibold text-slate-600 hover:border-olive-300 hover:text-ink"
          >
            {l}
          </a>
        ))}
      </nav>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-6">
        {letters.map((l) => (
          <section key={l} id={`marcas-${l}`} className="scroll-mt-24">
            <h3 className="font-display text-lg font-semibold text-ink">{l}</h3>
            <ul className="mt-1 space-y-1">
              {groups.get(l)!.map((b) => (
                <li key={b.slug}>
                  <Link
                    href={`/marca/${b.slug}`}
                    className="text-sm text-slate-600 hover:text-olive-700 hover:underline"
                  >
                    {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
