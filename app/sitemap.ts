import type { MetadataRoute } from "next";
import { getCategories, getSitemapEntries } from "@/lib/queries";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ brands, profiles }, categories] = await Promise.all([
    getSitemapEntries(),
    getCategories(),
  ]);

  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/explorar`, changeFrequency: "daily", priority: 0.9 },
    // Solo las categorías con ofertas: las vacías llevan noindex.
    ...categories
      .filter((c) => c.count > 0)
      .map((c) => ({
        url: `${siteUrl}/categoria/${c.slug}`,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ...brands.map((b) => ({
      url: `${siteUrl}/marca/${encodeURIComponent(b.slug)}`,
      lastModified: b.lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...profiles.map((p) => ({
      url: `${siteUrl}/u/${encodeURIComponent(p.username)}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    { url: `${siteUrl}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terminos`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
