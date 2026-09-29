import { siteName, siteUrl } from "@/lib/site";
import { formatBenefitValue } from "@/lib/benefit-format";
import type { Benefit, BrandSummary, Category, Publisher } from "@/lib/types";

/**
 * Datos estructurados (schema.org, JSON-LD) de las páginas públicas.
 *
 * Solo se declara lo que la página enseña de verdad: Google penaliza el marcado
 * que describe contenido invisible. Por eso no hay AggregateRating (los votos
 * "¿te sirvió?" no son reseñas) ni precios inventados en las Offer.
 *
 * Las URLs van absolutas: JSON-LD no hereda metadataBase.
 */

type JsonLdNode = Record<string, unknown>;

const abs = (path: string) => `${siteUrl}${path}`;

export const organizationId = abs("/#organization");
export const websiteId = abs("/#website");

/** Organización + sitio. Va en la home; el resto de páginas los referencia por @id. */
export function siteJsonLd(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteName,
        url: siteUrl,
        logo: abs("/logomisreferidos.png"),
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: siteName,
        url: siteUrl,
        inLanguage: "es",
        publisher: { "@id": organizationId },
      },
    ],
  };
}

function breadcrumb(items: { name: string; path: string }[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: abs(item.path),
    })),
  };
}

/**
 * Ficha de marca: CollectionPage cuyo tema es la marca, con la lista de ofertas
 * y la miga de pan. Las Offer no llevan `price` porque no lo hay: un código de
 * referido no tiene precio, y declarar 0 sería mentir.
 */
export function brandJsonLd(brand: BrandSummary, offers: Benefit[]): JsonLdNode {
  const path = `/marca/${brand.slug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": abs(path),
        url: abs(path),
        name: `Códigos y referidos de ${brand.name}`,
        inLanguage: "es",
        isPartOf: { "@id": websiteId },
        about: {
          "@type": "Brand",
          name: brand.name,
          ...(brand.logoUrl && { logo: brand.logoUrl }),
          ...(brand.websiteUrl && { url: brand.websiteUrl }),
        },
        ...(brand.lastPublishedAt && { dateModified: brand.lastPublishedAt }),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: offers.length,
          itemListElement: offers.map((offer, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Offer",
              name: `${formatBenefitValue(offer)} en ${offer.brand}`,
              description: offer.headline,
              url: abs(`${path}?oferta=${offer.id}`),
              ...(offer.expiresAt && { validThrough: offer.expiresAt }),
              ...(offer.createdAt && { validFrom: offer.createdAt }),
            },
          })),
        },
      },
      breadcrumb([
        { name: "Inicio", path: "/" },
        { name: brand.name, path },
      ]),
    ],
  };
}

/** Lista de marcas como ItemList de enlaces a sus fichas. */
function brandItemList(brands: BrandSummary[]): JsonLdNode {
  return {
    "@type": "ItemList",
    numberOfItems: brands.length,
    itemListElement: brands.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      url: abs(`/marca/${b.slug}`),
    })),
  };
}

/**
 * /explorar: el directorio de marcas. El ItemList se corta en las 100 más
 * usadas (ya vienen ordenadas): el resto sigue enlazado en el HTML por
 * BrandIndex, y un JSON-LD con mil entradas solo engordaría la página.
 */
export function directoryJsonLd(allBrands: BrandSummary[]): JsonLdNode {
  const brands = allBrands.slice(0, 100);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": abs("/explorar"),
        url: abs("/explorar"),
        name: "Explorar marcas",
        inLanguage: "es",
        isPartOf: { "@id": websiteId },
        mainEntity: brandItemList(brands),
      },
      breadcrumb([
        { name: "Inicio", path: "/" },
        { name: "Explorar marcas", path: "/explorar" },
      ]),
    ],
  };
}

/** /categoria/[slug]: las marcas con ofertas en esa categoría. */
export function categoryJsonLd(category: Category, brands: BrandSummary[]): JsonLdNode {
  const path = `/categoria/${category.slug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": abs(path),
        url: abs(path),
        name: `Códigos y referidos de ${category.name}`,
        inLanguage: "es",
        isPartOf: { "@id": websiteId },
        mainEntity: brandItemList(brands),
      },
      breadcrumb([
        { name: "Inicio", path: "/" },
        { name: "Explorar marcas", path: "/explorar" },
        { name: category.name, path },
      ]),
    ],
  };
}

/** Perfil público: ProfilePage con la persona como entidad principal. */
export function profileJsonLd(publisher: Publisher): JsonLdNode {
  const path = `/u/${publisher.username}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": abs(path),
        url: abs(path),
        inLanguage: "es",
        isPartOf: { "@id": websiteId },
        dateCreated: publisher.joinedAt,
        mainEntity: {
          "@type": "Person",
          name: publisher.name,
          alternateName: `@${publisher.username}`,
          ...(publisher.bio && { description: publisher.bio }),
          ...(publisher.avatarUrl && { image: publisher.avatarUrl }),
        },
      },
      breadcrumb([
        { name: "Inicio", path: "/" },
        { name: publisher.name, path },
      ]),
    ],
  };
}

/**
 * Serializa para un <script type="application/ld+json">. El escape de `<` no es
 * opcional: el JSON lleva texto de usuarios (bios, títulos) y un
 * "</script>" dentro cerraría la etiqueta e inyectaría HTML.
 */
export function serializeJsonLd(data: JsonLdNode): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
