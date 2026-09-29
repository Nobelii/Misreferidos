import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/queries";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { brands, profiles } = await getSitemapEntries();

  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
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
  ];
}
