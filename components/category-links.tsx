import Link from "next/link";
import { categoryIcon } from "@/lib/category-icons";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Enlaces a las páginas de categoría. Son <a> reales a propósito: es lo que
 * sigue un crawler para llegar a /categoria/[slug] y, desde ahí, a las marcas.
 * Las categorías sin ofertas activas no se enlazan (su página sería un vacío).
 */
export function CategoryLinks({
  categories,
  currentSlug,
  className,
}: {
  categories: Category[];
  currentSlug?: string;
  className?: string;
}) {
  const withOffers = categories.filter((c) => c.count > 0);
  if (withOffers.length === 0) return null;

  return (
    <ul className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2", className)}>
      {withOffers.map((c) => {
        const Icon = categoryIcon(c.iconName);
        const current = c.slug === currentSlug;
        return (
          <li key={c.slug}>
            <Link
              href={`/categoria/${c.slug}`}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors duration-150 ease-brand",
                current
                  ? "border-ink bg-ink text-bone"
                  : "border-line bg-paper text-slate-700 hover:border-olive-300 hover:text-ink",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{c.name}</span>
              </span>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  current ? "text-slate-300" : "text-slate-400",
                )}
              >
                {c.count}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
