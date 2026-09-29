"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ALL_CATEGORIES_ICON, categoryIcon } from "@/lib/category-icons";
import { ALL_CATEGORIES, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Panel de categorías, en dos modos:
 * - Filtro (con `value` + `onChange`): así lo usa Explorar, filtra el grid.
 * - Enlaces (sin `onChange`): así lo usa la home. Cada categoría enlaza a su
 *   página /categoria/[slug] y "Todas" a /explorar. Antes aquí tenía estado
 *   propio y no filtraba nada; como enlaces además reparte enlazado interno.
 *
 * Las categorías vienen de la base; "Todas" es un sentinela del cliente y no
 * existe como fila.
 */
export function FilterPanel({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value?: string;
  onChange?: (category: string) => void;
}) {
  const active = value ?? ALL_CATEGORIES;
  const total = categories.reduce((sum, c) => sum + c.count, 0);

  const entries = [
    { name: ALL_CATEGORIES, href: "/explorar", icon: ALL_CATEGORIES_ICON, count: total },
    ...categories.map((c) => ({
      name: c.name,
      href: `/categoria/${c.slug}`,
      icon: categoryIcon(c.iconName),
      count: c.count,
    })),
  ];

  return (
    <aside className="shrink-0 lg:w-64 self-start sticky top-24">
      <Card className="h-full p-5 bg-paper border-line shadow-xs">
        <h4 className="font-nav text-xs font-semibold uppercase tracking-widest text-olive-700 mb-4">
          Categoría
        </h4>

        <ul className="space-y-0.5">
          {entries.map((cat) => {
            const isActive = onChange ? active === cat.name : false;
            const Icon = cat.icon;
            const className = cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 ease-brand",
              isActive
                ? "bg-ink text-bone font-medium"
                : "text-slate-600 hover:bg-olive-50 hover:text-ink",
            );
            const content = (
              <>
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{cat.name}</span>
                </span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    isActive ? "text-slate-300" : "text-slate-400",
                  )}
                >
                  {cat.count}
                </span>
              </>
            );

            return (
              <li key={cat.name}>
                {onChange ? (
                  <button
                    type="button"
                    onClick={() => onChange(cat.name)}
                    aria-pressed={isActive}
                    className={className}
                  >
                    {content}
                  </button>
                ) : (
                  <Link href={cat.href} className={className}>
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </aside>
  );
}
