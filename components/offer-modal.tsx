"use client";

import { useState } from "react";
import { Check, Clock, Link2, ShieldCheck } from "lucide-react";
import { Modal, useModalTitleId } from "@/components/ui/modal";
import { BrandMark } from "@/components/brand-mark";
import { BenefitTypeBadge } from "@/components/benefit-type-badge";
import { CopyCodeButton } from "@/components/copy-code-button";
import { RedeemLinkButton } from "@/components/redeem-link-button";
import { HelpfulVote } from "@/components/helpful-vote";
import { SaveButton } from "@/components/save-button";
import { ReportDialog } from "@/components/report-dialog";
import { TrackView } from "@/components/track-view";
import { formatBenefitValue, formatExpiry, isEndingSoon } from "@/lib/benefit-format";
import type { Benefit, MyInteraction } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatNumber(n: number) {
  return n.toLocaleString("es-ES");
}

/**
 * El detalle de una oferta, en modal. Reempaqueta lo que antes era la columna
 * derecha de /app/referido/[id].
 *
 * TrackView va dentro: la vista se registra al abrir el modal, que es cuando la
 * persona ve de verdad el código, no al cargar la lista de la marca.
 */
export function OfferModal({
  offer,
  open,
  onClose,
  brandLogoUrl,
  interaction,
}: {
  offer: Benefit;
  open: boolean;
  onClose: () => void;
  brandLogoUrl?: string;
  interaction: MyInteraction;
}) {
  const titleId = useModalTitleId();
  const [linkCopied, setLinkCopied] = useState(false);
  const expiry = formatExpiry(offer);
  const endingSoon = isEndingSoon(offer);

  async function copyLink() {
    try {
      // window.location ya trae ?oferta=<id>: lo puso BrandOffers al abrir.
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      // clipboard falla en contextos no seguros; sin ruido.
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="max-w-lg">
      <TrackView referralId={offer.id} />

      {/* Marca */}
      <div className="flex flex-col items-center gap-3 text-center">
        <BrandMark
          brand={offer.brand}
          logoUrl={brandLogoUrl ?? offer.logoUrl}
          size={56}
          className="h-14 w-14 rounded-xl border border-line"
          textClassName="text-xl"
        />
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
            {offer.brand}
          </p>
          <h2
            id={titleId}
            className="mt-1 font-display text-2xl font-semibold leading-tight tracking-tight text-ink"
          >
            {formatBenefitValue(offer)}
          </h2>
        </div>
        <p className="text-sm leading-snug text-slate-600">{offer.headline}</p>
      </div>

      {/* El código, o su ausencia */}
      <div className="mt-6">
        {offer.code ? (
          <>
            <p className="mb-2 text-center text-xs text-slate-500">
              Copia y pega este código
            </p>
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-olive-300 bg-olive-50 py-4 text-2xl font-bold tracking-[0.2em] text-ink">
              {offer.code}
            </div>
            <div className="mt-3 space-y-2">
              <CopyCodeButton
                code={offer.code}
                referralId={offer.id}
                size="lg"
                className="w-full"
              />
              {offer.redeemUrl && (
                <RedeemLinkButton
                  referralId={offer.id}
                  url={offer.redeemUrl}
                  variant="outline"
                  label={`Ir a ${offer.brand}`}
                />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-bone py-4 text-sm font-medium text-slate-600">
              <Check className="h-4 w-4 text-olive-600" />
              No se necesita código
            </div>
            {offer.redeemUrl && (
              <div className="mt-3">
                <RedeemLinkButton
                  referralId={offer.id}
                  url={offer.redeemUrl}
                  label={`Ir a la oferta de ${offer.brand}`}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Cómo usarlo */}
      {offer.steps && offer.steps.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-ink">Cómo usarlo</p>
          <ol className="space-y-2">
            {offer.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-olive-100 text-xs font-bold text-olive-800">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {offer.description && !offer.steps?.length && (
        <p className="mt-6 text-sm leading-relaxed text-slate-600">
          {offer.description}
        </p>
      )}

      {/* Condiciones */}
      {offer.conditions && offer.conditions.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-ink">Condiciones</p>
          <ul className="space-y-1.5">
            {offer.conditions.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-olive-600" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadatos */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-xs text-slate-500">
        <BenefitTypeBadge type={offer.type} />
        {expiry && (
          <span
            className={cn(
              "flex items-center gap-1",
              endingSoon && "font-medium text-rose-600",
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            {expiry}
          </span>
        )}
        {offer.verified && (
          <span className="flex items-center gap-1 text-olive-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verificado
          </span>
        )}
      </div>

      <p className="mt-3 text-center text-xs tabular-nums text-slate-400">
        {formatNumber(offer.uses)}{" "}
        {offer.uses === 1 ? "persona ya lo usó" : "personas ya lo usaron"}
      </p>

      <div className="mt-4 space-y-2">
        <HelpfulVote
          referralId={offer.id}
          initialVote={interaction.vote}
          helpfulCount={offer.helpfulCount}
        />

        {/* ReportDialog es un panel inline, no un modal: no anida portales. */}
        <ReportDialog referralId={offer.id} />

        <div className="flex gap-2">
          <SaveButton referralId={offer.id} initialSaved={interaction.saved} />
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors ease-brand hover:border-slate-400 hover:text-slate-900"
          >
            {linkCopied ? (
              <Check className="h-3.5 w-3.5 animate-in zoom-in-75 duration-150 ease-brand text-olive-600" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {linkCopied ? "¡Enlace copiado!" : "Copiar enlace"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
