-- ============================================================================
-- Cierra de verdad las funciones SECURITY DEFINER.
--
-- La migración 20260713010000 revocaba EXECUTE de `anon` y `authenticated`, y
-- NO SERVÍA DE NADA: Postgres concede EXECUTE a PUBLIC por defecto en toda
-- función nueva, y ambos roles lo heredaban por ahí.
--
-- Verificado en caliente: un POST sin sesión a /rest/v1/rpc/expire_referrals
-- devolvía 0. Es decir, cualquiera podía vencer de golpe todos los referidos
-- activos de la plataforma.
--
-- Regla para el futuro: toda función SECURITY DEFINER nueva necesita su
-- `revoke execute ... from public`, o queda expuesta como endpoint RPC.
-- Revocar solo de anon/authenticated no basta.
--
-- Los triggers no se ven afectados: Postgres no exige EXECUTE sobre la función
-- para dispararla desde un trigger (comprobado).
-- ============================================================================

revoke execute on function public.expire_referrals()           from public;
revoke execute on function public.handle_new_user()            from public;
revoke execute on function public.guard_referral_moderation()  from public;
revoke execute on function public.bump_referral_counter()      from public;
revoke execute on function public.sync_saves_count()           from public;
revoke execute on function public.sync_helpful_count()         from public;
revoke execute on function public.sync_reports_count()         from public;
revoke execute on function public.set_updated_at()             from public;
revoke execute on function public.set_referral_slugs()         from public;
revoke execute on function public.set_published_at()           from public;
revoke execute on function public.slugify(text)                from public;

revoke execute on function public.push_activity(uuid, uuid, public.activity_type, text) from public;
revoke execute on function public.activity_on_use()        from public;
revoke execute on function public.activity_on_save()       from public;
revoke execute on function public.activity_on_moderation() from public;
revoke execute on function public.activity_on_report()     from public;

-- has_role() e is_staff() SÍ se quedan ejecutables a propósito: las policies de
-- `anon` las invocan (p. ej. "perfiles activos visibles para todos" llama a
-- is_staff()), y solo revelan el rol de quien llama.
--
-- my_dashboard_stats() y profile_top_categories() son SECURITY INVOKER: el RLS
-- las contiene por sí solo.
