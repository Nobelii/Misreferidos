-- ============================================================================
-- MisReferidos — esquema inicial
--
-- Modelo comunitario: alcance (vistas/copias/clics/guardados) y confianza
-- (verificación, reportes, moderación). Sin comisiones ni ganancias.
--
-- Tres anillos: público (vistas), privado del dueño (RLS por auth.uid()),
-- moderable (user_roles + funciones security definer).
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- ============================================================================
-- ENUMS
-- ============================================================================
create type public.profile_status as enum ('active', 'suspended', 'deleted');

create type public.app_role as enum ('user', 'moderator', 'admin');

create type public.referral_status as enum (
  'draft', 'pending_review', 'active', 'rejected', 'expired', 'archived'
);

create type public.verification_status as enum (
  'unverified', 'pending', 'verified', 'disputed'
);

create type public.benefit_type as enum (
  'discount', 'free_months', 'free_shipping', 'bonus',
  'cashback', 'free_trial', 'gift', 'bogo', 'other'
);

create type public.event_kind as enum ('view', 'code_copy', 'link_click');

create type public.report_reason as enum (
  'expired', 'invalid_code', 'spam', 'misleading',
  'inappropriate', 'duplicate', 'other'
);

create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create type public.activity_type as enum (
  'referral_used', 'referral_published', 'referral_verified',
  'referral_trending', 'referral_saved', 'referral_reported', 'referral_expired'
);

-- ============================================================================
-- UTILIDADES
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Slugify sin acentos. No es IMMUTABLE (unaccent no lo es), por eso se usa en
-- triggers y nunca en columnas generadas ni en índices.
create or replace function public.slugify(_input text)
returns text
language sql
volatile
as $$
  select trim(both '-' from
    regexp_replace(lower(public.unaccent(coalesce(_input, ''))), '[^a-z0-9]+', '-', 'g')
  );
$$;

-- ============================================================================
-- PROFILES
-- ============================================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     citext not null unique,
  display_name text not null,
  avatar_url   text,
  bio          text,
  location     text,
  website_url  text,
  is_verified  boolean not null default false,
  status       public.profile_status not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- El cast a text es deliberado: los operadores de citext son
  -- case-insensitive, así que sin él 'LUIS' pasaría el regex de minúsculas.
  constraint username_format  check (username::text ~ '^[a-z0-9_.]{3,30}$'),
  constraint display_name_len check (char_length(display_name) between 1 and 60),
  constraint bio_len          check (bio is null or char_length(bio) <= 280),
  constraint website_url_fmt  check (website_url is null or website_url ~* '^https?://.+\..+')
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ROLES — tabla separada de profiles a propósito.
-- Si el rol viviera en profiles (que el usuario puede editar), la escalada de
-- privilegios sería un simple UPDATE.
-- ============================================================================
create table public.user_roles (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       public.app_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- SECURITY DEFINER: sin esto, una policy sobre user_roles que consulta
-- user_roles entra en recursión infinita.
create or replace function public.has_role(_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = _role
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

-- ============================================================================
-- CATEGORIES
-- ============================================================================
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null unique,
  icon_name   text,
  color       text,
  description text,
  position    smallint not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint category_slug_fmt check (slug ~ '^[a-z0-9-]+$')
);

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create index categories_active_position_idx
  on public.categories (position) where is_active;

-- ============================================================================
-- REFERRALS
-- ============================================================================
create table public.referrals (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,

  brand       text not null,
  brand_slug  text not null,
  slug        text not null unique,
  title       text not null,
  summary     text,
  description text,

  benefit_type public.benefit_type not null,
  value_amount numeric(10, 2),
  value_label  text,

  code       text,
  redeem_url text,
  terms      text[],
  steps      text[],

  status              public.referral_status not null default 'draft',
  verification_status public.verification_status not null default 'unverified',
  is_featured         boolean not null default false,

  views_count   integer not null default 0,
  copies_count  integer not null default 0,
  clicks_count  integer not null default 0,
  saves_count   integer not null default 0,
  helpful_count integer not null default 0,
  reports_count integer not null default 0,

  expires_at   timestamptz,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  search_vector tsvector generated always as (
    setweight(to_tsvector('spanish', coalesce(brand, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(code, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(summary, '')), 'C')
  ) stored,

  constraint slug_fmt       check (slug ~ '^[a-z0-9-]{3,110}$'),
  constraint brand_len      check (char_length(brand) between 1 and 60),
  constraint title_len      check (char_length(title) between 5 and 120),
  constraint summary_len    check (summary is null or char_length(summary) <= 280),
  constraint code_len       check (code is null or char_length(code) between 2 and 40),
  constraint redeem_url_fmt check (redeem_url is null or redeem_url ~* '^https?://.+\..+'),

  -- Misma regla que el formulario de /app/publicar: código o enlace, al menos uno.
  constraint code_or_url check (code is not null or redeem_url is not null),

  -- El valor solo es obligatorio en los tipos que tienen magnitud.
  constraint value_required check (
    benefit_type in ('free_shipping', 'bogo', 'gift', 'other')
    or value_amount is not null
  ),
  constraint value_positive check (value_amount is null or value_amount > 0),

  -- Un referido visible siempre tiene fecha de publicación.
  constraint published_consistency check (
    status not in ('active', 'expired') or published_at is not null
  )
);

-- Genera brand_slug y slug si vienen vacíos. slug lleva un sufijo corto del id
-- para garantizar unicidad global sin reintentos.
create or replace function public.set_referral_slugs()
returns trigger
language plpgsql
as $$
begin
  new.brand_slug := public.slugify(new.brand);

  if new.slug is null or new.slug = '' then
    new.slug := left(
      new.brand_slug || '-' || public.slugify(new.title), 100
    ) || '-' || substr(new.id::text, 1, 6);
  end if;

  return new;
end;
$$;

create trigger referrals_set_slugs
  before insert on public.referrals
  for each row execute function public.set_referral_slugs();

create trigger referrals_updated_at
  before update on public.referrals
  for each row execute function public.set_updated_at();

-- --- Índices de referrals ---------------------------------------------------
-- Los parciales sobre status = 'active' son mucho más pequeños que el índice
-- completo: explorar solo mira referidos activos.

create index referrals_explore_idx
  on public.referrals (category_id, published_at desc)
  where status = 'active';

create index referrals_popular_idx
  on public.referrals (views_count desc, published_at desc)
  where status = 'active';

create index referrals_expiring_idx
  on public.referrals (expires_at asc)
  where status = 'active' and expires_at is not null;

create index referrals_owner_idx
  on public.referrals (owner_id, status, created_at desc);

create index referrals_owner_active_idx
  on public.referrals (owner_id, published_at desc)
  where status = 'active';

create index referrals_featured_idx
  on public.referrals (published_at desc)
  where is_featured and status = 'active';

create index referrals_pending_idx
  on public.referrals (created_at)
  where status = 'pending_review';

create index referrals_search_idx
  on public.referrals using gin (search_vector);

create index referrals_brand_trgm_idx
  on public.referrals using gin (brand gin_trgm_ops);

-- ============================================================================
-- TAGS curados (los automáticos se derivan en la vista public_referrals)
-- ============================================================================
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  label      text not null,
  color      text,
  created_at timestamptz not null default now(),

  constraint tag_slug_fmt check (slug ~ '^[a-z0-9-]+$')
);

create table public.referral_tags (
  referral_id uuid not null references public.referrals(id) on delete cascade,
  tag_id      uuid not null references public.tags(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (referral_id, tag_id)
);

create index referral_tags_tag_idx on public.referral_tags (tag_id);

-- ============================================================================
-- FAVORITOS
-- ============================================================================
create table public.saved_referrals (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  referral_id uuid not null references public.referrals(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, referral_id)
);

create index saved_referrals_referral_idx on public.saved_referrals (referral_id);
create index saved_referrals_user_recent_idx on public.saved_referrals (user_id, created_at desc);

-- ============================================================================
-- EVENTOS (append-only)
-- ============================================================================
create table public.referral_events (
  id           bigint generated always as identity primary key,
  referral_id  uuid not null references public.referrals(id) on delete cascade,
  actor_id     uuid references public.profiles(id) on delete set null,
  kind         public.event_kind not null,
  session_hash text,
  created_at   timestamptz not null default now()
);

create index referral_events_referral_idx
  on public.referral_events (referral_id, kind, created_at desc);

create index referral_events_actor_idx
  on public.referral_events (actor_id, created_at desc);

-- Anti-inflado: una sesión solo suma un evento de cada tipo por hora.
-- El AT TIME ZONE es necesario: date_trunc(text, timestamptz) es STABLE y no
-- puede indexarse; date_trunc(text, timestamp) sí es IMMUTABLE.
create unique index referral_events_dedupe_idx
  on public.referral_events (
    referral_id, kind, session_hash,
    date_trunc('hour', created_at at time zone 'UTC')
  )
  where session_hash is not null;

-- ============================================================================
-- VOTOS ÚTILES
-- ============================================================================
create table public.referral_votes (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  referral_id uuid not null references public.referrals(id) on delete cascade,
  is_helpful  boolean not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, referral_id)
);

create index referral_votes_referral_idx on public.referral_votes (referral_id);

-- ============================================================================
-- REPORTES
-- Las notas internas viven en report_notes, no aquí: RLS filtra filas, no
-- columnas, y el reportante tiene SELECT sobre sus propios reportes.
-- ============================================================================
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  referral_id  uuid not null references public.referrals(id) on delete cascade,
  reporter_id  uuid references public.profiles(id) on delete set null,
  reason       public.report_reason not null,
  details      text,
  status       public.report_status not null default 'open',
  moderator_id uuid references public.profiles(id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint details_len check (details is null or char_length(details) <= 500),
  constraint resolved_consistency check (
    (status in ('resolved', 'dismissed') and resolved_at is not null)
    or (status in ('open', 'reviewing') and resolved_at is null)
  )
);

create trigger reports_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

create unique index reports_one_open_per_user_idx
  on public.reports (referral_id, reporter_id)
  where status in ('open', 'reviewing');

create index reports_queue_idx on public.reports (status, created_at);
create index reports_referral_idx on public.reports (referral_id);

create table public.report_notes (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references public.reports(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  note       text not null,
  created_at timestamptz not null default now()
);

create index report_notes_report_idx on public.report_notes (report_id, created_at desc);

-- ============================================================================
-- ACTIVITY
-- Guarda type + metadata, nunca el texto ya renderizado: así la copy se puede
-- cambiar o traducir sin migrar filas.
-- ============================================================================
create table public.activity (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  referral_id uuid references public.referrals(id) on delete cascade,
  type        public.activity_type not null,
  metadata    jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index activity_user_idx on public.activity (user_id, created_at desc);
create index activity_unread_idx on public.activity (user_id) where read_at is null;

-- ============================================================================
-- PREFERENCIAS / CONFIG / AUDITORÍA
-- ============================================================================
create table public.notification_preferences (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  notify_uses         boolean not null default true,
  notify_verification boolean not null default true,
  notify_expiration   boolean not null default true,
  notify_news         boolean not null default false,
  updated_at          timestamptz not null default now()
);

create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  diff       jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity, entity_id, created_at desc);

-- ============================================================================
-- TRIGGERS DE NEGOCIO
-- ============================================================================

-- Perfil + preferencias + rol base al registrarse.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username  text;
  final_username text;
  n              int := 0;
begin
  base_username := regexp_replace(
    lower(coalesce(
      new.raw_user_meta_data ->> 'username',
      split_part(new.email, '@', 1)
    )),
    '[^a-z0-9_.]', '', 'g'
  );

  if char_length(base_username) < 3 then
    base_username := 'user' || substr(new.id::text, 1, 6);
  end if;

  base_username := left(base_username, 25);
  final_username := base_username;

  while exists (select 1 from public.profiles where username = final_username) loop
    n := n + 1;
    final_username := base_username || n::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data ->> 'display_name', final_username),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.notification_preferences (user_id) values (new.id);
  insert into public.user_roles (user_id, role) values (new.id, 'user');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Contadores derivados de referral_events.
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
    clicks_count = clicks_count + (new.kind = 'link_click')::int
  where id = new.referral_id;
  return null;
end;
$$;

create trigger referral_events_bump
  after insert on public.referral_events
  for each row execute function public.bump_referral_counter();

create or replace function public.sync_saves_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.referrals
    set saves_count = saves_count + 1
    where id = new.referral_id;
  else
    update public.referrals
    set saves_count = greatest(saves_count - 1, 0)
    where id = old.referral_id;
  end if;
  return null;
end;
$$;

create trigger saved_referrals_count
  after insert or delete on public.saved_referrals
  for each row execute function public.sync_saves_count();

create or replace function public.sync_helpful_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid := coalesce(new.referral_id, old.referral_id);
begin
  update public.referrals
  set helpful_count = (
    select count(*) from public.referral_votes
    where referral_id = rid and is_helpful
  )
  where id = rid;
  return null;
end;
$$;

create trigger referral_votes_count
  after insert or update or delete on public.referral_votes
  for each row execute function public.sync_helpful_count();

create or replace function public.sync_reports_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid := coalesce(new.referral_id, old.referral_id);
begin
  update public.referrals
  set reports_count = (
    select count(*) from public.reports
    where referral_id = rid and status in ('open', 'reviewing')
  )
  where id = rid;
  return null;
end;
$$;

create trigger reports_count_sync
  after insert or update or delete on public.reports
  for each row execute function public.sync_reports_count();

-- published_at se sella solo, la primera vez que el referido pasa a 'active'.
create or replace function public.set_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active'
     and old.status is distinct from 'active'
     and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

-- El autor no puede auto-aprobarse, auto-verificarse, auto-destacarse ni
-- tocar sus contadores. Sin este trigger la policy "edito mis referidos" le
-- dejaría hacer status = 'active' directamente.
--
-- El nombre empieza por 'referrals_a_' a propósito: Postgres dispara los
-- triggers BEFORE en orden alfabético y este tiene que correr antes que
-- set_published_at.
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
     and new.status not in ('draft', 'pending_review', 'archived') then
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

create trigger referrals_a_moderation_guard
  before update on public.referrals
  for each row execute function public.guard_referral_moderation();

create trigger referrals_b_publish
  before update on public.referrals
  for each row execute function public.set_published_at();

-- Vence los referidos caducados. Llamar desde pg_cron o una Edge Function.
create or replace function public.expire_referrals()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  with updated as (
    update public.referrals
    set status = 'expired'
    where status = 'active'
      and expires_at is not null
      and expires_at < now()
    returning id, owner_id
  )
  insert into public.activity (user_id, referral_id, type)
  select owner_id, id, 'referral_expired' from updated;

  get diagnostics n = row_count;
  return n;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles                 enable row level security;
alter table public.user_roles               enable row level security;
alter table public.categories               enable row level security;
alter table public.referrals                enable row level security;
alter table public.tags                     enable row level security;
alter table public.referral_tags            enable row level security;
alter table public.saved_referrals          enable row level security;
alter table public.referral_events          enable row level security;
alter table public.referral_votes           enable row level security;
alter table public.reports                  enable row level security;
alter table public.report_notes             enable row level security;
alter table public.activity                 enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.app_settings             enable row level security;
alter table public.audit_log                enable row level security;

-- --- profiles ---------------------------------------------------------------
create policy "perfiles activos visibles para todos"
  on public.profiles for select to anon, authenticated
  using (status = 'active' or id = auth.uid() or public.is_staff());

create policy "solo el dueño edita su perfil"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "staff modera perfiles"
  on public.profiles for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Sin policy de INSERT/DELETE: el perfil lo crea handle_new_user() y se borra
-- en cascada con auth.users.

-- --- user_roles -------------------------------------------------------------
create policy "veo mis roles"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy "solo admin asigna roles"
  on public.user_roles for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- --- categories / tags ------------------------------------------------------
create policy "categorías activas públicas"
  on public.categories for select to anon, authenticated
  using (is_active or public.is_staff());

create policy "solo staff gestiona categorías"
  on public.categories for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "tags públicos"
  on public.tags for select to anon, authenticated
  using (true);

create policy "solo staff gestiona tags"
  on public.tags for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "referral_tags públicos"
  on public.referral_tags for select to anon, authenticated
  using (true);

create policy "solo staff asigna tags"
  on public.referral_tags for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- --- referrals --------------------------------------------------------------
create policy "referidos activos visibles para todos"
  on public.referrals for select to anon, authenticated
  using (status = 'active');

create policy "veo todos mis referidos"
  on public.referrals for select to authenticated
  using (owner_id = auth.uid());

create policy "staff ve todos los referidos"
  on public.referrals for select to authenticated
  using (public.is_staff());

create policy "creo mis referidos"
  on public.referrals for insert to authenticated
  with check (
    owner_id = auth.uid()
    and status in ('draft', 'pending_review')
    and verification_status = 'unverified'
    and is_featured = false
    and views_count = 0
    and copies_count = 0
    and clicks_count = 0
    and saves_count = 0
  );

create policy "edito mis referidos"
  on public.referrals for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "staff edita cualquier referido"
  on public.referrals for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "borro mis referidos"
  on public.referrals for delete to authenticated
  using (owner_id = auth.uid() or public.is_staff());

-- --- saved_referrals --------------------------------------------------------
create policy "mis guardados"
  on public.saved_referrals for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- referral_events --------------------------------------------------------
create policy "el dueño ve los eventos de sus referidos"
  on public.referral_events for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.referrals r
      where r.id = referral_id and r.owner_id = auth.uid()
    )
  );

create policy "registrar evento sobre referido activo"
  on public.referral_events for insert to anon, authenticated
  with check (
    (actor_id is null or actor_id = auth.uid())
    and exists (
      select 1 from public.referrals r
      where r.id = referral_id and r.status = 'active'
    )
  );

-- --- referral_votes ---------------------------------------------------------
create policy "votos visibles"
  on public.referral_votes for select to anon, authenticated
  using (true);

create policy "mi voto"
  on public.referral_votes for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- reports / report_notes -------------------------------------------------
create policy "veo mis reportes"
  on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_staff());

create policy "creo reportes"
  on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and status = 'open'
    and moderator_id is null
  );

create policy "solo staff resuelve reportes"
  on public.reports for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "solo staff lee notas de moderación"
  on public.report_notes for all to authenticated
  using (public.is_staff())
  with check (public.is_staff() and author_id = auth.uid());

-- --- activity / preferencias / settings / auditoría -------------------------
create policy "mi actividad"
  on public.activity for select to authenticated
  using (user_id = auth.uid());

create policy "marco mi actividad como leída"
  on public.activity for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sin policy de INSERT: la actividad la generan los triggers y el service_role.

create policy "mis preferencias"
  on public.notification_preferences for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "settings de lectura pública"
  on public.app_settings for select to anon, authenticated
  using (true);

create policy "solo admin edita settings"
  on public.app_settings for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "solo staff lee la auditoría"
  on public.audit_log for select to authenticated
  using (public.is_staff());

-- ============================================================================
-- VISTAS
--
-- security_invoker = true es obligatorio: sin él la vista corre con los
-- permisos de su creador (postgres, que tiene BYPASSRLS) y se salta el RLS
-- de las tablas subyacentes por completo.
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
  end as auto_tag
from public.referrals r
join public.categories c on c.id = r.category_id
join public.profiles p   on p.id = r.owner_id
where r.status = 'active';

grant select on public.public_referrals to anon, authenticated;

create or replace view public.public_profiles
with (security_invoker = true) as
select
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.location,
  p.website_url,
  p.is_verified,
  p.created_at,
  count(r.id) filter (where r.status = 'active')                     as active_referrals,
  count(r.id) filter (where r.published_at is not null)              as published_referrals,
  count(r.id) filter (where r.verification_status = 'verified')      as verified_referrals,
  coalesce(sum(r.views_count)  filter (where r.status = 'active'), 0) as total_views,
  coalesce(sum(r.copies_count) filter (where r.status = 'active'), 0) as total_copies
from public.profiles p
left join public.referrals r on r.owner_id = p.id and r.status = 'active'
where p.status = 'active'
group by p.id;

grant select on public.public_profiles to anon, authenticated;

-- Necesita atención. Réplica de getNeedsAttention() en lib/benefits-helpers.ts.
create or replace view public.my_attention_items
with (security_invoker = true) as
select
  r.id,
  r.slug,
  r.brand,
  r.title,
  r.status,
  r.expires_at,
  r.views_count,
  r.reports_count,
  case
    when r.status = 'expired'        then 'expired'
    when r.reports_count > 0         then 'reported'
    when r.status = 'rejected'       then 'rejected'
    when r.expires_at is not null
      and r.expires_at <= now() + interval '7 days'
      and r.status = 'active'        then 'expiring_soon'
    when r.status = 'archived'       then 'archived'
    when r.status = 'pending_review' then 'pending_review'
    when r.status = 'active'
      and r.views_count = 0
      and r.published_at < now() - interval '14 days'
                                     then 'no_traction'
  end as reason
from public.referrals r
where r.owner_id = auth.uid()
  and (
    r.status in ('expired', 'archived', 'pending_review', 'rejected')
    or r.reports_count > 0
    or (r.status = 'active' and r.expires_at is not null
        and r.expires_at <= now() + interval '7 days')
    or (r.status = 'active' and r.views_count = 0
        and r.published_at < now() - interval '14 days')
  );

grant select on public.my_attention_items to authenticated;

-- Mis reportes. Las notas de moderación viven en report_notes y no se exponen.
create or replace view public.my_reports
with (security_invoker = true) as
select id, referral_id, reason, details, status, resolved_at, created_at
from public.reports
where reporter_id = auth.uid();

grant select on public.my_reports to authenticated;

-- ============================================================================
-- FUNCIONES DE AGREGACIÓN
-- ============================================================================

-- KPIs del dashboard. security invoker: solo devuelve datos del usuario en sesión.
create or replace function public.my_dashboard_stats()
returns table (
  active_referrals  bigint,
  draft_referrals   bigint,
  pending_referrals bigint,
  total_views       bigint,
  total_copies      bigint,
  total_clicks      bigint,
  total_saves       bigint,
  saved_by_me       bigint,
  unread_activity   bigint,
  top_referral_id   uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*) filter (where status = 'active'),
    count(*) filter (where status = 'draft'),
    count(*) filter (where status = 'pending_review'),
    coalesce(sum(views_count), 0),
    coalesce(sum(copies_count), 0),
    coalesce(sum(clicks_count), 0),
    coalesce(sum(saves_count), 0),
    (select count(*) from public.saved_referrals where user_id = auth.uid()),
    (select count(*) from public.activity where user_id = auth.uid() and read_at is null),
    (select id from public.referrals
     where owner_id = auth.uid() and status = 'active'
     order by views_count desc
     limit 1)
  from public.referrals
  where owner_id = auth.uid();
$$;

-- Categorías en las que más publica un perfil.
create or replace function public.profile_top_categories(_username citext, _limit int default 4)
returns table (
  category_slug  text,
  category_name  text,
  referral_count bigint,
  total_views    bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.slug,
    c.name,
    count(*),
    coalesce(sum(r.views_count), 0)
  from public.referrals r
  join public.profiles p   on p.id = r.owner_id
  join public.categories c on c.id = r.category_id
  where p.username = _username
    and r.status = 'active'
  group by c.slug, c.name
  order by count(*) desc, sum(r.views_count) desc
  limit _limit;
$$;

-- ============================================================================
-- SEED
-- ============================================================================
insert into public.app_settings (key, value) values
  ('popular_threshold', '500'::jsonb),
  ('ending_soon_days',  '7'::jsonb),
  ('new_days',          '14'::jsonb);

insert into public.categories (slug, name, icon_name, position) values
  ('finanzas',        'Finanzas',        'Banknote',        1),
  ('compras',         'Compras',         'ShoppingCart',    2),
  ('comida-y-bebida', 'Comida y Bebida', 'UtensilsCrossed', 3),
  ('negocios',        'Negocios',        'Briefcase',       4),
  ('productividad',   'Productividad',   'Zap',             5),
  ('viajes',          'Viajes',          'Plane',           6),
  ('estilo-de-vida',  'Estilo de Vida',  'Sparkles',        7),
  ('entretenimiento', 'Entretenimiento', 'Clapperboard',    8),
  ('salud-y-fitness', 'Salud y Fitness', 'HeartPulse',      9);

insert into public.tags (slug, label, color) values
  ('editors-pick', 'Elección del equipo', 'amber'),
  ('community-favorite', 'Favorito de la comunidad', 'violet'),
  ('exclusive', 'Exclusivo', 'emerald');
