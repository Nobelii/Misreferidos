import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { BrandCard } from "@/components/brand-card";
import { CategoryLinks } from "@/components/category-links";
import { JsonLd } from "@/components/json-ld";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/lib/category-icons";
import { getBrandsByCategory, getCategories, getCategoryBySlug } from "@/lib/queries";
import { categoryJsonLd } from "@/lib/seo";

/**
 * Todas las categorías activas se prerenderizan: son pocas y cambian solo
 * desde admin. Una nueva se genera en su primera visita (ISR, igual que las
 * marcas). Al menos un param siempre: lo exige Cache Components.
 */
export async function generateStaticParams() {
  const categories = await getCategories();
  if (categories.length === 0) return [{ slug: "__placeholder__" }];
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Categoría no encontrada | MisReferidos" };

  const title = `Códigos de descuento y referidos de ${category.name} | MisReferidos`;
  const description =
    category.description ??
    `${category.count} ${category.count === 1 ? "oferta activa" : "ofertas activas"} de ${category.name}: códigos de descuento, meses gratis y referidos compartidos por la comunidad.`;

  return {
    title,
    description,
    alternates: { canonical: `/categoria/${category.slug}` },
    // Una categoría vacía es contenido pobre: se puede visitar, pero no se indexa.
    ...(category.count === 0 && { robots: { index: false, follow: true } }),
    openGraph: { title, description, url: `/categoria/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // En paralelo: ambas cacheadas con el tag `catalog`. El 404 real lo pone el
  // proxy; este notFound() es la red de seguridad, como en /marca/[slug].
  const [category, brands, categories] = await Promise.all([
    getCategoryBySlug(slug),
    getBrandsByCategory(slug),
    getCategories(),
  ]);
  if (!category) notFound();

  return (
    <PublicShell>
      <JsonLd data={categoryJsonLd(category, brands)} />

      <nav aria-label="Migas de pan" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-ink">Inicio</Link>
        <span className="mx-1.5">/</span>
        <Link href="/explorar" className="hover:text-ink">Explorar</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{category.name}</span>
      </nav>

      <header className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-olive-50 text-olive-700">
          <CategoryIcon iconName={category.iconName} className="h-7 w-7" />
        </span>
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Códigos y referidos de {category.name}
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            {category.description ??
              `Marcas de ${category.name.toLowerCase()} con descuentos, meses gratis y códigos de referido que la comunidad comparte y mantiene al día.`}
          </p>
          <p className="text-sm text-slate-500 tabular-nums">
            {brands.length} {brands.length === 1 ? "marca" : "marcas"} ·{" "}
            {category.count} {category.count === 1 ? "oferta activa" : "ofertas activas"}
          </p>
        </div>
      </header>

      {brands.length === 0 ? (
        <Card className="p-10 text-center bg-paper border-line">
          <p className="font-semibold text-ink">Todavía no hay ofertas en {category.name}</p>
          <p className="mt-1 text-sm text-slate-500">
            ¿Tienes un código de una marca de esta categoría? Compártelo con la comunidad.
          </p>
          <Link
            href="/app/publicar"
            className="mt-4 inline-block text-sm font-medium text-olive-700 hover:underline"
          >
            Publicar un código →
          </Link>
        </Card>
      ) : (
        <div className="animate-stagger grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
          {brands.map((b) => (
            <BrandCard key={b.slug} brand={b} />
          ))}
        </div>
      )}

      <section className="space-y-4 border-t border-line pt-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Otras categorías
        </h2>
        <CategoryLinks categories={categories} currentSlug={category.slug} />
      </section>
    </PublicShell>
  );
}
