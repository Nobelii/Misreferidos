-- ============================================================================
-- LÍMITES DE FRECUENCIA (anti-spam)
-- ============================================================================
-- Sin moderación previa, lo único que frena a un bot que publica 500 referidos
-- en un minuto es esto. Va en la base y no en las server actions porque la
-- publishable key es pública: cualquiera puede saltarse la app y hacer el
-- INSERT directo contra PostgREST.
--
-- Staff queda exento, y también las escrituras sin auth.uid() (service_role,
-- pg_cron, seed), que no vienen de un usuario.
--
-- El error lleva el prefijo `rate_limit:` en el mensaje; las actions lo buscan
-- para devolver un texto legible.
-- ============================================================================

create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid    uuid := auth.uid();
  _max    int  := tg_argv[0]::int;
  _window interval := tg_argv[1]::interval;
  _col    text := tg_argv[2];
  _count  int;
begin
  if _uid is null or public.is_staff() then
    return new;
  end if;

  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - $2',
    tg_table_schema, tg_table_name, _col
  )
  into _count
  using _uid, _window;

  if _count >= _max then
    raise exception 'rate_limit: máximo % en %', _max, _window
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_rate_limit() from public, anon, authenticated;

-- Los índices por autor + fecha hacen que el count sea barato.
create index if not exists referrals_owner_created_idx
  on public.referrals (owner_id, created_at desc);
create index if not exists brands_created_by_created_idx
  on public.brands (created_by, created_at desc);
create index if not exists reports_reporter_created_idx
  on public.reports (reporter_id, created_at desc);

-- Umbrales: holgados para una persona real, cortos para un script.
create trigger referrals_rate_limit
  before insert on public.referrals
  for each row execute function public.enforce_rate_limit('10', '1 hour', 'owner_id');

create trigger brands_rate_limit
  before insert on public.brands
  for each row execute function public.enforce_rate_limit('5', '1 hour', 'created_by');

create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.enforce_rate_limit('20', '1 hour', 'reporter_id');
