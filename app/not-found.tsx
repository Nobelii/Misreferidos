import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Página no encontrada | MisReferidos",
};

export default function NotFound() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Error 404
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Aquí no hay nada
        </h1>
        <p className="text-muted-foreground">
          Puede que la marca o el perfil ya no exista, o que el enlace esté mal
          escrito.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Button asChild>
            <Link href="/">Ir al inicio</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/explorar">Explorar marcas</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
