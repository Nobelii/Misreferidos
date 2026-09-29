"use client";

import { Clock } from "lucide-react";
import { useNow } from "@/components/use-now";
import { formatExpiry, isEndingSoon } from "@/lib/benefit-format";
import type { Benefit } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * "Termina en 3 días". Es cliente a propósito: depende de la hora actual, que
 * no se puede leer en el render de una página prerenderizada (ver useNow). Se
 * pinta al hidratar, así que tampoco se queda congelado en la hora del build.
 */
export function ExpiryLabel({ benefit }: { benefit: Benefit }) {
  const now = useNow();
  if (now === null) return null;

  const date = new Date(now);
  const expiry = formatExpiry(benefit, date);
  if (!expiry) return null;

  return (
    <span
      className={cn(
        "flex items-center gap-1",
        isEndingSoon(benefit, date) && "text-rose-600 font-medium",
      )}
    >
      <Clock className="w-3 h-3" />
      {expiry}
    </span>
  );
}
