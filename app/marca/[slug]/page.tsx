import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandPageHeader } from "@/components/brand-page-header";
import { BrandOffers } from "@/components/brand-offers";
import { JsonLd } from "@/components/json-ld";
import {
  getBrandBySlug,
  getBrands,
  getCategories,
  getOffersByBrand,
} from "@/lib/queries";
import { formatBenefitValue } from "@/lib/benefit-format";
import { brandJsonLd } from "@/lib/seo";
import type { Benefit, BrandSummary } from "@/lib/types";

/**
 * ISR con Cache Components: las marcas más usadas salen prerenderizadas en el
 * build; el resto sirve el App Shell (loading.tsx) en su primera visita y Next
 * la genera estática en segundo plano para las siguientes. No hace falta
 * listarlas todas: cada build sería más lento y la mayoría se regeneraría igual
 * al primer updateTag.
 *
 * Con Cache Components tiene que devolver al menos un param, o el build falla.
 * Si la base está vacía (entorno nuevo) se devuelve un placeholder que la
 * página resuelve con notFound().
 */
export async function generateStaticParams() {
  const brands = await getBrands(50);
  if (brands.length === 0) return [{ slug: "__placeholder__" }];
  return brands.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return { title: "Marca no encontrada | MisReferidos" };

  // El gancho va en el título: compartir el enlace tiene que decir qué se gana,
  // no solo el nombre de la marca.
  const hook =
    brand.bestType && brand.offersCount > 0
      ? formatBenefitValue({ type: brand.bestType, value: brand.bestValue })
      : null;

  const title = `Códigos y referidos de ${brand.name} | MisReferidos`;
  const description = hook
    ? `${hook} y ${brand.offersCount} ofertas activas de ${brand.name}, compartidas por la comunidad.`
    : `Referidos y códigos de ${brand.name} compartidos por la comunidad.`;

  return {
    title,
    description,
    alternates: { canonical: `/marca/${brand.slug}` },
    openGraph: {
      title,
      description,
      url: `/marca/${brand.slug}`,
      ...(brand.logoUrl && { images: [{ url: brand.logoUrl, alt: brand.name }] }),
    },
  };
}

/**
 * Las ofertas y su JSON-LD. Todo cacheado con el tag `brand:<slug>`, así que
 * entra en el HTML estático: el Suspense solo se nota en la primera visita a
 * una marca que no estaba en generateStaticParams.
 *
 * Recibe la PROMESA de las ofertas, lanzada por la página en paralelo con
 * getBrandBySlug: en una visita sin caché (marca fuera de generateStaticParams,
 * o tras un updateTag) son dos viajes a la base a la vez en vez de uno detrás
 * de otro.
 *
 * OJO: nada de lo que cuelga de aquí puede leer la hora en el render (ni en
 * componentes de cliente). Con Cache Components eso aplaza el Suspense entero
 * al navegador y el listado sale del HTML estático. Ver components/use-now.ts.
 *
 * Lo propio del usuario (guardados, votos) y el ?oferta= del modal NO se leen
 * aquí: cookies() y searchParams son datos de request y volverían dinámica la
 * página entera (Cache-Control: no-store, render en cada visita). Los resuelve
 * BrandOffers en el cliente.
 */
async function Offers({
  brand,
  offersPromise,
}: {
  brand: BrandSummary;
  offersPromise: Promise<Benefit[]>;
}) {
  const offers = await offersPromise;

  return (
    <>
      <JsonLd data={brandJsonLd(brand, offers)} />
      <BrandOffers offers={offers} brandLogoUrl={brand.logoUrl} />
    </>
  );
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Lectura cacheada (ver getBrandBySlug) y fuera del Suspense, igual que en
  // /u/[username].
  //
  // El status 404 real lo pone el proxy (lib/supabase/proxy.ts): esta página
  // es PPR y el shell prerenderizado sale con 200 antes de que corra este
  // notFound(). Aquí queda como red de seguridad si el proxy deja pasar algo
  // (p. ej. un error de la base), para no pintar una marca vacía.
  const offersPromise = getOffersByBrand(slug);
  const [brand, categories] = await Promise.all([getBrandBySlug(slug), getCategories()]);
  if (!brand) notFound();

  // La categoría de su mejor oferta, para enlazar a marcas parecidas. La vista
  // da el nombre; el slug sale de la lista de categorías (cacheada).
  const category = categories.find((c) => c.name === brand.bestCategory);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* max-w-7xl, el mismo que la home, Explorar y el layout de (main): la
          ficha de marca no tiene por qué ser más estrecha que el resto. */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 pt-8 pb-12">
        <BrandPageHeader brand={brand} />

        <Suspense fallback={<OffersSkeleton />}>
          <Offers brand={brand} offersPromise={offersPromise} />
        </Suspense>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-olive-700">
          {category && (
            <Link href={`/categoria/${category.slug}`} className="hover:underline">
              Más marcas de {category.name} →
            </Link>
          )}
          <Link href="/explorar" className="hover:underline">
            Explorar todas las marcas →
          </Link>
        </nav>
      </main>

      <Footer />
    </div>
  );
}

function OffersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl sm:h-24" />
        ))}
      </div>
    </div>
  );
}
