# Next.js 16 — Rendering & Cache

Next.js 16 eliminó ISR implícito. El cache ahora es explícito.

## Directiva `"use cache"`

Agregar al inicio de un componente async para habilitar cache. Sin esta directiva, la página es SSR puro.

## `cacheLife(preset)`

Controla el TTL del cache. Presets: `'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'max'` (indefinido).

## `cacheTag(tag)`

Asigna un tag al cache para invalidar on-demand. Combinado con `cacheLife('max')` = contenido cacheado indefinidamente hasta que algo lo invalide.

## `revalidateTag(tag)`

Llamar desde una mutation (API route, server action) para invalidar todo el contenido marcado con ese tag.

## Cuándo usar cada estrategia

| Necesidad | Estrategia | Directivas |
|-----------|-----------|------------|
| Contenido que cambia poco (home, listados) | ISR con timer | `"use cache"` + `cacheLife('hours')` |
| Contenido que invalidas al editar | ISR on-demand | `"use cache"` + `cacheLife('max')` + `cacheTag` + `revalidateTag` en mutation |
| Contenido 100% estático desde data local | SSG | `generateStaticParams` + no fetch dinámico |
| Cada request es única (búsqueda, dashboard) | SSR | No poner `"use cache"` |

## `generateStaticParams`

Para SSG. Retorna array de params para pre-generar en build. Usar solo con data conocida en build time (JSON local, catálogos fijos).

## Regla clave

La spec de cada feature define qué estrategia usar. Este skill solo enseña cómo implementarla.

---

## `next/image` — Dimensionado con CSS

Cuando se override el tamaño de un `<Image>` vía CSS, el otro eje **debe** usar inline style `width: 'auto'` / `height: 'auto'`, no clase Tailwind.

```tsx
// ✅ Correcto
<Image width={240} height={64} className="h-16" style={{ width: 'auto' }} />

// ❌ Dispara advertencia de aspect ratio — Next.js lee img.style, no getComputedStyle
<Image width={240} height={64} className="h-16 w-auto" />
```
