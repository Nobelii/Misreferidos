"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, ShieldCheck, StickyNote, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { addReportNote, resolveReport } from "@/lib/actions";
import { REPORT_REASON_LABEL } from "@/lib/labels";
import type { OpenReport } from "@/lib/queries";

export function ReportQueue({ items }: { items: OpenReport[] }) {
  if (items.length === 0) {
    return (
      <Card className="flex items-center gap-3 p-6 bg-emerald-50/50 border-emerald-200">
        <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-medium text-emerald-900">Sin reportes abiertos</p>
          <p className="text-xs text-emerald-700/80">
            Nadie ha reportado ningún problema.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="animate-stagger space-y-3">
      {items.map((r) => (
        <ReportCard key={r.id} report={r} />
      ))}
    </div>
  );
}

function ReportCard({ report }: { report: OpenReport }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
    });
  }

  return (
    <Card className="p-5 bg-white/70 border-slate-200/70 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] bg-rose-50 text-rose-700 border-rose-200"
            >
              {REPORT_REASON_LABEL[report.reason]}
            </Badge>
            <Link
              href={`/app/referido/${report.referralId}`}
              className="text-sm font-semibold text-slate-900 hover:underline"
            >
              {report.brand}
            </Link>
            <span className="text-xs text-slate-400">
              {report.reporterUsername
                ? `reportado por @${report.reporterUsername}`
                : "reportante eliminado"}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mt-1">{report.title}</p>

          {report.details && (
            <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
              “{report.details}”
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-1">
          {pending ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            <>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => run(() => resolveReport(report.id, "resolved"))}
              >
                <Check className="w-3.5 h-3.5" />
                Resolver
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 px-2"
                title="Descartar"
                onClick={() => run(() => resolveReport(report.id, "dismissed"))}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Notas internas: viven en report_notes, no en reports, precisamente para
          que quien reportó no pueda leerlas con un select sobre su propia fila. */}
      <div className="border-t border-slate-200/70 pt-3 space-y-2">
        {report.notes.map((n) => (
          <p
            key={n.id}
            className="flex items-start gap-1.5 text-xs text-slate-500"
          >
            <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
            {n.note}
          </p>
        ))}

        <div className="flex gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota interna (no la ve quien reportó)…"
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!note.trim() || pending}
            onClick={() =>
              run(async () => {
                await addReportNote(report.id, note);
                setNote("");
              })
            }
          >
            Añadir
          </Button>
        </div>
      </div>
    </Card>
  );
}
