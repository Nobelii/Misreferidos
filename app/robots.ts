import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/"],
      // /app es la zona con sesión: el proxy redirige a login, así que el
      // crawler solo gastaría presupuesto en redirecciones.
      //
      // /auth NO va aquí a propósito: lleva noindex (app/auth/layout.tsx), y un
      // Disallow impediría que Google llegara a leerlo.
      disallow: ["/app/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
