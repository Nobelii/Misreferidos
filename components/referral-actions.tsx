"use client";

import { useState, useTransition } from "react";
import { Loader2, MoreHorizontal, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteReferral, setMyReferralStatus } from "@/lib/actions";
import type { BenefitStatus } from "@/lib/types";

export function ReferralActions({
  referralId,
  brand,
  status,
}: {
  referralId: string;
  brand: string;
  status: BenefitStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const canPause = status === "active";
  const canResume = status === "archived";

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      setConfirmingDelete(false);
    });
  }

  if (confirmingDelete) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">¿Eliminar {brand}?</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50"
          disabled={pending}
          onClick={() => run(() => deleteReferral(referralId))}
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sí, eliminar"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => setConfirmingDelete(false)}
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400"
          aria-label={`Acciones de ${brand}`}
        >
          {pending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MoreHorizontal className="w-4 h-4" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {canPause && (
          <DropdownMenuItem
            onClick={() => run(() => setMyReferralStatus(referralId, "archived"))}
          >
            <PauseCircle className="w-4 h-4 mr-2" />
            Pausar
          </DropdownMenuItem>
        )}

        {canResume && (
          // Sin cola de moderación: reactivar lo devuelve directamente a
          // Explorar. El guard de la base ya admite 'active' para el autor.
          <DropdownMenuItem
            onClick={() => run(() => setMyReferralStatus(referralId, "active"))}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Reactivar
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
          onSelect={(e) => {
            e.preventDefault();
            setConfirmingDelete(true);
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
