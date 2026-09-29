"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Check, Flag, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { reportReferral } from "@/lib/actions";
import { REPORT_REASON_LABEL } from "@/lib/labels";
import type { Enums } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const REASONS = Object.keys(REPORT_REASON_LABEL) as Enums<"report_reason">[];

export function ReportDialog({ referralId }: { referralId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Enums<"report_reason">>("invalid_code");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await reportReferral(referralId, reason, details);
      if (result.ok) setSent(true);
      else setError(result.error);
    });
  }

  if (sent) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-xs text-emerald-600">
        <Check className="w-3.5 h-3.5" />
        Gracias, lo estamos revisando.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-rose-600 transition-colors"
      >
        <Flag className="w-3.5 h-3.5" />
        Reportar un problema
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white/70 p-4 animate-in fade-in slide-in-from-top-1 duration-200 ease-brand">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          ¿Qué pasa con este referido?
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar"
          className="text-slate-400 hover:text-slate-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            aria-pressed={reason === r}
            className={cn(
              "w-full rounded-md border px-3 py-2 text-left text-xs transition-colors",
              reason === r
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 text-slate-600 hover:border-slate-400",
            )}
          >
            {REPORT_REASON_LABEL[r]}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-details" className="text-xs">
          Detalles (opcional)
        </Label>
        <textarea
          id="report-details"
          value={details}
          onChange={(e) => {
            setDetails(e.target.value);
            setError(null);
          }}
          rows={2}
          maxLength={500}
          placeholder="Probé el código y decía que ya expiró…"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-y"
        />
      </div>

      {error && (
        <p className="flex items-center gap-1 text-xs text-rose-600">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      <Button size="sm" className="w-full" onClick={submit} disabled={pending}>
        {pending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
        {pending ? "Enviando…" : "Enviar reporte"}
      </Button>
    </div>
  );
}
