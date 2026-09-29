import { Suspense } from "react";
import { ExploreClient } from "@/components/explore-client";
import { BenefitGridSkeleton } from "@/components/benefit-grid-skeleton";
import { getBrands, getCategories } from "@/lib/queries";

export const metadata = {
  title: "Explorar marcas | MisReferidos",
  description:
    "Descuentos, meses gratis, envíos gratis y códigos compartidos por la comunidad, marca por marca.",
};

async function ExploreData() {
  // Explorar filtra en el cliente, así que necesita el directorio entero: con el
  // límite por defecto (60) las marcas menos usadas no aparecían nunca. 1000 es
  // el tope de filas de PostgREST; el render se pagina en ExploreClient.
  const [brands, categories] = await Promise.all([
    getBrands(1000),
    getCategories(),
  ]);

  return <ExploreClient brands={brands} categories={categories} />;
}

export default function ExplorarPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Explorar marcas
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Entra en una marca y mira todos sus códigos: descuentos, meses gratis,
          envíos gratis y bonos que la comunidad mantiene al día.
        </p>
      </header>

      <Suspense fallback={<BenefitGridSkeleton count={9} />}>
        <ExploreData />
      </Suspense>
    </div>
  );
}
