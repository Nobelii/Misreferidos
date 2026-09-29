"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { MyInteraction } from "@/lib/types";

/**
 * Lo que el usuario en sesión ha guardado o votado entre `referralIds`.
 *
 * Va en el cliente, y no en el Server Component, para que /marca/[slug] sea
 * estática entera: si la página leyera cookies() para esto, cada visita
 * (también las de Googlebot y las anónimas, que son casi todas) se renderizaría
 * en el servidor con `Cache-Control: no-store`. Así el HTML sale de la CDN y
 * solo quien tiene sesión hace estas dos lecturas, contra sus propias filas
 * (el RLS no deja ver otras).
 *
 * `update` lo llaman el voto y el guardado al confirmar la action, para que el
 * estado "inicial" del modal refleje lo último sin volver a consultar.
 */
export function useMyInteractions(referralIds: string[]) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [interactions, setInteractions] = useState<Record<string, MyInteraction>>({});

  // La lista de ids cambia de identidad en cada render; la clave estable es su
  // contenido.
  const idsKey = referralIds.join(",");

  useEffect(() => {
    if (!userId || !idsKey) return;

    const ids = idsKey.split(",");
    const supabase = createClient();
    let cancelled = false;

    Promise.all([
      supabase
        .from("saved_referrals")
        .select("referral_id")
        .eq("user_id", userId)
        .in("referral_id", ids),
      supabase
        .from("referral_votes")
        .select("referral_id, is_helpful")
        .eq("user_id", userId)
        .in("referral_id", ids),
    ]).then(([{ data: saved }, { data: votes }]) => {
      if (cancelled) return;
      const next: Record<string, MyInteraction> = {};
      for (const row of saved ?? []) {
        next[row.referral_id] = { saved: true, vote: null };
      }
      for (const row of votes ?? []) {
        next[row.referral_id] = {
          saved: next[row.referral_id]?.saved ?? false,
          vote: row.is_helpful,
        };
      }
      setInteractions(next);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, idsKey]);

  const update = useCallback((id: string, patch: Partial<MyInteraction>) => {
    setInteractions((prev) => {
      const base: MyInteraction = prev[id] ?? { saved: false, vote: null };
      return { ...prev, [id]: { ...base, ...patch } };
    });
  }, []);

  // Sin sesión no hay nada que enseñar, aunque quede estado de una sesión
  // anterior (logout sin recargar).
  return { interactions: userId ? interactions : {}, update };
}
