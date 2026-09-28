"use client";

import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { trackEvent } from "@/lib/actions";
import { cn } from "@/lib/utils";

/**
 * Sustituye al <a> crudo del detalle para poder registrar el clic.
 *
 * Sigue siendo un <a> de verdad (no un button con router.push): así conserva el
 * "abrir en pestaña nueva" del botón central del ratón, el menú contextual y el
 * hover con la URL real. El evento se dispara sin await para no retrasar la
 * navegación — si el registro falla, el usuario igual llega a su beneficio.
 */
export function RedeemLinkButton({
  referralId,
  url,
  variant = "default",
  label = "Obtener enlace",
}: {
  referralId: string;
  url: string;
  variant?: "default" | "outline";
  label?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => void trackEvent(referralId, "link_click")}
      className={cn(
        buttonVariants({ variant, size: "lg" }),
        "w-full gap-2",
      )}
    >
      <ExternalLink className="w-4 h-4" />
      {label}
    </a>
  );
}
