import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/marca/", "/u/"],
      // Zonas con sesión o sin valor para el índice. El proxy ya redirige a
      // login, pero así el crawler no gasta presupuesto en ellas.
      disallow: ["/app/", "/auth/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
