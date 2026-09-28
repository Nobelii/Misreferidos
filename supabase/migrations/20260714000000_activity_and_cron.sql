-- ============================================================================
-- Actividad, cron y rol de staff.
--
-- La actividad se genera en la base y no en las server actions a propósito:
-- así se produce venga la escritura de donde venga (la app, un UPDATE desde el
-- panel de Supabase, un cliente futuro). Una action se puede olvidar de
-- insertar; un trigger no.
--
-- Tres reglas que comparten todos los triggers de abajo:
--   1. Nunca te notificas a ti mismo por actuar sobre tu propio referido.
--   2. Respetan notification_preferences (es lo que hace reales los toggles
--      del perfil).
--   3. Anti-spam: no repiten el mismo tipo de evento para el mismo referido si
--      ya hubo uno en la última hora. Sin esto, 200 copias de un código serían
--      200 filas de actividad idénticas.
-- ============================================================================

-- Inserta una fila de actividad si procede. Centraliza las tres reglas para que
-- no se dupliquen (ni se olviden) en cada trigger.
create or replace function public.push_activity(
  _referral_id uuid,
  _actor_id    uuid,
  _type        public.activity_type,
  _pref_column text default null   -- columna de notification_preferences a respetar
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _owner uuid;
  _brand text;
  _wants boolean;
begin
  select owner_id, brand into _owner, _brand
  from public.referrals where id = _referral_id;

  if _owner is null then
    return;
  end if;

  -- Regla 1: no te notificas a ti mismo.
  if _actor_id is not null and _actor_id = _owner then
    return;
  end if;

  -- Regla 2: la preferencia del dueño manda.
  if _pref_column is not null then
    execute format(
      'select %I from public.notification_preferences where user_id = $1',
      _pref_column
    ) into _wants using _owner;

    if _wants is distinct from true then
      return;
    end if;
  end if;

  -- Regla 3: anti-spam por tipo + referido, ventana de una hora.
  if exists (
    select 1 from public.activity
    where user_id = _owner
      and referral_id = _referral_id
      and type = _type
      and created_at > now() - interval '1 hour'
  ) then
    return;
  end if;

  insert into public.activity (user_id, referral_id, type, metadata)
  values (_owner, _referral_id, _type, jsonb_build_object('brand', _brand));
end;
$$;

revoke execute on function public.push_activity(uuid, uuid, public.activity_type, text)
  from anon, authenticated;

-- --- Usos: copiar código o entrar por el enlace -----------------------------
-- Las vistas quedan fuera a propósito: inundarían el feed y ver no es usar.
create or replace function public.activity_on_use()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind in ('code_copy', 'link_click') then
    perform public.push_activity(
      new.referral_id, new.actor_id, 'referral_used', 'notify_uses'
    );
  end if;
  return null;
end;
$$;

create trigger referral_events_activity
  after insert on public.referral_events
  for each row execute function public.activity_on_use();

-- --- Guardados --------------------------------------------------------------
create or replace function public.activity_on_save()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.push_activity(
    new.referral_id, new.user_id, 'referral_saved', 'notify_uses'
  );
  return null;
end;
$$;

create trigger saved_referrals_activity
  after insert on public.saved_referrals
  for each row execute function public.activity_on_save();

-- --- Publicación y verificación ---------------------------------------------
-- Actor null: quien aprueba es un moderador, no el dueño, así que la regla 1 no
-- aplica y el dueño siempre se entera de que su referido salió publicado.
create or replace function public.activity_on_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and old.status is distinct from 'active' then
    perform public.push_activity(new.id, null, 'referral_published', null);
  end if;

  if new.verification_status = 'verified'
     and old.verification_status is distinct from 'verified' then
    perform public.push_activity(
      new.id, null, 'referral_verified', 'notify_verification'
    );
  end if;

  return null;
end;
$$;

create trigger referrals_activity
  after update on public.referrals
  for each row execute function public.activity_on_moderation();

-- --- Reportes ---------------------------------------------------------------
-- Sin preferencia asociada: que te reporten un referido siempre te interesa.
create or replace function public.activity_on_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.push_activity(
    new.referral_id, new.reporter_id, 'referral_reported', null
  );
  return null;
end;
$$;

create trigger reports_activity
  after insert on public.reports
  for each row execute function public.activity_on_report();

revoke execute on function public.activity_on_use()        from anon, authenticated;
revoke execute on function public.activity_on_save()       from anon, authenticated;
revoke execute on function public.activity_on_moderation() from anon, authenticated;
revoke execute on function public.activity_on_report()     from anon, authenticated;

-- ============================================================================
-- CRON
-- ============================================================================
create extension if not exists pg_cron with schema extensions;

-- Vence los caducados cada hora. Sin esto un referido con expires_at pasado
-- sigue apareciendo como activo para siempre.
select cron.schedule(
  'expire-referrals',
  '0 * * * *',
  $$select public.expire_referrals()$$
);

-- Recalcula el umbral de "Más usado" cada noche con el percentil 80 real, en
-- lugar del 500 fijo del seed que ningún referido alcanza nunca.
select cron.schedule(
  'refresh-popular-threshold',
  '0 4 * * *',
  $$
  update public.app_settings
  set value = to_jsonb(coalesce((
    select percentile_disc(0.8) within group (order by views_count)
    from public.referrals
    where status = 'active'
  ), 500))
  where key = 'popular_threshold'
  $$
);

-- ============================================================================
-- ROL DE STAFF
-- ============================================================================
insert into public.user_roles (user_id, role)
select id, 'admin' from public.profiles where username = 'luis161'
on conflict do nothing;
