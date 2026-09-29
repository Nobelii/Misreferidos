-- Tests de RLS y de los guards de la base. Corren con `pnpm test:db`
-- (supabase test db) contra la base local, dentro de una transacción que se
-- deshace al final: no dejan datos.
--
-- Cubren lo que protege la base aunque la app falle: escalada de roles,
-- tocar filas ajenas, falsear contadores y leer tablas privadas.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

-- ── Fixtures (como postgres, sin RLS) ───────────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@test.local', '{"username":"ana_test"}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'beto@test.local', '{"username":"beto_test"}');

insert into public.referrals (id, owner_id, category_id, brand, brand_slug, slug, title, benefit_type, code)
select 'bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
       id, 'Marca Test', '', '', 'Oferta de prueba de Ana', 'free_shipping', 'ANA123'
from public.categories order by position limit 1;

insert into public.referral_events (referral_id, kind)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'code_copy');

-- Helper: actuar como un usuario autenticado concreto.
create or replace function pg_temp.login(_uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
$$;

create or replace function pg_temp.logout_anon() returns void language sql as $$
  select set_config('role', 'anon', true),
         set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

-- ── Alta de usuario ─────────────────────────────────────────────────────────
select is(
  (select username::text from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'ana_test',
  'handle_new_user crea el perfil con el username de los metadatos'
);

select is(
  (select array_agg(role::text) from public.user_roles where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  array['user'],
  'un usuario nuevo nace solo con rol user'
);

-- ── Escalada de privilegios ─────────────────────────────────────────────────
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');

select throws_ok(
  $$ insert into public.user_roles (user_id, role) values ('aaaaaaaa-0000-0000-0000-000000000001', 'admin') $$,
  '42501', null,
  'un usuario no puede darse rol admin'
);

select is(public.is_staff(), false, 'un usuario normal no es staff');

-- ── Referidos: dueño vs. ajeno ──────────────────────────────────────────────
select throws_ok(
  $$ update public.referrals set views_count = 9999 where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  '23514', null,
  'el dueño no puede inflar sus contadores'
);

select throws_ok(
  $$ update public.referrals set is_featured = true where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  '23514', null,
  'el dueño no puede destacarse a sí mismo'
);

select throws_ok(
  $$ insert into public.referrals (owner_id, category_id, brand, brand_slug, slug, title, benefit_type, code)
     select 'aaaaaaaa-0000-0000-0000-000000000002', id, 'X', '', '', 'Suplantando a Beto', 'gift', 'XXX'
     from public.categories limit 1 $$,
  '42501', null,
  'no se puede publicar a nombre de otro'
);

select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000002');

select is_empty(
  $$ update public.referrals set title = 'Hackeado por Beto'
     where id = 'bbbbbbbb-0000-0000-0000-000000000001' returning id $$,
  'un usuario no puede editar el referido de otro'
);

select is_empty(
  $$ delete from public.referrals where id = 'bbbbbbbb-0000-0000-0000-000000000001' returning id $$,
  'un usuario no puede borrar el referido de otro'
);

-- ── Tablas privadas ─────────────────────────────────────────────────────────
select is_empty(
  $$ select 1 from public.referral_events where referral_id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  'los eventos de un referido ajeno no son visibles'
);

select is_empty(
  $$ select 1 from public.audit_log $$,
  'un usuario normal no lee la auditoría'
);

select is_empty(
  $$ select 1 from public.user_roles where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'no se ven los roles de otros usuarios'
);

-- ── Anónimo ─────────────────────────────────────────────────────────────────
select pg_temp.logout_anon();

select isnt_empty(
  $$ select 1 from public.referrals where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  'un referido activo es visible sin sesión'
);

select lives_ok(
  $$ insert into public.referral_events (referral_id, kind) values ('bbbbbbbb-0000-0000-0000-000000000001', 'view') $$,
  'un anónimo puede registrar una vista'
);

select throws_ok(
  $$ insert into public.saved_referrals (user_id, referral_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001') $$,
  '42501', null,
  'un anónimo no puede guardar referidos'
);

-- ── Límite de frecuencia ────────────────────────────────────────────────────
-- Ana ya tiene 1 referido de esta hora (el fixture); el límite es 10/hora.
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');

select lives_ok(
  $$ insert into public.referrals (owner_id, category_id, brand, brand_slug, slug, title, benefit_type, code)
     select 'aaaaaaaa-0000-0000-0000-000000000001', c.id, 'Marca Test', '', '', 'Oferta en serie ' || n, 'gift', 'SERIE' || n
     from generate_series(1, 9) n, (select id from public.categories limit 1) c $$,
  'se pueden publicar hasta 10 referidos por hora'
);

select throws_like(
  $$ insert into public.referrals (owner_id, category_id, brand, brand_slug, slug, title, benefit_type, code)
     select 'aaaaaaaa-0000-0000-0000-000000000001', id, 'Marca Test', '', '', 'Una de más', 'gift', 'MAS'
     from public.categories limit 1 $$,
  'rate_limit:%',
  'el referido número 11 en una hora se rechaza'
);

-- ── Staff ───────────────────────────────────────────────────────────────────
reset role;
insert into public.user_roles (user_id, role) values ('aaaaaaaa-0000-0000-0000-000000000002', 'moderator');
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000002');

select lives_ok(
  $$ update public.referrals set is_featured = true where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  'un moderador sí puede destacar un referido'
);

select * from finish();
rollback;
