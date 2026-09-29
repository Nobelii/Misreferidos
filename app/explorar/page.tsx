import { Suspense } from "react";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { ExploreClient } from "@/components/explore-client";
import { BenefitGridSkeleton } from "@/components/benefit-grid-skeleton";
import { CategoryLinks } from "@/components/category-links";
import { BrandIndex } from "@/components/brand-index";
import { JsonLd } from "@/components/json-ld";
import { getBrands, getCategories } from "@/lib/queries";
import { directoryJsonLd } from "@/lib/seo";

const title = "Explorar marcas con códigos y referidos | MisReferidos";
const description =
  "Todas las marcas con códigos de descuento, meses gratis, envíos gratis y referidos compartidos por la comunidad. Filtra por categoría y tipo de beneficio.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/explorar" },
  openGraph: { title, description, url: "/explorar" },
};

/**
 * El directorio público de marcas. Estática (todo cacheado con el tag
 * `catalog`) y sin sesión: es el hub del enlazado interno hacia las fichas de
 * marca y las categorías.
 *
 * El grid interactivo filtra en el cliente, así que necesita el directorio
 * entero: 1000 es el tope de filas de PostgREST; el render se pagina en
 * ExploreClient. Como esa paginación deja fuera del HTML a las marcas menos
 * usadas, debajo va BrandIndex con TODAS como enlaces.
 */
async function ExploreData() {
  const [brands, categories] = await Promise.all([getBrands(1000), getCategories()]);

  return (
    <>
      <JsonLd data={directoryJsonLd(brands)} />
      <ExploreClient brands={brands} categories={categories} />

      <section className="space-y-4 border-t border-line pt-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Categorías
        </h2>
        <CategoryLinks categories={categories} />
      </section>

      <section className="space-y-4 border-t border-line pt-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Todas las marcas de la A a la Z
        </h2>
        <BrandIndex brands={brands} />
      </section>
    </>
  );
}

export default function ExplorarPage() {
  return (
    <PublicShell>
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Explorar marcas
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Entra en una marca y mira todos sus códigos: descuentos, meses gratis,
          envíos gratis y bonos que la comunidad mantiene al día.
        </p>
      </header>

      <Suspense fallback={<BenefitGridSkeleton count={12} />}>
        <ExploreData />
      </Suspense>
    </PublicShell>
  );
}
