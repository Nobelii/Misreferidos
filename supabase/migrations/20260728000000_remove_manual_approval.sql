-- ============================================================================
-- ELIMINACIÓN DEL FLUJO DE APROBACIÓN MANUAL (marcas y referidos)
--
-- A partir de aquí, lo que publica un usuario autenticado es visible al
-- instante. Las columnas `brands.status` y `referrals.status` SE CONSERVAN
-- (enums, índices y actions de staff siguen existiendo), pero dejan de ser un
-- bloqueo para publicar o para ver.
--
-- Lo que NO cambia:
--   * `referrals` conserva sus estados operativos: 'expired' lo pone el cron
--     expire_referrals(), 'archived' lo pone el autor al pausar. Por eso el
--     SELECT público sigue exigiendo 'active': ya no oculta nada por falta de
--     aprobación (nada nace pendiente), solo lo caducado y lo pausado.
--   * El staff conserva el UPDATE sobre ambas tablas, para poder retirar
--     contenido abusivo a posteriori. La cola de reportes sigue intacta.
--   * `verification_status` e `is_featured` siguen siendo exclusivos del staff:
--     son sellos de calidad, no un permiso de publicación.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. BRANDS
-- ---------------------------------------------------------------------------

-- Una marca nueva nace aprobada.
alter table public.brands alter column status set default 'approved';

-- Nadie está esperando ya una revisión que no va a llegar (no hay UI de
-- moderación de marcas). Lo pendiente y lo rechazado pasa a aprobado.
update public.brands
set status = 'approved'
where status <> 'approved';

-- SELECT: todas las marcas son públicas. Antes: aprobadas + propias + staff.
drop policy if exists "marcas aprobadas o propias visibles" on public.brands;

create policy "marcas visibles para todos"
  on public.brands for select to anon, authenticated
  using (true);

-- INSERT: cualquier autenticado crea marcas, sin exigir estado. Se mantiene
-- `created_by = auth.uid()`: eso no es aprobación, es autoría (impide crear
-- filas a nombre de otro).
drop policy if exists "creo marcas pendientes" on public.brands;

create policy "creo marcas"
  on public.brands for insert to authenticated
  with check (created_by = auth.uid());

-- Se conserva tal cual la policy "staff modera marcas" (UPDATE).
-- Se conserva el índice brands_status_idx (queda casi vacío de valores
-- distintos de 'approved', pero no estorba y sirve si se retoma el flujo).


-- ---------------------------------------------------------------------------
-- 2. REFERRALS
-- ---------------------------------------------------------------------------

-- Un referido nuevo nace publicado. Antes: 'draft'.
alter table public.referrals alter column status set default 'active';

-- El CHECK `published_consistency` exige published_at cuando el estado es
-- 'active' o 'expired'. Hasta ahora lo sellaba set_published_at() en el UPDATE,
-- porque publicar era siempre una transición. Ahora también hay que sellarlo en
-- el INSERT: OLD no existe en un trigger de INSERT, de ahí el TG_OP.
-- El `set search_path` es obligatorio repetirlo: CREATE OR REPLACE FUNCTION
-- descarta los SET que no se declaren aquí, y con él se perdería el que le puso
-- 20260713010000_harden_function_privileges.sql.
create or replace function public.set_published_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'active' and new.published_at is null then
    if tg_op = 'INSERT' or old.status is distinct from 'active' then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger referrals_b_publish_insert
  before insert on public.referrals
  for each row execute function public.set_published_at();

-- INSERT: se admite 'active'. Se conserva el resto de la cláusula: contadores a
-- cero, sin verificar y sin destacar siguen siendo innegociables.
drop policy if exists "creo mis referidos" on public.referrals;

create policy "creo mis referidos"
  on public.referrals for insert to authenticated
  with check (
    owner_id = auth.uid()
    and status in ('draft', 'pending_review', 'active')
    and verification_status = 'unverified'
    and is_featured = false
    and views_count = 0
    and copies_count = 0
    and clicks_count = 0
    and saves_count = 0
  );

-- El guard deja de tratar 'active' como un estado reservado al staff: el autor
-- ya puede republicar lo que pausó sin pasar por moderación. Sigue bloqueando
-- 'rejected' y 'expired' (eso lo decide el staff o el cron), la verificación,
-- el destacado, los contadores y la transferencia de propiedad.
create or replace function public.guard_referral_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Los triggers de contadores hacen UPDATE sobre referrals. Sin esta salida
  -- una simple vista de un referido ajeno reventaría con "contadores de solo
  -- lectura".
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- service_role / pg_cron (p.ej. expire_referrals). Ningún rol anónimo puede
  -- llegar aquí: no hay policy de UPDATE para anon.
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;

  if new.status is distinct from old.status
     and new.status not in ('draft', 'pending_review', 'archived', 'active') then
    raise exception 'No puedes cambiar el estado a %', new.status
      using errcode = 'check_violation';
  end if;

  if new.verification_status is distinct from old.verification_status then
    raise exception 'Solo un moderador puede cambiar la verificación'
      using errcode = 'check_violation';
  end if;

  if new.is_featured is distinct from old.is_featured then
    raise exception 'Solo un moderador puede destacar un referido'
      using errcode = 'check_violation';
  end if;

  if (new.views_count, new.copies_count, new.clicks_count,
      new.saves_count, new.helpful_count, new.reports_count)
     is distinct from
     (old.views_count, old.copies_count, old.clicks_count,
      old.saves_count, old.helpful_count, old.reports_count) then
    raise exception 'Los contadores son de solo lectura'
      using errcode = 'check_violation';
  end if;

  if new.owner_id is distinct from old.owner_id then
    raise exception 'No puedes transferir un referido'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Backfill. Se desactiva `referrals_activity` durante el UPDATE: si no, cada
-- fila promovida dispararía push_activity('referral_published') y llenaría el
-- feed de golpe. published_at toma created_at (no now()) para no falsear el
-- orden de "recién publicado" en explorar.
alter table public.referrals disable trigger referrals_activity;

update public.referrals
set status = 'active',
    published_at = coalesce(published_at, created_at)
where status in ('draft', 'pending_review', 'rejected');

alter table public.referrals enable trigger referrals_activity;


-- ---------------------------------------------------------------------------
-- 3. VISTA public_referrals
--
-- Único cambio: brand_logo_url deja de condicionarse a que la marca esté
-- aprobada. El `where r.status = 'active'` se mantiene a propósito (ver
-- cabecera). Se reproduce el SELECT entero porque CREATE OR REPLACE VIEW exige
-- el mismo orden y nombre de columnas.
-- ---------------------------------------------------------------------------
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

  -- Logo auténtico de la marca. Antes iba envuelto en
  -- `case when b.status = 'approved' then ... end`: ya no hay marcas
  -- pendientes que esconder.
  b.logo_url as brand_logo_url
from public.referrals r
join public.categories c on c.id = r.category_id
join public.profiles p   on p.id = r.owner_id
left join public.brands b on b.id = r.brand_id
where r.status = 'active';

grant select on public.public_referrals to anon, authenticated;
