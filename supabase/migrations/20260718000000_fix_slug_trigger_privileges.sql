-- ============================================================================
-- Fix: set_referral_slugs debe ser SECURITY DEFINER
--
-- El trigger set_referral_slugs (BEFORE INSERT de referrals) llama a
-- public.slugify(), a la que 20260713010000_harden_function_privileges.sql le
-- revocó EXECUTE de anon/authenticated. Como el trigger corría con los
-- privilegios del rol que inserta, cualquier INSERT hecho por un usuario
-- `authenticated` fallaba con "permission denied for function slugify".
--
-- Los referidos existentes no lo notaron porque se sembraron como `postgres`
-- (BYPASSRLS). Se pasa a SECURITY DEFINER, igual que bump_referral_counter y
-- guard_referral_moderation, para que llame a slugify con privilegios del
-- propietario. Es el mismo arreglo que ya se hizo para set_brand_slug.
-- ============================================================================
create or replace function public.set_referral_slugs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.brand_slug := public.slugify(new.brand);
  if new.slug is null or new.slug = '' then
    new.slug := left(new.brand_slug || '-' || public.slugify(new.title), 100)
                || '-' || substr(new.id::text, 1, 6);
  end if;
  return new;
end;
$$;

-- El trigger no necesita EXECUTE del rol; se mantiene revocado.
revoke execute on function public.set_referral_slugs() from anon, authenticated;
