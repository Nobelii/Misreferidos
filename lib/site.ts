/**
 * URL pública canónica del sitio. La usan metadataBase, sitemap, robots y las
 * imágenes OG, que necesitan URLs absolutas.
 *
 * VERCEL_URL no sirve como canónica: es la URL del deployment concreto
 * (xxx-git-rama.vercel.app), no el dominio. Queda solo como respaldo para las
 * previews.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const siteName = "MisReferidos";
