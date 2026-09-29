"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandCard } from "@/components/brand-card";
import { FilterPanel } from "@/components/filter-panel";
import { BENEFIT_TYPE_META, BENEFIT_TYPE_ORDER } from "@/lib/benefit-format";
import {
  ALL_CATEGORIES,
  type BenefitType,
  type BrandSummary,
  type Category,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { EXPLORE_SEARCH_EVENT } from "@/lib/explore-search";

type SortKey = "populares" | "nuevas" | "mejor";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "populares", label: "Populares" },
  { key: "nuevas", label: "Nuevas" },
  { key: "mejor", label: "Mejor beneficio" },
];

const DEFAULTS = {
  query: "",
  category: ALL_CATEGORIES,
  types: [] as BenefitType[],
  sort: "populares" as SortKey,
  verifiedOnly: false,
};

const PAGE_SIZE = 24;

/** Minúsculas y sin tildes: "Café" y "cafe" tienen que encontrarse. */
function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Explorar es un directorio de MARCAS, no de ofertas sueltas: una card por
 * marca, con su mejor oferta como gancho. El detalle vive un nivel más abajo,
 * en /marca/[slug].
 *
 * Los filtros de categoría y tipo se aplican sobre la mejor oferta de cada
 * marca (`bestCategory` / `bestType`), que es la que la card enseña. Filtrar
 * por la mejor y enseñar la mejor es coherente; mirar todas las ofertas de la
 * marca haría que un filtro devolviese cards cuyo gancho no lo cumple.
 *
 * Todo el filtrado es en memoria: el catálogo entero ya viene en la primera
 * carga (cacheado como estático) y son pocas marcas, así que reordenar es
 * instantáneo. Lo que sí se pagina es el render, para que el DOM no crezca con
 * el catálogo. Si el directorio pasa de un par de miles de marcas, toca mover
 * el filtro al servidor (hay índice trigram en brands.name).
 */
export function ExploreClient({
  brands,
  categories,
}: {
  brands: BrandSummary[];
  categories: Category[];
}) {
  const [query, setQuery] = useState(DEFAULTS.query);
  const [category, setCategory] = useState(DEFAULTS.category);
  const [types, setTypes] = useState<BenefitType[]>(DEFAULTS.types);
  const [sort, setSort] = useState<SortKey>(DEFAULTS.sort);
  const [verifiedOnly, setVerifiedOnly] = useState(DEFAULTS.verifiedOnly);
  const [visible, setVisible] = useState(PAGE_SIZE);

  // La búsqueda que llega del navbar (/explorar?q=...). Se lee de la URL al
  // montar y no con useSearchParams(): eso obligaría a renderizar el grid solo
  // en el cliente y lo sacaría del HTML estático que indexa Google. Si ya
  // estamos en Explorar, el navbar no navega: avisa con un evento.
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) setQuery(initial);

    function onSearch(e: Event) {
      setQuery((e as CustomEvent<string>).detail);
      setVisible(PAGE_SIZE);
    }
    window.addEventListener(EXPLORE_SEARCH_EVENT, onSearch);
    return () => window.removeEventListener(EXPLORE_SEARCH_EVENT, onSearch);
  }, []);

  // Diferir solo el texto evita que el input se sienta pegajoso al teclear.
  const deferredQuery = useDeferredValue(query);

  // Los chips se derivan del catálogo cargado, no de una lista fija: si ninguna
  // marca tiene un 2x1 como mejor oferta, el chip de 2x1 no aparece.
  const benefitTypes = useMemo(() => {
    const counts = new Map<BenefitType, number>();
    for (const b of brands) {
      if (b.bestType) counts.set(b.bestType, (counts.get(b.bestType) ?? 0) + 1);
    }
    return BENEFIT_TYPE_ORDER.filter((t) => counts.has(t)).map((type) => ({
      type,
      label: BENEFIT_TYPE_META[type].label,
      count: counts.get(type)!,
    }));
  }, [brands]);

  const results = useMemo(() => {
    const q = normalize(deferredQuery.trim());

    const filtered = brands.filter((b) => {
      if (category !== ALL_CATEGORIES && b.bestCategory !== category) return false;
      if (types.length > 0 && (!b.bestType || !types.includes(b.bestType)))
        return false;
      if (verifiedOnly && !b.hasVerified) return false;
      if (q) {
        const haystack = normalize(`${b.name} ${b.bestCategory ?? ""}`);
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const byDate = (v?: string) => (v ? new Date(v).getTime() : 0);

    return filtered.sort((a, b) => {
      switch (sort) {
        case "populares":
          return b.totalUses - a.totalUses;
        case "nuevas":
          return byDate(b.lastPublishedAt) - byDate(a.lastPublishedAt);
        case "mejor":
          return b.bestMagnitude - a.bestMagnitude;
      }
    });
  }, [brands, deferredQuery, category, types, sort, verifiedOnly]);

  const isFiltered =
    query !== DEFAULTS.query ||
    category !== DEFAULTS.category ||
    types.length > 0 ||
    verifiedOnly !== DEFAULTS.verifiedOnly;

  // Cualquier cambio de filtro vuelve a la primera página. Se envuelven los
  // setters en vez de usar un efecto para no pintar un frame con la página vieja.
  function withReset<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setVisible(PAGE_SIZE);
    };
  }

  function reset() {
    setVisible(PAGE_SIZE);
    setQuery(DEFAULTS.query);
    setCategory(DEFAULTS.category);
    setTypes(DEFAULTS.types);
    setVerifiedOnly(DEFAULTS.verifiedOnly);
  }

  function toggleType(t: BenefitType) {
    setVisible(PAGE_SIZE);
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <FilterPanel
        categories={categories}
        value={category}
        onChange={withReset(setCategory)}
      />

      <div className="flex-1 min-w-0 space-y-5">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => withReset(setQuery)(e.target.value)}
            placeholder="Busca una marca…"
            className="pl-9 h-11 bg-white/70"
            aria-label="Buscar marcas"
          />
          {query && (
            <button
              type="button"
              onClick={() => withReset(setQuery)("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tipo de beneficio */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Tipo de beneficio
          </h4>
          <div className="flex flex-wrap gap-2">
            {benefitTypes.map(({ type, label, count }) => {
              const active = types.includes(type);
              const Icon = BENEFIT_TYPE_META[type].icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-brand",
                    active
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white/70 text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <span className="tabular-nums text-slate-400">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Orden + confianza */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white/70 p-0.5">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => withReset(setSort)(s.key)}
                aria-pressed={sort === s.key}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-brand",
                  sort === s.key
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Ya no hay toggle de "Vigentes": public_brands solo agrega ofertas
              activas, así que no hay nada caducado que ocultar. */}
          <Toggle
            active={verifiedOnly}
            onClick={() => withReset(setVerifiedOnly)(!verifiedOnly)}
            icon={<BadgeCheck className="w-3.5 h-3.5" />}
            label="Solo verificadas"
          />
        </div>

        {/* Resultados */}
        <div className="flex items-center justify-between border-t border-slate-200/70 pt-4">
          <p className="text-sm text-slate-500 tabular-nums">
            <span className="font-semibold text-slate-900">{results.length}</span>{" "}
            {results.length === 1 ? "marca" : "marcas"}
          </p>
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="h-8 text-xs text-slate-500"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>

        {results.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center bg-white/70 border-slate-200/70">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                No encontramos marcas con esos filtros
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Prueba con menos filtros o busca otra marca.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reset}>
              Limpiar filtros
            </Button>
          </Card>
        ) : (
          <>
            <div className="animate-stagger grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
              {results.slice(0, visible).map((b) => (
                <BrandCard key={b.slug} brand={b} />
              ))}
            </div>
            {results.length > visible && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                  Ver más marcas
                  <span className="ml-1.5 tabular-nums text-slate-400">
                    ({results.length - visible})
                  </span>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-brand",
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-white/70 text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
