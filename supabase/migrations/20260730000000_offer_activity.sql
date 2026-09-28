-- ============================================================================
-- ACTIVIDAD RECIENTE POR OFERTA — `referrals.last_used_at`
--
-- La ficha de marca quiere una señal de "esto está vivo" bajo cada oferta
-- ("Usado hace 3 h"). Ese dato existe en `referral_events`, pero su RLS solo
-- deja leerla al autor del referido y al staff, y solo al rol `authenticated`:
-- un visitante anónimo lee cero filas.
--
-- Tampoco se puede resolver con una vista: todas las del proyecto llevan
-- `security_invoker = true` justamente para NO saltarse el RLS. Así que se
-- denormaliza en `referrals`, que sí es público a través de public_referrals.
--
-- Es ADITIVO: una columna nullable y una asignación más en un trigger que ya
-- corría. Ningún índice nuevo — no se filtra ni se ordena por esta columna, solo
-- se muestra.
-- ============================================================================

alter table public.referrals add column last_used_at timestamptz;


-- ---------------------------------------------------------------------------
-- 1. El trigger que ya sube los contadores sella también la fecha.
--
-- Solo cuenta el uso REAL: copiar el código o entrar por el enlace. Ver un
-- referido no es usarlo — mismo criterio que activity_on_use() en
-- 20260714000000, donde las vistas quedan fuera del feed a propósito.
--
-- Coste cero: es una asignación más dentro del UPDATE que ya se hacía.
-- ---------------------------------------------------------------------------
create or replace function public.bump_referral_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.referrals set
    views_count  = views_count  + (new.kind = 'view')::int,
    copies_count = copies_count + (new.kind = 'code_copy')::int,
    clicks_count = clicks_count + (new.kind = 'link_click')::int,
    last_used_at = case
      when new.kind in ('code_copy', 'link_click') then now()
      else last_used_at
    end
  where id = new.referral_id;
  return null;
end;
$$;


-- ---------------------------------------------------------------------------
-- 2. `last_used_at` pasa a ser de solo lectura para el autor.
--
-- Es prueba social: si el autor pudiera escribirla a mano podría fingir "usado
-- hace 1 minuto" en un referido muerto. Va en el mismo bloque que los
-- contadores, que existen por exactamente la misma razón.
--
-- El resto de la función es idéntica a la de 20260728000000.
-- ---------------------------------------------------------------------------
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
      new.saves_count, new.helpful_count, new.reports_count,
      new.last_used_at)
     is distinct from
     (old.views_count, old.copies_count, old.clicks_count,
      old.saves_count, old.helpful_count, old.reports_count,
      old.last_used_at) then
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


-- ---------------------------------------------------------------------------
-- 3. Backfill desde el historial que ya existe, para no arrancar con la
--    columna vacía y el indicador mudo en todas las ofertas.
--
-- Se desactiva referrals_activity durante el UPDATE por el mismo motivo que en
-- 20260728000000: no tiene sentido inundar el feed por un relleno técnico.
-- ---------------------------------------------------------------------------
alter table public.referrals disable trigger referrals_activity;

update public.referrals r
set last_used_at = (
  select max(e.created_at)
  from public.referral_events e
  where e.referral_id = r.id
    and e.kind in ('code_copy', 'link_click')
);

alter table public.referrals enable trigger referrals_activity;


-- ---------------------------------------------------------------------------
-- 4. Exponer la columna en public_referrals.
--
-- Va la ÚLTIMA, después de brand_id: CREATE OR REPLACE VIEW solo admite
-- columnas nuevas al final. El resto del SELECT es idéntico al de
-- 20260729000000_brand_pages.sql.
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

  b.logo_url as brand_logo_url,
  r.brand_id,

  -- NUEVO. Nullable: una oferta que nadie ha usado todavía no tiene fecha, y la
  -- franja de actividad simplemente no se pinta.
  r.last_used_at
from public.referrals r
join public.categories c on c.id = r.category_id
join public.profiles p   on p.id = r.owner_id
left join public.brands b on b.id = r.brand_id
where r.status = 'active';

grant select on public.public_referrals to anon, authenticated;
