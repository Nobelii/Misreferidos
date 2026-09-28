"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/actions";

/**
 * Registra una vista al montar. Va en el cliente y no en el render del servidor
 * a propósito: un efecto en render convertiría cada prefetch o revalidación en
 * una vista falsa. El contador de `referrals` lo sube un trigger de Postgres, y
 * el índice único de dedupe evita que refrescar infle el número.
 */
export function TrackView({ referralId }: { referralId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void trackEvent(referralId, "view");
  }, [referralId]);

  return null;
}
