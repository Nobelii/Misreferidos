"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ALL_CATEGORIES_ICON, categoryIcon } from "@/lib/category-icons";
import { ALL_CATEGORIES, type Category } from "@/lib/types";

/**
 * Panel de categorías. Es controlado cuando recibe `value` + `onChange` (así lo
 * usa Explorar, donde debe filtrar de verdad el grid) y cae a estado propio
 * cuando no los recibe.
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
  const [internal, setInternal] = useState<string>(ALL_CATEGORIES);
  const active = value ?? internal;
  const select = onChange ?? setInternal;

  const total = categories.reduce((sum, c) => sum + c.count, 0);

  const entries = [
    { name: ALL_CATEGORIES, icon: ALL_CATEGORIES_ICON, count: total },
    ...categories.map((c) => ({
      name: c.name,
      icon: categoryIcon(c.iconName),
      count: c.count,
    })),
  ];

  return (
    <aside className="shrink-0 lg:w-64 self-start sticky top-24">
      <Card className="h-full p-5 bg-paper border-line shadow-sm">
        <h4 className="font-nav text-xs font-semibold uppercase tracking-widest text-olive-700 mb-4">
          Categoría
        </h4>

        <ul className="space-y-0.5">
          {entries.map((cat) => {
            const isActive = active === cat.name;
            const Icon = cat.icon;
            return (
              <li key={cat.name}>
                <button
                  type="button"
                  onClick={() => select(cat.name)}
                  aria-pressed={isActive}
                  className={`
                    w-full flex items-center justify-between
                    px-3 py-2 rounded-lg text-sm
                    transition-colors duration-150 ease-brand
                    ${
                      isActive
                        ? "bg-ink text-bone font-medium"
                        : "text-slate-600 hover:bg-olive-50 hover:text-ink"
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{cat.name}</span>
                  </span>
                  <span
                    className={`
                      text-xs tabular-nums
                      ${isActive ? "text-slate-300" : "text-slate-400"}
                    `}
                  >
                    {cat.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </aside>
  );
}
