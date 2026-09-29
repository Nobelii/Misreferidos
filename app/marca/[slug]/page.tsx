import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandPageHeader } from "@/components/brand-page-header";
import { BrandOffers } from "@/components/brand-offers";
import {
  getBrandBySlug,
  getMyInteractions,
  getOffersByBrand,
} from "@/lib/queries";
import { formatBenefitValue } from "@/lib/benefit-format";

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
    openGraph: { title, description, url: `/marca/${brand.slug}` },
  };
}

/**
 * Las ofertas van en su propio Suspense: son datos vivos (los contadores
 * cambian con cada uso) y no deben bloquear el shell.
 *
 * `initialOfferId` es lo que hace compartible el enlace del modal: si alguien
 * abre /marca/spotify?oferta=<id> directo, el modal se monta ya abierto en el
 * primer render, sin parpadeo ni efecto en cliente.
 */
async function Offers({
  slug,
  initialOfferId,
  brandLogoUrl,
}: {
  slug: string;
  initialOfferId?: string;
  brandLogoUrl?: string;
}) {
  // En paralelo: el listado es público y cacheado, las interacciones son del
  // usuario y no lo son. Encadenarlas sumaría dos viajes en vez de uno.
  const [offers, interactions] = await Promise.all([
    getOffersByBrand(slug),
    getMyInteractions(),
  ]);

  return (
    <BrandOffers
      offers={offers}
      interactions={Object.fromEntries(interactions)}
      initialOfferId={initialOfferId}
      brandLogoUrl={brandLogoUrl}
    />
  );
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ oferta?: string }>;
}) {
  const { slug } = await params;
  const { oferta } = await searchParams;

  // Lectura cacheada (ver getBrandBySlug) y fuera del Suspense, igual que en
  // /u/[username].
  //
  // El status 404 real lo pone el proxy (lib/supabase/proxy.ts): esta página
  // es PPR y el shell prerenderizado sale con 200 antes de que corra este
  // notFound(). Aquí queda como red de seguridad si el proxy deja pasar algo
  // (p. ej. un error de la base), para no pintar una marca vacía.
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* max-w-7xl, el mismo que la home, Explorar y el layout de (main): la
          ficha de marca no tiene por qué ser más estrecha que el resto. */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 pt-8 pb-12">
        <BrandPageHeader brand={brand} />

        <Suspense fallback={<OffersSkeleton />}>
          <Offers
            slug={slug}
            initialOfferId={oferta}
            brandLogoUrl={brand.logoUrl}
          />
        </Suspense>

        <Link
          href="/app/explorar"
          className="text-sm font-medium text-olive-700 hover:underline"
        >
          Explorar más marcas →
        </Link>
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
