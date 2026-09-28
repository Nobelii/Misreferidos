-- ============================================================================
-- Endurecimiento de privilegios sobre funciones.
--
-- PostgREST expone TODA función del schema public como /rest/v1/rpc/<nombre>.
-- Sin los revoke de abajo, expire_referrals() —que es SECURITY DEFINER— era
-- invocable por cualquier anónimo con un POST, y podía vencer de golpe todos
-- los referidos de la plataforma.
--
-- Postgres no exige EXECUTE para disparar un trigger, así que revocar el
-- permiso no rompe ninguno de los triggers que usan estas funciones.
-- ============================================================================

alter function public.set_updated_at()     set search_path = public;
alter function public.slugify(text)        set search_path = public;
alter function public.set_referral_slugs() set search_path = public;
alter function public.set_published_at()   set search_path = public;

revoke execute on function public.set_updated_at()            from anon, authenticated;
revoke execute on function public.slugify(text)               from anon, authenticated;
revoke execute on function public.set_referral_slugs()        from anon, authenticated;
revoke execute on function public.set_published_at()          from anon, authenticated;
revoke execute on function public.handle_new_user()           from anon, authenticated;
revoke execute on function public.bump_referral_counter()     from anon, authenticated;
revoke execute on function public.sync_saves_count()          from anon, authenticated;
revoke execute on function public.sync_helpful_count()        from anon, authenticated;
revoke execute on function public.sync_reports_count()        from anon, authenticated;
revoke execute on function public.guard_referral_moderation() from anon, authenticated;
revoke execute on function public.expire_referrals()          from anon, authenticated;

-- Siguen siendo ejecutables a propósito:
--   has_role / is_staff          -> las policies las evalúan con el rol que
--                                   consulta, y solo revelan el rol del propio
--                                   llamante.
--   my_dashboard_stats           -> security invoker; el RLS la contiene.
--   profile_top_categories       -> security invoker; solo lee referidos activos.
