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
| `/` | Público | Landing con el directorio de marcas |
| `/u/[username]` | Público | Perfil público de quien publica |
| `/marca/[slug]` | Público | Ficha de marca: cabecera + sus ofertas. `?oferta=[id]` abre el modal de detalle |
| `/app` | Sesión | Home del catálogo |
| `/app/explorar` | Sesión | Directorio de **marcas**: buscador, filtros y orden |
| `/app/referido/[id]` | Público | Solo redirige a `/marca/[slug]?oferta=[id]` (enlaces antiguos) |
| `/app/publicar` | Sesión | Alta de un beneficio (se publica al instante) |
| `/app/dashboard` | Dueño | KPIs, necesitan atención, mis beneficios, guardados |
| `/app/perfil` | Dueño | Datos, reputación, preferencias de notificación |
| `/app/moderacion` | Staff | Reportes abiertos. 404 si no eres staff |
| `/auth/*` | Público | Login, registro, recuperación |

El middleware ([lib/supabase/proxy.ts](lib/supabase/proxy.ts)) protege `/app/*`;
`/` y `/u/*` son públicas a propósito.

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
(`○`, revalidate 1h). `/marca/[slug]` y `/u/[username]` son PPR: shell estático
+ la parte del usuario en streaming.

### Cron (pg_cron)
- `expire-referrals` — cada hora, vence los caducados.
- `refresh-popular-threshold` — cada noche, recalcula el percentil 80 real de
  vistas para el tag "Más usado".

## Cuentas de demo

- `luis@misreferidos.dev` / `demo1234` — rol **admin**, ve `/app/moderacion`.
- `maria@misreferidos.dev` / `demo1234` — usuaria normal.

## Pendiente

- 404 real en `/u/[username]` y `/marca/[slug]` inexistentes: hoy devuelven 200.
  Medido en build de producción — la respuesta trae `x-nextjs-prerender: 1` y
  `x-nextjs-postponed: 1`, o sea que es el shell prerenderizado y las cabeceras
  salen antes de que corra nada en request. **Probado y descartado:** mover el
  `notFound()` a `generateMetadata()` no cambia el status. La única salida es
  comprobar la existencia en el middleware.
  No afecta al SEO mientras tanto: Next pone `<meta name="robots"
  content="noindex">` en la página de not-found y no lo pone en las que existen.
- Búsqueda server-side y paginación en Explorar. Los índices `search_vector` y
  trigram están creados pero sin usar; hoy se filtra en el cliente, que con este
  volumen es más rápido.
- Subida de avatar (falta el bucket de Storage; `avatar_url` ya existe).
- Activar la protección de contraseñas filtradas en el dashboard de Auth.
