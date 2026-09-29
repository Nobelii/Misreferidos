# MisReferidos

Plataforma comunitaria para compartir códigos de referido y beneficios
(descuentos, meses gratis, envíos gratis, bonos) organizados por marca.

La arquitectura, el modelo de datos, la caché y las decisiones de seguridad
están en [STRUCTURE.md](STRUCTURE.md).

**Stack:** Next.js 16 (App Router, Cache Components) · Supabase (Postgres, Auth,
Storage, pg_cron) · Tailwind · shadcn/ui · TypeScript.

## Requisitos

- Node ≥ 20.9 (recomendado 24) y [pnpm](https://pnpm.io) 11 (`corepack enable`)
- Un proyecto de Supabase en la nube. No se usa base local ni Docker.
- Opcional: [Supabase CLI](https://supabase.com/docs/guides/cli) para migraciones
  y tipos, y `psql` (`brew install libpq`) para los tests de base de datos.

## Arranque

```bash
pnpm install
cp .env.example .env.local   # rellena URL y publishable key del proyecto
pnpm dev                     # http://localhost:3000, contra Supabase en la nube
```

No hay cuentas precargadas: regístrate desde la app como cualquier usuario.
Para tener acceso a `/app/moderacion`, da el rol admin a tu usuario desde el
SQL editor del dashboard:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = '<tu correo>';
```

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm check` | lint + typecheck + tests unitarios |
| `pnpm test` | tests unitarios (Vitest) |
| `pnpm test:e2e` | E2E con Playwright contra un build de producción |
| `pnpm test:db` | tests de RLS y triggers (pgTAP vía `psql`, usa `SUPABASE_DB_URL`) |
| `pnpm db:push` | aplica las migraciones pendientes al proyecto enlazado |
| `pnpm db:types` | regenera `lib/database.types.ts` desde el proyecto enlazado |

## Base de datos

Las migraciones viven en `supabase/migrations/`. La primera vez, enlaza el
proyecto: `supabase link --project-ref <ref>`.

```bash
supabase migration new nombre_descriptivo
# editar el .sql, luego:
pnpm db:push && pnpm db:types
```

`supabase/config.toml` solo lo necesita el CLI. No corras `supabase config push`:
subiría su configuración de auth (site_url de localhost) al proyecto remoto.

## Despliegue (Vercel)

Variables de entorno (ver [.env.example](.env.example)):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`: dominio canónico, lo usan sitemap, robots y OG

En Supabase → Auth → URL Configuration, añade el dominio a *Site URL* y
`https://<dominio>/**` a *Redirect URLs* (y `http://localhost:3000/**` para dev).
