"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/actions";
import { cn } from "@/lib/utils";

export function CopyCodeButton({
  code,
  referralId,
  className,
  size = "default",
  label = "Copiar código",
}: {
  code: string;
  /**
   * Si viene, copiar registra un `code_copy`. Es opcional porque la vista previa
   * de Publicar renderiza una tarjeta que todavía no existe en la base: ahí no
   * hay nada que contar.
   */
  referralId?: string;
  className?: string;
  size?: "default" | "sm" | "lg";
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard puede fallar en contextos no seguros; se ignora en silencio.
    }

    // Fuera del try: que el portapapeles falle no significa que no haya habido
    // intención de usar el código. Y no se espera al await para no retrasar el
    // feedback visual — el contador lo sube un trigger, no esta llamada.
    if (referralId) void trackEvent(referralId, "code_copy");
  }

  return (
    <Button
      type="button"
      size={size}
      onClick={handleCopy}
      className={cn("gap-2", className)}
    >
      {copied ? (
        <>
          {/* El check entra con un pop mínimo — confirma la acción sin distraer. */}
          <Check className="w-4 h-4 animate-in zoom-in-75 duration-150 ease-brand" />
          ¡Copiado!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          {label}
        </>
      )}
    </Button>
  );
}
