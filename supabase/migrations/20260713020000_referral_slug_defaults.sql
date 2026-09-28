-- slug y brand_slug los rellena siempre set_referral_slugs() (BEFORE INSERT).
-- Sin un DEFAULT, al ser NOT NULL salen como obligatorios en el tipo Insert
-- generado, y desde Next.js habría que inventarse un slug en cada alta.
--
-- El default vacío es un placeholder: el trigger lo sobrescribe antes de que
-- se evalúen el NOT NULL y el CHECK de formato.
alter table public.referrals alter column slug       set default '';
alter table public.referrals alter column brand_slug set default '';
