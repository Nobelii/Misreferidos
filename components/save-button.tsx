"use client";

import { useOptimistic, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleSave } from "@/lib/actions";
import { cn } from "@/lib/utils";

export function SaveButton({
  referralId,
  initialSaved,
  className,
}: {
  referralId: string;
  initialSaved: boolean;
  className?: string;
}) {
  // Optimista: guardar es una acción trivial y reversible, así que el icono se
  // rellena al instante en vez de esperar el round-trip. Si la action falla,
  // React revierte el estado solo al terminar la transición.
  const [saved, setSaved] = useOptimistic(initialSaved);
  const [, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      setSaved(!saved);
      await toggleSave(referralId);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleClick}
      aria-pressed={saved}
      className={cn("w-full gap-2", className)}
    >
      {/* key fuerza remount al cambiar `saved`, así el pop se repite en cada
          toggle (las clases animate-in solo corren al montar). */}
      <Bookmark
        key={String(saved)}
        className={cn(
          "w-4 h-4 animate-in zoom-in-75 duration-150 ease-brand",
          saved && "fill-current",
        )}
      />
      {saved ? "Guardado" : "Guardar"}
    </Button>
  );
}
