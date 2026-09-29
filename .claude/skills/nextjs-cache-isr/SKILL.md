---
name: nextjs-cache-isr
description: Cómo funciona la caché y el renderizado en MisReferidos (Next.js 16 con Cache Components, PPR e ISR vía generateStaticParams + partialPrefetching). Úsala antes de crear o modificar una página, un layout, una query cacheada ("use cache", cacheTag, cacheLife), una invalidación (updateTag) o cualquier componente que se renderice en una página pública. También para diagnosticar por qué una página sale dinámica, con Cache-Control no-store, o con contenido que no aparece en el HTML.
---

# Caché y renderizado — Next 16 + Cache Components

Documentación de la versión instalada (fuente de verdad, no la memoria):
`node_modules/next/dist/docs/01-app/` — en especial
`02-guides/incremental-static-regeneration-cache-components.md` y
`01-getting-started/*caching*`.

## Objetivo

Toda página pública (`/`, `/marca/[slug]`, `/u/[username]`) debe salir **estática
de la CDN** (`○` en el build, `Cache-Control: s-maxage=...`) y con **todo su
contenido en el HTML inicial**: es lo que ve Googlebot en la primera pasada y lo
que da buen LCP/TTFB. Lo del usuario en sesión se resuelve en el cliente.

## Modelo

| Pieza | Qué hace aquí |
|---|---|
| `"use cache"` + `cacheLife("hours")` + `cacheTag(...)` | Todas las lecturas públicas de `lib/queries.ts`, con `createPublicClient()` |
| `updateTag(tag)` en server actions | Invalida con read-your-own-writes (quien publica lo ve al instante) |
| `generateStaticParams` | Prerenderiza en el build las marcas/perfiles top (≥1 param obligatorio) |
| `partialPrefetching: true` | Las URLs no listadas sirven el App Shell y quedan estáticas tras la 1ª visita (ISR) |
| `loading.tsx` / `<Suspense>` | Frontera para lo que aún no se conoce (params no listados, datos de request) |

Tags vigentes: tabla en STRUCTURE.md (`catalog`, `brand:<slug>`,
`publisher:<id>`, `profile:<username>`).

## Lo que vuelve dinámica una página (evítalo en páginas públicas)

1. **`cookies()` / `headers()`** en el árbol (incluido `createClient()` del
   servidor, `getCurrentUserId()`, `getMyInteractions()`). → Muévelo al cliente
   (patrón `useMyInteractions`) o a una ruta privada.
2. **`await searchParams`** en la página. → Léelo en el cliente tras montar
   (patrón `BrandOffers`: `window.location.search` en el efecto). No uses
   `useSearchParams()` en listas indexables: obliga a render solo-cliente hasta
   el Suspense más cercano y el contenido desaparece del HTML.
3. **Leer la hora** (`new Date()`, `Date.now()`) durante el render. En un Server
   Component rompe el build; en un **Client Component** es peor porque no avisa:
   Next aplaza el `<Suspense>` entero al navegador y el HTML estático sale con el
   skeleton. → Usa `useNow()` (`components/use-now.ts`): null en el servidor,
   la hora al hidratar. Pasa `now` explícito a `formatExpiry`, `isEndingSoon`,
   `recentUseLabel`.
4. **Datos sin `"use cache"`** fuera de un Suspense → error de build; dentro →
   streaming por request (no cacheable).
5. `cacheLife` muy corto (`seconds`, `minutes`) excluye el dato del prerender.

## Cómo verificar (hazlo siempre tras tocar una página pública)

```bash
pnpm build                    # mira la tabla: ○ estático, ◐ PPR, ƒ dinámico
pnpm next start -p 3100 &
curl -sI localhost:3100/marca/netflix | grep -i -E "cache-control|x-nextjs"
# Esperado: Cache-Control: s-maxage=3600, stale-while-revalidate=...
```

¿El contenido está en el HTML estático o solo en el payload RSC?

```bash
f=.next/server/app/marca/netflix.html
grep -o '<!--\$?-->' $f | wc -l          # fronteras pendientes en el HTML
grep -o '\$RC("B:[0-9]*","S:[0-9]*")' $f  # cada pendiente debe tener su $RC
grep -c 'ld+json">' $f                    # el JSON-LD debe ir como <script> real
```

Un `<!--$?-->` sin su `$RC("B:n","S:n")` = contenido que solo llega por JS.

Y el peso: `ls -la .next/server/app/index.html .next/server/app/index.rsc`. La
home debe estar muy por debajo de 200 KB. (Tenía 2,1 MB por 6.500 `<circle>`
inline; ahora son `public/hero/*.svg` generados con `pnpm gen:hero`.)

## Reglas

- Una query pública nueva: `"use cache"` + `cacheLife` + `cacheTag` + cliente
  público, y añade su invalidación en las actions que la cambian.
- No invalides `catalog` por algo que no cambia el directorio (votos).
- En `generateStaticParams` devuelve el top (≈50), no todo: el resto se genera
  bajo demanda. Con la base vacía, devuelve un placeholder (lo exige Cache Components).
- Lanza en paralelo las lecturas independientes de una página (promesa creada
  arriba, `await` dentro del Suspense).
- El 404 real de rutas con param lo pone el proxy (`lib/supabase/proxy.ts`), con
  consultas indexadas y baratas: corre en cada visita, también en las cacheadas.
- Dibujos/decoración pesada: asset estático en `public/`, nunca miles de nodos
  en JSX de un Server Component (van al HTML Y al payload RSC).
- `/public` no tiene hash: su Cache-Control se define en `next.config.ts`
  (`headers()`), por rutas explícitas.
