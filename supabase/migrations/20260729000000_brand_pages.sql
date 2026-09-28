-- ============================================================================
-- PÁGINAS DE MARCA — navegación de dos niveles
--
-- Prepara el modelo tipo CouponFollow: Explorar = directorio de marcas,
-- /marca/[slug] = todas las ofertas de esa marca, modal = el código.
--
-- Es 100% ADITIVO: ni una columna nueva en `brands` ni en `referrals`. Todo lo
-- que hacen falta ya estaba (magnitude y auto_tag los calcula public_referrals,
-- los contadores los mantiene bump_referral_counter, y los votos útiles viven
-- en referral_votes / referrals.helpful_count).
--
-- Tres cosas:
--   1. `brand_id` se expone en public_referrals (hoy solo salía brand_slug).
--   2. Vista nueva public_brands: un renglón por marca con sus agregados.
--   3. Índice para el listado por marca.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. public_referrals: exponer brand_id
--
-- Sin brand_id no se puede unir de forma fiable con `brands`: los slugs pueden
-- divergir, porque set_brand_slug() añade un sufijo del id cuando el slug
-- limpio ya existe (dos marcas con nombres que slugifican igual).
--
-- Va como ÚLTIMA columna a propósito: CREATE OR REPLACE VIEW solo admite
-- columnas nuevas al final. El resto del SELECT es idéntico al de
-- 20260728000000_remove_manual_approval.sql.
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

  -- Tag automático. Mismas reglas y prioridad que TAG_STYLES en el cliente.
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

  -- NUEVO. Nullable a propósito: los referidos anteriores a la tabla `brands`
  -- llevan solo el nombre denormalizado, sin FK.
  r.brand_id
from public.referrals r
join public.categories c on c.id = r.category_id
join public.profiles p   on p.id = r.owner_id
left join public.brands b on b.id = r.brand_id
where r.status = 'active';

grant select on public.public_referrals to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 2. public_brands — el directorio
--
-- Un renglón por marca, con lo que necesitan la card del directorio y la
-- cabecera de /marca/[slug]. Se agrega aquí y no en la app para no hacer N+1:
-- el directorio es UNA query.
--
-- security_invoker = true, como todas las vistas del proyecto. Encadena sobre
-- public_referrals, que ya filtra status = 'active', así que el directorio solo
-- ve lo publicado. No hay ningún filtro de aprobación: eso se quitó en
-- 20260728000000 y aquí no vuelve por la puerta de atrás.
--
-- La clave de agrupación es coalesce(b.slug, pr.brand_slug): unifica las marcas
-- reales con los referidos legados (brand_id nulo, brand_slug siempre presente),
-- así que ninguna marca se queda fuera del directorio.
--
-- OJO: una marca sin ofertas activas NO aparece aquí. Su página de marca sigue
-- funcionando — getBrandBySlug() cae a leer `brands` directamente, cuya policy
-- de SELECT ya es pública.
-- ---------------------------------------------------------------------------
create view public.public_brands
with (security_invoker = true) as
select
  coalesce(b.slug, pr.brand_slug)              as slug,
  coalesce(max(b.name), max(pr.brand))         as name,
  max(b.logo_url)                              as logo_url,
  max(b.website_url)                           as website_url,
  max(b.description)                           as description,

  count(*)::int                                as offers_count,
  sum(pr.copies_count + pr.clicks_count)::int  as total_uses,
  sum(pr.helpful_count)::int                   as helpful_count,
  max(pr.magnitude)                            as best_magnitude,
  max(pr.published_at)                         as last_published_at,
  bool_or(pr.is_verified)                      as has_verified,

  -- El gancho de la card ("Hasta 50% OFF") sale de la mejor oferta de la marca.
  -- array_agg ordenado + [1] en vez de DISTINCT ON: aquí ya estamos agrupando,
  -- y así las cuatro columnas salen de la MISMA fila ganadora.
  (array_agg(pr.benefit_type  order by pr.magnitude desc nulls last, pr.published_at desc))[1] as best_benefit_type,
  (array_agg(pr.value_amount  order by pr.magnitude desc nulls last, pr.published_at desc))[1] as best_value_amount,
  (array_agg(pr.category_name order by pr.magnitude desc nulls last, pr.published_at desc))[1] as best_category,
  (array_agg(pr.auto_tag      order by pr.magnitude desc nulls last, pr.published_at desc))[1] as best_tag
from public.public_referrals pr
left join public.brands b on b.id = pr.brand_id
group by coalesce(b.slug, pr.brand_slug);

grant select on public.public_brands to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 3. Índice del listado por marca
--
-- /marca/[slug] filtra por brand_slug, y hoy solo hay índice sobre brand_id
-- (que es nullable, así que no sirve para los legados). Parcial sobre 'active'
-- por coherencia con referrals_explore_idx y compañía: mucho más pequeño.
-- ---------------------------------------------------------------------------
create index referrals_brand_slug_idx
  on public.referrals (brand_slug, published_at desc)
  where status = 'active';
