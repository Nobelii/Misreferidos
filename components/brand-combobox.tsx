"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, X, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { BrandModal } from "@/components/brand-modal";
import { createClient } from "@/lib/supabase/client";
import { toBrand, brandDomain, type Brand, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const RESULT_COLUMNS = "id, name, slug, website_url, logo_url, status";

/**
 * Selector de marca con búsqueda. Consulta la tabla `brands` directamente con el
 * cliente browser: la policy de SELECT expone todas las marcas, así que no hay
 * nada que filtrar por estado. Si no aparece la marca, abre el modal para
 * crearla y queda usable al instante.
 */
export function BrandCombobox({
  value,
  onChange,
  categories,
  error,
}: {
  value: Brand | null;
  onChange: (brand: Brand | null) => void;
  categories: Category[];
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Búsqueda con debounce. El catálogo de marcas es pequeño y la RLS lo acota,
  // así que basta un ilike con límite.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await createClient()
        .from("brands")
        .select(RESULT_COLUMNS)
        .ilike("name", `%${q}%`)
        .order("name")
        .limit(8);
      setResults((data ?? []).map(toBrand));
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Cierra el dropdown al hacer clic fuera.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(brand: Brand) {
    onChange(brand);
    setOpen(false);
    setQuery("");
  }

  // --- Marca ya seleccionada: chip con logo + acción de cambiar ---
  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
        <BrandMark
          brand={value.name}
          logoUrl={value.logoUrl}
          className="h-8 w-8 rounded-md"
          textClassName="text-xs"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{value.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {brandDomain(value.websiteUrl)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Cambiar de marca"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // --- Sin selección: buscador + dropdown ---
  return (
    <>
      <div ref={containerRef} className="relative">
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border bg-background px-3 shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring",
            error ? "border-rose-300" : "border-input",
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Busca Spotify, Uber, Rappi…"
            className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Buscar marca"
            autoComplete="off"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}
        </div>

        {open && (query.trim() || results.length > 0) && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-popover shadow-lg">
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((brand) => (
                <li key={brand.id}>
                  <button
                    type="button"
                    onClick={() => select(brand)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-olive-50 transition-colors"
                  >
                    <BrandMark
                      brand={brand.name}
                      logoUrl={brand.logoUrl}
                      className="h-8 w-8 rounded-md"
                      textClassName="text-xs"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-ink">
                          {brand.name}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {brandDomain(brand.websiteUrl)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}

              {!loading && query.trim() && results.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  No encontramos “{query.trim()}”.
                </li>
              )}
            </ul>

            {/* Opción fija: crear marca nueva */}
            <button
              type="button"
              onClick={() => {
                setModalOpen(true);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left text-sm font-medium text-olive-700 hover:bg-olive-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              ¿No está tu marca? Añádela
            </button>
          </div>
        )}
      </div>

      <BrandModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(brand) => {
          // La marca recién creada queda seleccionada al instante.
          select(brand);
        }}
        categories={categories}
        initialName={query.trim()}
      />
    </>
  );
}
