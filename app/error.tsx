"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ErrorTicket } from "@/components/error-ticket";
import { Button } from "@/components/ui/button";

/**
 * Error 500 de cualquier página (todo lo que cuelga del layout raíz). Si falla
 * el propio layout, lo recoge app/global-error.tsx.
 *
 * En producción `error.message` de un Server Component es genérico a propósito
 * (Next no filtra detalles al cliente); el `digest` es lo que permite cruzarlo
 * con los logs del servidor, por eso se enseña.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 flex flex-col items-center justify-center gap-10 py-16">
        <ErrorTicket code="500" label="Algo falló" />

        <div className="space-y-3 text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Se nos trabó el cupón
          </h1>
          <p className="mx-auto max-w-md text-muted-foreground">
            Algo falló de nuestro lado al cargar esta página. No es culpa tuya:
            vuelve a intentarlo en unos segundos.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => retry()} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reintentar
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>

        {error.digest && (
          <p className="text-xs text-slate-400">
            Código de error: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
