---
name: supabase-backend
description: Reglas y mejores prácticas de Supabase (Postgres, RLS, Auth, Storage, PostgREST) para el backend de MisReferidos. Úsala SIEMPRE antes de escribir o revisar una migración SQL, una policy RLS, una vista, una función/trigger, una query en lib/queries.ts, una server action en lib/actions.ts, o cualquier código que use el cliente de Supabase. También para diagnosticar lentitud de la base o errores de permisos.
---

# Supabase en MisReferidos — reglas de backend

La base es la frontera de seguridad. La publishable key es pública: **cualquiera
puede saltarse la app y hablar con PostgREST directamente**. Todo lo que importe
(quién ve qué, quién escribe qué, límites, contadores) se decide en Postgres, no
en Next.

## 0. Antes de tocar nada

1. Lee la versión VIGENTE de lo que vas a cambiar. Las policies y vistas se han
   recreado varias veces: la última migración que la toca es la que manda.
   ```bash
   grep -ln "nombre_de_la_policy_o_vista" supabase/migrations/*
   ```
2. Nunca edites una migración ya aplicada. Crea una nueva:
   `supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql`.
3. Aplicar a remoto (`pnpm db:push`) es irreversible en la práctica y afecta a
   producción: **pide confirmación al usuario antes**.
4. Si la migración añade o cambia columnas, vistas o funciones, regenera tipos:
   `pnpm db:types` (o edita `lib/database.types.ts` a mano si no hay CLI
   enlazada, respetando el formato generado).
5. Código que depende de un objeto SQL nuevo **rompe el build** hasta que la
   migración esté aplicada (el build prerenderiza contra la base real). Avisa
   del orden: primero `db:push`, luego deploy.

## 1. RLS

### Obligatorio
- `alter table ... enable row level security` en TODA tabla de `public`.
- Envuelve las funciones en `(select ...)` dentro de las policies:
  ```sql
  -- MAL: se evalúa una vez por fila
  using (owner_id = auth.uid() or public.is_staff())
  -- BIEN: InitPlan, una vez por consulta
  using (owner_id = (select auth.uid()) or (select public.is_staff()))
  ```
  Vale para `auth.uid()`, `auth.jwt()`, `is_staff()`, `has_role()`. Es el aviso
  `auth_rls_initplan` del Performance Advisor.
- Una sola policy permisiva por (tabla, acción, rol). Varias se evalúan TODAS y
  se unen con OR: fusiónalas en una con OR (aviso `multiple_permissive_policies`).
- Nada de `for all` para el staff si ya hay una policy de SELECT: parte en
  `insert` / `update` / `delete`.
- Especifica siempre el rol: `to anon, authenticated` o `to authenticated`.
- En UPDATE pon `using` Y `with check` (si no, se puede mover una fila a otro
  dueño).
- Las columnas que el usuario no debe poder tocar (contadores, verificación,
  estado reservado, owner) se protegen con un trigger `BEFORE UPDATE` (ver
  `guard_referral_moderation`), no con la policy: RLS filtra filas, no columnas.

### Roles
- Los roles viven en `user_roles`, **nunca** en `profiles` (que el usuario edita).
- `is_staff()` / `has_role()` son `security definer` para evitar recursión.

### Índices para RLS
Toda columna usada en una policy (`owner_id`, `user_id`, `created_by`,
`reporter_id`...) necesita índice. Sin él, la policy es un seq scan.

## 2. Vistas

- **Siempre** `with (security_invoker = true)`. Sin eso la vista corre como su
  dueño (postgres, BYPASSRLS) y se salta el RLS entero.
- `create or replace view` solo admite columnas NUEVAS AL FINAL y exige el mismo
  orden/nombre del resto. Copia el SELECT completo de la última versión.
- `grant select on public.<vista> to anon, authenticated;` después de crearla.
- Un filtro sobre una vista con `GROUP BY` solo se empuja dentro del agregado si
  la columna está en el `GROUP BY`. Si filtras por `username`, agrupa también
  por `username` (ver `public_profiles`), o la vista agrega todo y filtra al final.
- Cuidado con las vistas que agregan todo el catálogo (`public_brands`): no las
  uses en caminos calientes sin caché (proxy, cada request). Para "¿existe?",
  consulta la tabla base con columnas indexadas.

## 3. Funciones y triggers

- Función nueva en `public` = endpoint RPC público (`/rest/v1/rpc/<nombre>`).
- `security definer` ⇒ SIEMPRE:
  ```sql
  set search_path = public            -- en la definición
  revoke execute on function public.f(...) from public, anon, authenticated;
  ```
  Revocar solo de `anon, authenticated` NO basta: Postgres da EXECUTE a PUBLIC
  por defecto y lo heredan (migración 20260714010000).
- `create or replace function` **descarta** los `SET` no redeclarados: repite
  `set search_path` siempre.
- Los triggers no necesitan EXECUTE del rol que dispara.
- Prefiere `security invoker` (el RLS contiene la función) salvo que necesites
  saltarte una policy de forma controlada.
- Backfills: desactiva triggers con efectos (p. ej. `referrals_activity`) durante
  el UPDATE masivo y reactívalos después.

## 4. Consultas desde Next (`lib/queries.ts`)

### Qué cliente usar
| Situación | Cliente |
|---|---|
| Dato público, cacheable (`"use cache"`) | `createPublicClient()` (sin cookies, rol anon) |
| Dato del usuario en sesión (Server Component / action) | `createClient()` de `lib/supabase/server.ts` |
| Dato del usuario desde el navegador | `createClient()` de `lib/supabase/client.ts` |
| Proxy (middleware) | el `createServerClient` de `lib/supabase/proxy.ts` |

Nunca `cookies()` dentro de `"use cache"`: es request-scoped y rompe la caché.
Nunca la service role key en código que se ejecute por petición de un usuario.

### Rendimiento
- **Tope de 1000 filas** (`max_rows` de PostgREST). Nunca traigas filas para
  contarlas o sumarlas en JS: agrega en SQL (vista o `count: 'exact', head: true`).
  Ver `public_catalog_stats` / `public_category_counts`.
- Selecciona columnas explícitas (`CARD_COLUMNS`), no `*`, en listados.
- Lanza en paralelo lo independiente (`Promise.all`); no encadenes `await`.
- Evita N+1: embebe relaciones (`select("*, categories(name)")`) o usa vistas.
  Si PostgREST dice que el embed es ambiguo, nombra la FK:
  `profiles!referrals_owner_id_fkey(...)`.
- `.single()` falla si no hay fila; usa `.maybeSingle()` cuando puede no existir.
- Comprueba `error` en lecturas que alimentan páginas: un fallo silencioso
  cacheado durante horas es peor que un error visible.

### Auth
- Lecturas: `getClaims()` (verifica el JWT en local, sin red). Ya está en
  `getCurrentUserId()`.
- Acciones sensibles (publicar, editar perfil, subir archivos): `getUser()` está
  bien, valida contra el servidor de Auth.
- Caminos calientes (eventos, proxy): `getClaims()`, nunca `getUser()`.
- Redirecciones con `?next=`: pásalas siempre por `safeNextPath()` (lib/utils).

## 5. Server actions (`lib/actions.ts`)

- Autentica primero; `redirect("/auth/login")` si no hay sesión.
- No repliques en JS las validaciones que ya son CHECK en la tabla: traduce el
  error de Postgres a un mensaje legible (patrón de `publishReferral`).
- Límites de frecuencia en la base (`enforce_rate_limit`), no en la action.
- Tras escribir, invalida con `updateTag` (read-your-own-writes) los tags de
  caché afectados. Tabla de tags en STRUCTURE.md. No invalides `catalog` por
  acciones que no cambian el directorio (votar): vaciaría la caché de la home.

## 6. Storage

- Buckets públicos servidos por CDN: **sin** policy de SELECT amplia (permitiría
  listar el bucket entero).
- Escritura solo en la carpeta propia: `(storage.foldername(name))[1] = (select auth.uid())::text`.
- Tamaño y MIME en el propio bucket (`file_size_limit`, `allowed_mime_types`), no
  solo en la action. Nada de SVG subido por usuarios (puede llevar scripts).
- Nombres de archivo únicos (timestamp) y `cacheControl` largo: el CDN cachea por URL.

## 7. Checklist de revisión de una migración

- [ ] RLS activado en tablas nuevas, con policies para cada acción necesaria.
- [ ] `(select auth.uid())` / `(select is_staff())` en todas las policies.
- [ ] Una policy permisiva por acción y rol.
- [ ] Índices en FKs y en columnas de policies / filtros / ORDER BY.
- [ ] Vistas con `security_invoker = true` + `grant select`.
- [ ] Funciones `security definer` con `search_path` y `revoke ... from public`.
- [ ] `create or replace` de vista: columnas en el mismo orden, nuevas al final.
- [ ] Tests pgTAP en `supabase/tests/database/` si cambia quién ve/escribe qué
      (`pnpm test:db`).
- [ ] Tipos regenerados y código que depende de ello coordinado con el push.

Si hay acceso al MCP de Supabase del proyecto, ejecuta `get_advisors`
(`security` y `performance`) después de cada cambio de DDL.
