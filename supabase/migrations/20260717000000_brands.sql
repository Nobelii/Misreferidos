-- ============================================================================
-- MARCAS / SERVICIOS (brands)
--
-- Convierte el campo de texto libre `referrals.brand` en una entidad propia,
-- moderada, con logo en Storage. Todo es ADITIVO: la columna `referrals.brand`
-- (texto) se conserva, así que los referidos existentes y la búsqueda por
-- brand_trgm siguen funcionando sin tocarlos.
--
-- Flujo: un usuario autenticado crea una marca -> nace 'pending'. Puede usarla
-- de inmediato en sus referidos, pero su logo solo se hace público cuando un
-- miembro del staff la aprueba (ver la vista public_referrals más abajo).
-- ============================================================================

create type public.brand_status as enum ('pending', 'approved', 'rejected');

create table public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  website_url text not null,
  logo_url    text,
  category_id uuid references public.categories(id) on delete set null,
  description text,
  status      public.brand_status not null default 'pending',
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint brand_name_len    check (char_length(name) between 1 and 80),
  constraint brand_slug_fmt    check (slug ~ '^[a-z0-9-]+$'),
  constraint brand_website_fmt check (website_url ~* '^https?://.+\..+'),
  constraint brand_desc_len    check (description is null or char_length(description) <= 280)
);

-- Anti-duplicado: no dos marcas con el mismo nombre (ignorando mayúsculas).
create unique index brands_name_lower_uidx on public.brands (lower(name));
-- Autocomplete: búsqueda por nombre con ilike/trigram (pg_trgm ya está activo).
create index brands_name_trgm_idx on public.brands using gin (name gin_trgm_ops);
create index brands_status_idx on public.brands (status);
create index brands_created_by_idx on public.brands (created_by);

-- Genera el slug desde el nombre si viene vacío. Si el slug limpio choca con uno
-- existente, le añade un sufijo corto del id para garantizar unicidad sin
-- reintentos desde el cliente. Espeja set_referral_slugs().
-- SECURITY DEFINER: llama a public.slugify(), a la que se le revocó EXECUTE de
-- anon/authenticated en 20260713010000. Sin definer, el INSERT de un usuario
-- authenticated fallaría con "permission denied for function slugify".
create or replace function public.set_brand_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.slugify(new.name);
    if new.slug is null or new.slug = '' then
      new.slug := 'marca';
    end if;
    if exists (
      select 1 from public.brands where slug = new.slug and id <> new.id
    ) then
      new.slug := new.slug || '-' || substr(new.id::text, 1, 6);
    end if;
  end if;
  return new;
end;
$$;

create trigger brands_set_slug
  before insert on public.brands
  for each row execute function public.set_brand_slug();

create trigger brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- Endurecimiento coherente con 20260713010000_harden_function_privileges.sql:
-- la función solo la dispara el trigger, nadie debe invocarla por RPC.
alter function public.set_brand_slug() set search_path = public;
revoke execute on function public.set_brand_slug() from anon, authenticated;

-- --- RLS -------------------------------------------------------------------
alter table public.brands enable row level security;

-- Cualquiera ve las aprobadas; el autor ve las suyas (aunque estén pendientes,
-- para poder seleccionarlas al publicar); el staff lo ve todo para moderar.
create policy "marcas aprobadas o propias visibles"
  on public.brands for select to anon, authenticated
  using (status = 'approved' or created_by = auth.uid() or public.is_staff());

-- El usuario solo puede crear marcas a su nombre y siempre en 'pending':
-- nadie se auto-aprueba (mismo patrón que el INSERT de referrals).
create policy "creo marcas pendientes"
  on public.brands for insert to authenticated
  with check (created_by = auth.uid() and status = 'pending');

-- Aprobar / rechazar / editar es exclusivo del staff.
create policy "staff modera marcas"
  on public.brands for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- --- Enlace con referrals ---------------------------------------------------
-- FK nullable: un referido puede seguir sin marca (texto libre heredado) y no
-- se borra si la marca desaparece.
alter table public.referrals
  add column brand_id uuid references public.brands(id) on delete set null;

create index referrals_brand_id_idx on public.referrals (brand_id);

-- ============================================================================
-- Vista public_referrals: se recrea para exponer el logo de la marca.
--
-- brand_logo_url solo trae el logo cuando la marca está 'approved'. Así, aunque
-- el referido ya sea público, una marca pendiente no expone su logo al mundo
-- (el autor sí lo ve en su dashboard, que lee la tabla brands directamente).
-- ============================================================================
create or replace view public.public_referrals
with (security_invoker = true) as
select
  r.id,
  r.slug,
  r.owner_id,
  r.brand,
  r.brand_slug,
  r.title,
  r.summary,
  r.description,
  r.benefit_type,
  r.value_amount,
  r.value_label,
  r.code,
  r.redeem_url,
  r.terms,
  r.steps,
  r.expires_at,
  r.published_at,
  r.created_at,
  r.views_count,
  r.copies_count,
  r.clicks_count,
  r.saves_count,
  r.helpful_count,
  r.verification_status,
  r.is_featured,
  (r.verification_status = 'verified') as is_verified,
  (r.code is not null)                 as has_code,
  c.slug      as category_slug,
  c.name      as category_name,
  c.icon_name as category_icon,
  p.username,
  p.display_name,
  p.avatar_url,
  p.is_verified as owner_verified,

  -- Ranking comparable entre tipos. Réplica de magnitude() en lib/benefit-format.ts.
  case r.benefit_type
    when 'discount'      then r.value_amount
    when 'cashback'      then r.value_amount
    when 'free_months'   then r.value_amount * 12
    when 'free_trial'    then r.value_amount
    when 'bonus'         then r.value_amount * 2
    when 'gift'          then coalesce(r.value_amount * 2, 20)
    when 'bogo'          then 50
    when 'free_shipping' then 10
    else 0
  end as magnitude,

  -- Tag automático. Mismas reglas y prioridad que deriveTag().
  case
    when r.expires_at is not null
      and r.expires_at <= now() + make_interval(
        days => (select value::int from public.app_settings where key = 'ending_soon_days')
      )
      then 'ending_soon'
    when r.published_at >= now() - make_interval(
        days => (select value::int from public.app_settings where key = 'new_days')
      )
      then 'new'
    when r.views_count >= (select value::int from public.app_settings where key = 'popular_threshold')
      then 'popular'
    when r.benefit_type = 'discount' and r.value_amount >= 30
      then 'best_discount'
  end as auto_tag,

  -- Logo auténtico de la marca, solo si está aprobada. Va al final del SELECT a
  -- propósito: CREATE OR REPLACE VIEW solo admite columnas NUEVAS al final.
  case when b.status = 'approved' then b.logo_url end as brand_logo_url
from public.referrals r
join public.categories c on c.id = r.category_id
join public.profiles p   on p.id = r.owner_id
left join public.brands b on b.id = r.brand_id
where r.status = 'active';

grant select on public.public_referrals to anon, authenticated;

-- ============================================================================
-- SUPABASE STORAGE — bucket de logos de marcas
--
-- El bucket es público: los logos se sirven por su URL pública (getPublicUrl)
-- vía CDN, SIN necesidad de una policy de SELECT sobre storage.objects. A
-- propósito NO se crea una policy de SELECT amplia: daría capacidad de LISTAR
-- todos los archivos del bucket (enumeración), que aquí no hace falta.
--
-- La escritura la hace el usuario autenticado SOLO dentro de su propia carpeta
-- `<uid>/...`, con el cliente normal (publishable key) — nunca con service role.
-- Se incluye UPDATE además de INSERT porque `upsert` en Storage necesita ambos.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('brand-logos', 'brand-logos', true)
on conflict (id) do nothing;

create policy "logos de marca: subo a mi carpeta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "logos de marca: actualizo mi carpeta"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "logos de marca: borro de mi carpeta"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
