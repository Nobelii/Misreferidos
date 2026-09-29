-- ============================================================================
-- RENDIMIENTO: RLS sin re-evaluación por fila + agregados del catálogo en SQL
--
-- Nada cambia de semántica: quién ve y quién escribe qué es exactamente lo
-- mismo que antes (lo cubre supabase/tests/database/rls.test.sql). Cambia el
-- coste.
--
-- 1. auth.uid(), is_staff() y has_role() pasan a ir envueltos en (select ...).
--    Sin el select, Postgres los trata como una expresión por fila y los evalúa
--    una vez POR CADA FILA que filtra la policy; con él los convierte en un
--    InitPlan que se evalúa una sola vez por consulta. is_staff() además hace
--    una consulta a user_roles, así que sin envolver era un SELECT extra por
--    fila. Es el aviso `auth_rls_initplan` del Performance Advisor de Supabase.
--    https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- 2. Se fusionan las policies permisivas que se solapaban en la misma acción y
--    rol (aviso `multiple_permissive_policies`): Postgres evalúa TODAS las
--    permisivas de una acción y las une con OR, así que tres policies de SELECT
--    en referrals eran tres evaluaciones por fila. Fusionarlas con OR es
--    equivalente. Las policies `for all` del staff se parten en
--    insert/update/delete: incluían SELECT y se solapaban con la de lectura.
--
-- 3. Vistas de agregados para la home y Explorar (public_catalog_stats,
--    public_category_counts). Antes la app se traía TODAS las filas de
--    public_referrals para contarlas en JS: además de mover datos de más, a
--    partir de 1000 referidos activos (max_rows de PostgREST) las cifras
--    salían truncadas en silencio.
--
-- 4. public_profiles agrupa también por username, para que el filtro
--    `username = ...` se pueda empujar dentro del GROUP BY en vez de agregar
--    todos los perfiles y filtrar después.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1 + 2. POLICIES
-- ---------------------------------------------------------------------------

-- --- profiles ---------------------------------------------------------------
drop policy if exists "perfiles activos visibles para todos" on public.profiles;
create policy "perfiles activos visibles para todos"
  on public.profiles for select to anon, authenticated
  using (
    status = 'active'
    or id = (select auth.uid())
    or (select public.is_staff())
  );

-- Fusiona "solo el dueño edita su perfil" + "staff modera perfiles".
drop policy if exists "solo el dueño edita su perfil" on public.profiles;
drop policy if exists "staff modera perfiles" on public.profiles;
create policy "edito mi perfil o modero"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()))
  with check (id = (select auth.uid()) or (select public.is_staff()));

-- --- user_roles -------------------------------------------------------------
drop policy if exists "veo mis roles" on public.user_roles;
create policy "veo mis roles"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

-- Antes `for all`: incluía SELECT y se solapaba con "veo mis roles". Un admin
-- es staff, así que ya ve todos los roles por la policy de arriba.
drop policy if exists "solo admin asigna roles" on public.user_roles;
create policy "solo admin asigna roles"
  on public.user_roles for insert to authenticated
  with check ((select public.has_role('admin')));
create policy "solo admin cambia roles"
  on public.user_roles for update to authenticated
  using ((select public.has_role('admin')))
  with check ((select public.has_role('admin')));
create policy "solo admin quita roles"
  on public.user_roles for delete to authenticated
  using ((select public.has_role('admin')));

-- --- categories -------------------------------------------------------------
drop policy if exists "categorías activas públicas" on public.categories;
create policy "categorías activas públicas"
  on public.categories for select to anon, authenticated
  using (is_active or (select public.is_staff()));

drop policy if exists "solo staff gestiona categorías" on public.categories;
create policy "solo staff crea categorías"
  on public.categories for insert to authenticated
  with check ((select public.is_staff()));
create policy "solo staff edita categorías"
  on public.categories for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));
create policy "solo staff borra categorías"
  on public.categories for delete to authenticated
  using ((select public.is_staff()));

-- --- tags -------------------------------------------------------------------
drop policy if exists "solo staff gestiona tags" on public.tags;
create policy "solo staff crea tags"
  on public.tags for insert to authenticated
  with check ((select public.is_staff()));
create policy "solo staff edita tags"
  on public.tags for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));
create policy "solo staff borra tags"
  on public.tags for delete to authenticated
  using ((select public.is_staff()));

-- --- referral_tags ----------------------------------------------------------
drop policy if exists "solo staff asigna tags" on public.referral_tags;
create policy "solo staff asigna tags"
  on public.referral_tags for insert to authenticated
  with check ((select public.is_staff()));
create policy "solo staff edita tags de referidos"
  on public.referral_tags for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));
create policy "solo staff quita tags"
  on public.referral_tags for delete to authenticated
  using ((select public.is_staff()));

-- --- referrals --------------------------------------------------------------
-- Fusiona las tres de SELECT. Para anon, auth.uid() es null e is_staff() es
-- false: queda en `status = 'active'`, igual que antes.
drop policy if exists "referidos activos visibles para todos" on public.referrals;
drop policy if exists "veo todos mis referidos" on public.referrals;
drop policy if exists "staff ve todos los referidos" on public.referrals;
create policy "referidos visibles"
  on public.referrals for select to anon, authenticated
  using (
    status = 'active'
    or owner_id = (select auth.uid())
    or (select public.is_staff())
  );

-- Misma cláusula que en 20260728000000, con auth.uid() envuelto.
drop policy if exists "creo mis referidos" on public.referrals;
create policy "creo mis referidos"
  on public.referrals for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and status in ('draft', 'pending_review', 'active')
    and verification_status = 'unverified'
    and is_featured = false
    and views_count = 0
    and copies_count = 0
    and clicks_count = 0
    and saves_count = 0
  );

-- Fusiona "edito mis referidos" + "staff edita cualquier referido". Lo que un
-- autor NO puede cambiar (estado reservado, verificación, contadores...) lo
-- sigue impidiendo el trigger guard_referral_moderation, no la policy.
drop policy if exists "edito mis referidos" on public.referrals;
drop policy if exists "staff edita cualquier referido" on public.referrals;
create policy "edito mis referidos o modero"
  on public.referrals for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_staff()))
  with check (owner_id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "borro mis referidos" on public.referrals;
create policy "borro mis referidos"
  on public.referrals for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_staff()));

-- --- saved_referrals --------------------------------------------------------
drop policy if exists "mis guardados" on public.saved_referrals;
create policy "mis guardados"
  on public.saved_referrals for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- --- referral_events --------------------------------------------------------
drop policy if exists "el dueño ve los eventos de sus referidos" on public.referral_events;
create policy "el dueño ve los eventos de sus referidos"
  on public.referral_events for select to authenticated
  using (
    (select public.is_staff())
    or exists (
      select 1 from public.referrals r
      where r.id = referral_id and r.owner_id = (select auth.uid())
    )
  );

drop policy if exists "registrar evento sobre referido activo" on public.referral_events;
create policy "registrar evento sobre referido activo"
  on public.referral_events for insert to anon, authenticated
  with check (
    (actor_id is null or actor_id = (select auth.uid()))
    and exists (
      select 1 from public.referrals r
      where r.id = referral_id and r.status = 'active'
    )
  );

-- --- referral_votes ---------------------------------------------------------
-- "votos visibles" (select, using true) se queda. "mi voto" era `for all` y se
-- solapaba con ella en SELECT: se parte en las tres escrituras.
drop policy if exists "mi voto" on public.referral_votes;
create policy "voto"
  on public.referral_votes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "cambio mi voto"
  on public.referral_votes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "retiro mi voto"
  on public.referral_votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- --- reports / report_notes -------------------------------------------------
drop policy if exists "veo mis reportes" on public.reports;
create policy "veo mis reportes"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "creo reportes" on public.reports;
create policy "creo reportes"
  on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and moderator_id is null
  );

drop policy if exists "solo staff resuelve reportes" on public.reports;
create policy "solo staff resuelve reportes"
  on public.reports for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

drop policy if exists "solo staff lee notas de moderación" on public.report_notes;
create policy "solo staff lee notas de moderación"
  on public.report_notes for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()) and author_id = (select auth.uid()));

-- --- activity / preferencias / settings / auditoría -------------------------
drop policy if exists "mi actividad" on public.activity;
create policy "mi actividad"
  on public.activity for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "marco mi actividad como leída" on public.activity;
create policy "marco mi actividad como leída"
  on public.activity for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "mis preferencias" on public.notification_preferences;
create policy "mis preferencias"
  on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- "settings de lectura pública" (select, using true) se queda.
drop policy if exists "solo admin edita settings" on public.app_settings;
create policy "solo admin crea settings"
  on public.app_settings for insert to authenticated
  with check ((select public.has_role('admin')));
create policy "solo admin edita settings"
  on public.app_settings for update to authenticated
  using ((select public.has_role('admin')))
  with check ((select public.has_role('admin')));
create policy "solo admin borra settings"
  on public.app_settings for delete to authenticated
  using ((select public.has_role('admin')));

drop policy if exists "solo staff lee la auditoría" on public.audit_log;
create policy "solo staff lee la auditoría"
  on public.audit_log for select to authenticated
  using ((select public.is_staff()));

-- --- brands -----------------------------------------------------------------
drop policy if exists "creo marcas" on public.brands;
create policy "creo marcas"
  on public.brands for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "staff modera marcas" on public.brands;
create policy "staff modera marcas"
  on public.brands for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- --- storage.objects (brand-logos, avatars) ---------------------------------
drop policy if exists "logos de marca: subo a mi carpeta" on storage.objects;
create policy "logos de marca: subo a mi carpeta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "logos de marca: actualizo mi carpeta" on storage.objects;
create policy "logos de marca: actualizo mi carpeta"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "logos de marca: borro de mi carpeta" on storage.objects;
create policy "logos de marca: borro de mi carpeta"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatares: subo a mi carpeta" on storage.objects;
create policy "avatares: subo a mi carpeta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatares: actualizo mi carpeta" on storage.objects;
create policy "avatares: actualizo mi carpeta"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatares: borro de mi carpeta" on storage.objects;
create policy "avatares: borro de mi carpeta"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatares: listo mi carpeta" on storage.objects;
create policy "avatares: listo mi carpeta"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- ---------------------------------------------------------------------------
-- 3. AGREGADOS DEL CATÁLOGO
--
-- security_invoker como todas las vistas del proyecto: encadenan sobre
-- public_referrals, que ya filtra status = 'active' y respeta el RLS.
-- ---------------------------------------------------------------------------

-- Nº de referidos activos por categoría (el chip de Explorar).
create view public.public_category_counts
with (security_invoker = true) as
select
  category_slug,
  count(*)::int as active_count
from public.public_referrals
where category_slug is not null
group by category_slug;

grant select on public.public_category_counts to anon, authenticated;

-- La banda de métricas de la home, en una sola fila. "Usos" = copias + clics,
-- mismo criterio que en toda la app: ver no es usar.
create view public.public_catalog_stats
with (security_invoker = true) as
select
  count(*)::int as active_count,
  (count(*) filter (where published_at >= now() - interval '24 hours'))::int as new_today,
  coalesce(sum(copies_count + clicks_count), 0)::bigint as total_uses,
  (
    select pr.category_name
    from public.public_referrals pr
    where pr.category_name is not null
    group by pr.category_name
    order by sum(pr.copies_count + pr.clicks_count) desc, pr.category_name
    limit 1
  ) as trending_category
from public.public_referrals;

grant select on public.public_catalog_stats to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 4. public_profiles: agrupa también por username
--
-- Mismo SELECT y mismas columnas que en 20260713000000; solo cambia el
-- GROUP BY. username depende funcionalmente de p.id, así que el resultado es
-- idéntico, pero ahora el planner puede aplicar `where username = ...` antes
-- de agregar (usa el índice único de profiles.username).
-- ---------------------------------------------------------------------------
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
group by p.id, p.username;

grant select on public.public_profiles to anon, authenticated;
