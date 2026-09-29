# MisReferidos — Estructura

Plataforma comunitaria para compartir beneficios: descuentos, meses gratis,
envíos gratis, bonos y códigos que la gente usa de verdad.

**No es una plataforma de afiliados.** No hay comisiones, ganancias ni
conversiones en ninguna parte del modelo. Las métricas que importan son
**alcance** (vistas, copias, clics, guardados) y **confianza** (verificación,
reportes, moderación). Un código puede tener comisión o no; el producto no
depende de eso.

## Stack

Next.js 16 (App Router, Cache Components) · Supabase (Postgres + Auth) ·
Tailwind · shadcn/ui · TypeScript.

## Cómo fluyen los datos

```
Postgres  ──RLS──>  lib/queries.ts   ──>  Server Components  ──>  UI
                    lib/actions.ts   <──  Client Components (useTransition)
```

- **Toda lectura pasa por [lib/queries.ts](lib/queries.ts)**, con el cliente de
  servidor. El RLS decide qué se devuelve: no hay filtros de seguridad en el
  cliente. Una query que pida algo que no le toca recibe cero filas.
- **Toda escritura pasa por [lib/actions.ts](lib/actions.ts)** (server actions).
- Los enums de Postgres son la única fuente de verdad de los tipos: se generan en
  [lib/database.types.ts](lib/database.types.ts) y se re-exportan desde
  [lib/types.ts](lib/types.ts). La traducción al español vive **solo** en
  [lib/labels.ts](lib/labels.ts) y en `BENEFIT_TYPE_META` / `TAG_STYLES`
  ([lib/benefit-format.ts](lib/benefit-format.ts)).

## Principios del modelo

**Lo derivable no se almacena.** El tag ("Nuevo", "Termina pronto"), el nivel de
confianza, el "necesita atención" y el `cta_label` se calculan en vistas SQL o en
funciones puras. Lo único denormalizado son los contadores (`views_count`,
`copies_count`, `clicks_count`, `saves_count`, `helpful_count`), porque el grid
de Explorar los lee en cada tarjeta y agregarlos al vuelo no escala.

**Los contadores son de solo lectura desde la app.** Los suben triggers a partir
de `referral_events`. Nadie puede inflar sus propias métricas: el trigger
`guard_referral_moderation` rechaza cualquier UPDATE que los toque.

**La actividad se genera en la base, no en las actions.** Triggers en Postgres
insertan en `activity`, así que se produce venga la escritura de donde venga.
Nunca te notificas por tu propia acción, se respetan las preferencias del dueño y
hay anti-spam de una hora por tipo y referido.

**Todo se publica al instante.** Un referido nace en `active` y una marca en
`approved`: no hay aprobación previa (migración `20260728000000`). Las columnas
`status` siguen existiendo, pero solo para estados operativos — `expired` lo
pone el cron, `archived` lo pone el autor al pausar, y `rejected` es la vía del
staff para retirar algo reportado. La moderación es *a posteriori*, sobre la
cola de reportes de `/app/moderacion`.

## Rutas

| Ruta | Quién | Qué |
|---|---|---|
| `/` | Público | Landing: hero, métricas y las 24 marcas más usadas |
| `/explorar` | Público | Directorio de **marcas**: buscador (`?q=`), filtros, orden, categorías e índice A–Z |
| `/categoria/[slug]` | Público | Marcas con ofertas activas en una categoría |
| `/marca/[slug]` | Público | Ficha de marca: cabecera + sus ofertas. `?oferta=[id]` abre el modal de detalle |
| `/u/[username]` | Público | Perfil público de quien publica |
| `/privacidad`, `/terminos` | Público | Páginas legales (texto genérico; falta revisión legal y datos de contacto) |
| `/auth/*` | Público | Login (`?next=` para volver), registro, recuperación. `noindex` |
| `/app/publicar` | Sesión | Alta de un beneficio (se publica al instante) |
| `/app/dashboard` | Dueño | KPIs, necesitan atención, mis beneficios, guardados |
| `/app/perfil` | Dueño | Datos, reputación, preferencias de notificación |
| `/app/moderacion` | Staff | Reportes abiertos. 404 si no eres staff |
| `/app/referido/[id]` | Público | Solo redirige a `/marca/[slug]?oferta=[id]` (enlaces antiguos) |
| `/app`, `/app/explorar` | — | 308 a `/` y `/explorar` (`next.config.ts`) |

Errores: `app/not-found.tsx` (404, con buscador y marcas populares),
`app/error.tsx` (500 de cualquier página, con reintentar y el `digest` para
cruzar con los logs) y `app/global-error.tsx` (si falla el layout raíz; estilos
en línea porque ahí no hay globals.css).

El sitio es público salvo `/app/*`: el proxy
([lib/supabase/proxy.ts](lib/supabase/proxy.ts)) solo exige sesión ahí y manda
a `/auth/login?next=<ruta>`. Tras entrar desde el modal, el usuario se queda en
la página donde estaba.

## Base de datos

16 tablas, 5 vistas, 10 enums. Migraciones en [supabase/migrations/](supabase/migrations/).

**Marcas:** `brands` + la vista `public_brands`, que agrega por marca (nº de
ofertas, usos, votos útiles y la *mejor* oferta) y alimenta el directorio y la
cabecera de `/marca/[slug]`. Agrupa por `coalesce(brands.slug,
referrals.brand_slug)` para no dejar fuera los referidos anteriores a la tabla
`brands`, que no tienen FK.

**Núcleo:** `profiles` (1:1 con `auth.users`), `referrals`, `categories`,
`tags` / `referral_tags`.

**Interacción:** `referral_events` (log append-only: view, code_copy, link_click;
`bump_referral_counter()` denormaliza desde aquí los contadores y `last_used_at`,
porque la tabla es privada por RLS y la ficha pública no puede leerla),
`saved_referrals`, `referral_votes`, `activity`.

**Confianza y moderación:** `reports`, `report_notes` (notas internas, invisibles
para quien reporta — RLS filtra filas, no columnas), `user_roles`, `audit_log`.

**Sistema:** `notification_preferences`, `app_settings`.

### Seguridad
- **Los roles viven en `user_roles`, nunca en `profiles`.** Si el flag de admin
  estuviera en una tabla que el usuario puede editar, la escalada de privilegios
  sería un `UPDATE` trivial.
- Las vistas llevan `security_invoker = true`. Sin eso, una vista corre con los
  permisos de su creador y **se salta el RLS entero**.
- Las funciones de trigger y `expire_referrals()` tienen el `EXECUTE` revocado a
  `anon` y `authenticated`: PostgREST expone toda función de `public` como
  endpoint RPC.

### Caché (Next 16, Cache Components)

Todo lo público se lee con `"use cache"` + `createPublicClient()` (sin cookies —
lo que toca `cookies()` es request-scoped y no puede vivir en un `"use cache"`).
Tres tags, invalidados con `updateTag` desde las server actions:

| Tag | Alimenta | Lo invalida |
|---|---|---|
| `catalog` | `getBrands`, `getCategories`, `getHomeStats` → home y Explorar | publicar, pausar, borrar, retirar, verificar |
| `brand:<slug>` | `getBrandBySlug` + `getOffersByBrand` → ficha de marca | lo anterior, más votar y reportar |
| `publisher:<id>` | `getBenefitsByPublisher` → `/u/[username]` | publicar, pausar, borrar |
| `profile:<username>` | `getPublisherByUsername` | editar el perfil |

**Votar no invalida `catalog`**, y es deliberado: cambia el contador de la
cabecera de marca, no la card del directorio. Si tirase de `catalog`, un solo
voto vaciaría la caché de la home.

Resultado: `/`, `/app`, `/app/explorar` y `/app/publicar` son **estáticas**
(`○`, revalidate 1h). `/marca/[slug]` y `/u/[username]` también, con ISR:
`generateStaticParams` prerenderiza el top 50 en el build y, con
`partialPrefetching`, el resto sirve el App Shell en su primera visita y queda
estático para las siguientes. Salen de la CDN con `s-maxage` y con todo el
contenido (ofertas y JSON-LD) en el HTML inicial.

Para que sigan así, en esas páginas no puede haber nada de request:
- Lo del usuario (guardados, votos) lo lee `useMyInteractions()` en el cliente.
- `?oferta=` lo lee `BrandOffers` al montar, no la página.
- La hora solo tras hidratar, con `useNow()`: leerla en el render — también en
  un componente de cliente — aplaza el Suspense al navegador y el contenido sale
  del HTML estático.

Detalle y cómo verificarlo: skill `.claude/skills/nextjs-cache-isr/`.

### Cron (pg_cron)
- `expire-referrals` — cada hora, vence los caducados.
- `refresh-popular-threshold` — cada noche, recalcula el percentil 80 real de
  vistas para el tag "Más usado".

## Desarrollo

`pnpm dev` directo contra el proyecto de Supabase en la nube; no hay base local
ni seed. No hay cuentas precargadas: los usuarios se registran desde la app y
el rol admin se asigna a mano en `user_roles` (ver [README](README.md)).

## Tests

| Capa | Dónde | Comando |
|---|---|---|
| Funciones puras | `lib/__tests__/` (Vitest) | `pnpm test` |
| RLS, guards y límites | `supabase/tests/database/` (pgTAP vía psql, en transacción con rollback) | `pnpm test:db` |

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) corre siempre lint,
tipos y unitarios. Build y pgTAP necesitan un proyecto de Supabase y solo
corren si el repo tiene los secrets configurados.

## Límites de frecuencia

Trigger `enforce_rate_limit` (migración `20260928010000`), exento para staff:
10 referidos, 5 marcas y 20 reportes por usuario y hora. Va en la base porque
la publishable key es pública y se puede saltar la app.

Los eventos (`referral_events`) se deduplican por hora con `session_hash`
(uid o IP + user-agent, hasheado). Frena recargas, no a quien llame a PostgREST
directamente con hashes inventados.

## 404

`/marca/[slug]` y `/u/[username]` son PPR: el shell sale con 200 antes de que
la página corra `notFound()`. Por eso el proxy
([lib/supabase/proxy.ts](lib/supabase/proxy.ts)) comprueba si la entidad existe
y, si no, reescribe a la página 404 con status 404. Es una consulta extra por
visita a esas rutas.

## Skills y agentes

En `.claude/`: skills `supabase-backend` (RLS, vistas, funciones, queries),
`nextjs-cache-isr` (caché, ISR y cómo verificar el HTML) y `seo`; agente
`seo-reviewer` para auditar el sitio contra el build de producción.

## Pendiente

- `set_referral_slugs()` calcula `brand_slug` con slugify(brand) aunque haya
  `brand_id`: si una marca recibió slug con sufijo (`cafe-1a2b3c`), sus ofertas
  quedan bajo `/marca/cafe`. Debería copiar `brands.slug` cuando hay FK.
- Búsqueda en el servidor para Explorar. Hoy carga hasta 1000 marcas (tope de
  PostgREST), filtra en el cliente y pagina el render. Al pasar de ~1000 marcas
  hay que mover el filtro al servidor (índice trigram en `brands.name`).
- Eventos solo desde el servidor (quitar el INSERT a `anon` en
  `referral_events`) para que no se puedan inflar vistas llamando a PostgREST.
- Migrar los 10 avisos de `react-hooks/set-state-in-effect` (hoy en `warn`).
- Activar la protección de contraseñas filtradas en el dashboard de Auth
  (requiere plan Pro).
