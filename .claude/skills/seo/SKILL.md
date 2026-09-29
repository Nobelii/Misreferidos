---
name: seo
description: SEO técnico y de contenido para MisReferidos (Next.js 16): metadata, canónicas, robots, sitemap, datos estructurados JSON-LD, indexabilidad, enlazado interno, Core Web Vitals y contenido que Google entienda. Úsala al crear o cambiar cualquier página pública (/, /marca/[slug], /u/[username] o rutas nuevas), al tocar app/sitemap.ts, app/robots.ts, generateMetadata, lib/seo.ts, o cuando se pida mejorar posicionamiento, tráfico orgánico o rich results.
---

# SEO en MisReferidos

Qué posiciona este producto: **"código de referido <marca>"**, "cupón <marca>",
"<marca> meses gratis", "descuento <marca>". La unidad de SEO es la **ficha de
marca** (`/marca/[slug]`). Todo lo demás (home, perfiles) existe para enlazar a
ellas y dar confianza.

## 1. Indexabilidad (lo primero; sin esto nada importa)

- Página pública = **estática y completa en el HTML inicial**. Verifícalo con la
  skill `nextjs-cache-isr` (sección "Cómo verificar"). Contenido que solo llega
  por JS se indexa tarde o nunca.
- Estado HTTP real: 200 para lo que existe, 404 para lo que no (lo pone el
  proxy para `/marca/*` y `/u/*`), 301/308 para lo que se movió. Nunca
  "soft 404" (200 con "no encontrado").
- `robots.txt` (`app/robots.ts`): `Disallow` solo para lo que no debe rastrearse
  (`/app/`). Para lo que no debe **indexarse**, `noindex` por metadata y SIN
  Disallow (si no, Google no puede leer el noindex). Así está `/auth/*`
  (`app/auth/layout.tsx`).
- Zonas con sesión (`/app/*`): `noindex, follow` (`app/app/layout.tsx`).
- Nada de contenido indexable detrás de login: solo `/app/*` pide sesión.

## 2. Metadata (`generateMetadata` / `export const metadata`)

Cada página pública indexable necesita:
- `title` único, 50–60 caracteres, con la keyword al principio:
  `Códigos y referidos de {Marca} | MisReferidos`.
- `description` única, 140–160 caracteres, con el gancho real (valor de la mejor
  oferta, nº de ofertas). Nada de descripciones genéricas repetidas.
- `alternates.canonical` **relativa** (metadataBase la hace absoluta). Las
  variantes con query (`?oferta=`) canonicalizan a la ficha limpia.
- `openGraph` con `title`, `description`, `url` e imagen (logo de la marca o
  avatar si existe; si no, hereda `app/opengraph-image.png`).
- La canónica NUNCA en el layout raíz: todas las páginas sin la suya apuntarían a `/`.
- `NEXT_PUBLIC_SITE_URL` definido en producción (metadataBase, sitemap, JSON-LD).
- `GOOGLE_SITE_VERIFICATION` opcional para Search Console.

## 3. Datos estructurados (JSON-LD)

Helpers en `lib/seo.ts`, componente `components/json-ld.tsx` (Server Component,
escapa `<` para que un texto de usuario no cierre el `<script>`).

| Página | Marcado |
|---|---|
| `/` | `Organization` + `WebSite` (`siteJsonLd`) |
| `/marca/[slug]` | `CollectionPage` (about: `Brand`, mainEntity: `ItemList` de `Offer`) + `BreadcrumbList` |
| `/u/[username]` | `ProfilePage` (mainEntity: `Person`) + `BreadcrumbList` |

Reglas:
- Solo marca lo que la página enseña. Nada de `AggregateRating`/`Review` con
  los votos "¿te sirvió?" (no son reseñas: acción manual de Google).
- Nada de `price: 0` inventado en `Offer`.
- `SearchAction` (sitelinks searchbox) solo cuando exista una búsqueda pública
  por URL (`/buscar?q=`). Hoy no la hay.
- URLs absolutas (`siteUrl`), referencias cruzadas por `@id`.
- Valida con https://validator.schema.org y la Prueba de resultados enriquecidos.

## 4. Sitemap (`app/sitemap.ts`)

- Solo URLs canónicas, indexables, con 200. Marcas con ≥1 oferta activa y
  perfiles con ≥1 referido activo (lo vacío es contenido pobre).
- `lastModified` real (`last_published_at`), no `new Date()`.
- Cacheado con el tag `catalog`: una marca nueva aparece al publicar.
- Límite de 50.000 URLs/archivo: al acercarse, `generateSitemaps()` para partirlo.
- `changeFrequency`/`priority` los ignora Google; no pierdas tiempo afinándolos.

## 5. Arquitectura y enlazado interno

- Toda página indexable debe recibir enlaces HTML (`<Link href>`) desde otras
  indexables. El sitemap no sustituye al enlazado.
- Anchor text descriptivo ("Códigos de Netflix"), no "ver más".
- Cómo está montado hoy:
  - `/explorar`: directorio público. El grid pagina en el cliente, así que
    debajo va `BrandIndex` (todas las marcas A–Z como enlaces) y
    `CategoryLinks`.
  - `/categoria/[slug]`: marcas con ofertas en la categoría + otras categorías.
    Las vacías llevan `noindex` y no salen en el sitemap.
  - Home: el panel de categorías enlaza a `/categoria/*`; "Ver todas las marcas".
  - Ficha de marca: "Más marcas de {categoría}" y "Explorar todas las marcas".
- Siguientes oportunidades: bloque "Marcas similares" con tarjetas en la ficha
  de marca; enlaces a categorías top en el footer.
- Sin enlaces rotos: comprueba cada `href` interno nuevo contra el build.

## 6. Contenido (lo que hace que Google "ame" la ficha)

- H1 único con la marca y la intención ("Códigos y referidos de Netflix").
- Texto propio útil sobre la marca: cómo funciona su programa de referidos,
  qué gana cada parte, cómo canjearlo. `brands.description` hoy tiene 280
  caracteres máx.: poco para posicionar; valora un campo largo moderado.
- Señales de frescura visibles: "Actualizado", "Usado hace 2 h", nº de usos.
- FAQ visible (y solo entonces `FAQPage` en JSON-LD) con preguntas reales.
- Evita contenido duplicado entre marcas: plantillas con variables no bastan.
- E-E-A-T: perfiles públicos con reputación, verificación visible, política de
  moderación y páginas legales.

## 7. Core Web Vitals (ranking + UX)

- LCP < 2,5 s: HTML estático desde CDN, fuentes con `display: swap` (ya), imagen
  LCP con `priority`, nada pesado inline (el hero pesaba 2,1 MB por un SVG
  inline; ahora es `public/hero/*.svg`).
- CLS < 0,1: skeletons con las mismas dimensiones que el contenido final;
  `width`/`height` en imágenes.
- INP < 200 ms: poco JS de cliente; componentes de cliente pequeños y en hojas.
- Mide con Lighthouse / PageSpeed Insights sobre el build de producción, no dev.

## 8. Checklist de una página pública nueva

- [ ] Estática (`○`) y con todo el contenido en el HTML inicial.
- [ ] `title`, `description`, `canonical`, `openGraph` únicos.
- [ ] JSON-LD adecuado con `JsonLd`.
- [ ] En el sitemap si es indexable; `noindex` si no lo es.
- [ ] Enlazada desde al menos una página indexable.
- [ ] 404 real si el recurso no existe.
- [ ] Un solo H1; jerarquía H2/H3 coherente.
- [ ] Imágenes con `alt` descriptivo (o `alt=""` si son decorativas).
