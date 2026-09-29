import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // ISR con Cache Components: las /marca/[slug] y /u/[username] que no salen
  // en generateStaticParams sirven el App Shell en su primera visita y quedan
  // estáticas para las siguientes. Sin esto se renderizan en cada request.
  // Ver node_modules/next/dist/docs/01-app/02-guides/incremental-static-regeneration-cache-components.md
  partialPrefetching: true,
  // Los archivos de /public no llevan hash en el nombre, así que Next los sirve
  // con max-age=0 (el navegador revalida en cada visita). Un día de caché más
  // una semana de stale-while-revalidate: si cambia un archivo con el mismo
  // nombre, como mucho se ve el viejo un día.
  async headers() {
    // Rutas explícitas y no un patrón por extensión: uno genérico también
    // casaría con /_next/static, que ya sale `immutable` y no hay que tocar.
    const cache = [
      {
        key: "Cache-Control",
        value: "public, max-age=86400, stale-while-revalidate=604800",
      },
    ];
    return [
      { source: "/hero/:path*", headers: cache },
      { source: "/logomisreferidos.png", headers: cache },
    ];
  },
  // URLs que se movieron cuando Explorar pasó a ser pública. 308 (permanente):
  // conserva los enlaces ya compartidos y le dice a Google que transfiera la
  // señal a la nueva URL. Van antes del proxy, así que no piden sesión.
  async redirects() {
    return [
      { source: "/app", destination: "/", permanent: true },
      { source: "/app/explorar", destination: "/explorar", permanent: true },
    ];
  },
  images: {
    // Logos de marca y avatares servidos desde el bucket público de Supabase Storage.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
