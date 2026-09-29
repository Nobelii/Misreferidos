"use client";

import { useOptimistic, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { voteHelpful } from "@/lib/actions";
import { cn } from "@/lib/utils";

/**
 * "¿Te sirvió?". Votar lo mismo dos veces retira el voto (por eso el estado es
 * boolean | null y no boolean).
 */
export function HelpfulVote({
  referralId,
  initialVote,
  helpfulCount,
  onChange,
}: {
  referralId: string;
  initialVote: boolean | null;
  helpfulCount: number;
  /** Voto confirmado por el servidor, para que el padre lo haga "inicial". */
  onChange?: (vote: boolean | null) => void;
}) {
  const [vote, setVote] = useOptimistic(initialVote);
  const [, startTransition] = useTransition();

  function cast(value: boolean) {
    startTransition(async () => {
      setVote(vote === value ? null : value);
      onChange?.(await voteHelpful(referralId, value));
    });
  }

  // El contador optimista tiene que reflejar el delta del voto propio, o el
  // número se quedaría quieto un segundo mientras el icono ya cambió.
  const delta =
    (vote === true ? 1 : 0) - (initialVote === true ? 1 : 0);
  const count = helpfulCount + delta;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/70 px-4 py-3">
      <span className="text-sm text-slate-600">¿Te sirvió?</span>

      <div className="flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          onClick={() => cast(true)}
          aria-pressed={vote === true}
          aria-label="Sí, me sirvió"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ease-brand",
            vote === true
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900",
          )}
        >
          <ThumbsUp
            key={String(vote === true)}
            className={cn(
              "w-3.5 h-3.5 animate-in zoom-in-75 duration-150 ease-brand",
              vote === true && "fill-current",
            )}
          />
          <span className="tabular-nums">{count}</span>
        </button>

        <button
          type="button"
          onClick={() => cast(false)}
          aria-pressed={vote === false}
          aria-label="No me sirvió"
          className={cn(
            "inline-flex items-center rounded-md border px-2.5 py-1.5 transition-colors duration-150 ease-brand",
            vote === false
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900",
          )}
        >
          <ThumbsDown
            key={String(vote === false)}
            className={cn(
              "w-3.5 h-3.5 animate-in zoom-in-75 duration-150 ease-brand",
              vote === false && "fill-current",
            )}
          />
        </button>
      </div>
    </div>
  );
}
