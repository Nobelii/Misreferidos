"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { OfferRow } from "@/components/offer-row";
import { OfferModal } from "@/components/offer-modal";
import { magnitude } from "@/lib/benefit-format";
import type { Benefit, MyInteraction } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey = "recientes" | "usadas" | "mejor";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recientes", label: "Más recientes" },
  { key: "usadas", label: "Más usadas" },
  { key: "mejor", label: "Mejor beneficio" },
];

const PARAM = "oferta";
const NO_INTERACTION: MyInteraction = { saved: false, vote: null };

/**
 * El listado de ofertas de una marca, su orden y el modal de detalle.
 *
 * --- Sobre la URL ---
 * La regla es: el estado local manda el render, la URL solo lo refleja.
 *
 * Abrir usa history.pushState nativo y no router.push(): router.push dispara
 * una navegación de Next y vuelve a pedir el Server Component por red solo para
 * abrir un modal cuyos datos ya están en memoria. Con pushState la apertura es
 * instantánea y el enlace queda igual de compartible.
 *
 * El popstate hace que Atrás cierre el modal en vez de sacarte de la página.
 *
 * OJO: pushState nativo NO actualiza el useSearchParams() de Next. Aquí da
 * igual porque la fuente de verdad es `openId`, pero si algún día otro
 * componente de esta página lee useSearchParams, se desincronizará.
 *
 * Quien abre la URL con ?oferta= directo no pasa por nada de esto: el Server
 * Component resuelve el id y llega por initialOfferId, así que el modal se monta
 * ya abierto en el primer render.
 */
export function BrandOffers({
  offers,
  interactions,
  initialOfferId,
  brandLogoUrl,
}: {
  offers: Benefit[];
  interactions: Record<string, MyInteraction>;
  initialOfferId?: string;
  brandLogoUrl?: string;
}) {
  const [sort, setSort] = useState<SortKey>("recientes");
  const [openId, setOpenId] = useState<string | null>(initialOfferId ?? null);

  const sorted = useMemo(() => {
    const byDate = (v?: string) => (v ? new Date(v).getTime() : 0);

    return [...offers].sort((a, b) => {
      switch (sort) {
        case "recientes":
          return byDate(b.createdAt) - byDate(a.createdAt);
        case "usadas":
          return b.uses - a.uses;
        case "mejor":
          return magnitude(b) - magnitude(a);
      }
    });
  }, [offers, sort]);

  const open = useCallback((id: string) => {
    setOpenId(id);
    const url = new URL(window.location.href);
    url.searchParams.set(PARAM, id);
    window.history.pushState(null, "", url);
  }, []);

  const close = useCallback(() => {
    setOpenId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete(PARAM);
    window.history.pushState(null, "", url);
  }, []);

  useEffect(() => {
    function onPop() {
      const id = new URLSearchParams(window.location.search).get(PARAM);
      setOpenId(id);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Si el id de la URL no corresponde a ninguna oferta de esta marca, no se
  // abre nada: la página carga normal en vez de romperse.
  const openOffer = openId ? offers.find((o) => o.id === openId) : undefined;

  if (offers.length === 0) {
    return (
      <Card className="p-8 text-center bg-paper border-line">
        <p className="text-sm text-muted-foreground">
          Esta marca todavía no tiene ofertas activas.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-ink">
          {offers.length === 1 ? "1 oferta" : `${offers.length} ofertas`}
        </h2>

        {/* El selector solo aparece si hay algo que reordenar. */}
        {offers.length > 1 && (
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Ordenar ofertas"
          >
            {SORTS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                aria-pressed={sort === key}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors ease-brand",
                  sort === key
                    ? "bg-ink text-bone"
                    : "text-slate-600 hover:bg-olive-50 hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="animate-stagger space-y-3">
        {sorted.map((offer) => (
          <OfferRow
            key={offer.id}
            benefit={offer}
            href={`?${PARAM}=${offer.id}`}
            onSelect={() => open(offer.id)}
          />
        ))}
      </div>

      {openOffer && (
        <OfferModal
          offer={openOffer}
          open
          onClose={close}
          brandLogoUrl={brandLogoUrl}
          interaction={interactions[openOffer.id] ?? NO_INTERACTION}
        />
      )}
    </div>
  );
}
