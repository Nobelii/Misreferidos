import { Skeleton } from "@/components/ui/skeleton";

export default function MarcaLoading() {
  return (
    // Mismo ancho que page.tsx, o la página saltaría al terminar de cargar.
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 pt-8 pb-12">
      {/* Cabecera: logo + nombre + las tres métricas */}
      <Skeleton className="h-48 w-full rounded-xl sm:h-40" />

      <div className="space-y-4">
        <Skeleton className="h-7 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl sm:h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}
