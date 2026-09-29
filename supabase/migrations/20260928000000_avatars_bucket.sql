-- ============================================================================
-- AVATARES DE PERFIL
-- ============================================================================
-- profiles.avatar_url ya existía; faltaba dónde guardar la imagen.
--
-- Mismo modelo que `brand-logos` (20260717000000_brands.sql): bucket público
-- servido por CDN, sin policy de SELECT (evita listar el bucket), y escritura
-- solo dentro de la carpeta `<uid>/` de cada usuario.
--
-- Diferencia con brand-logos: aquí el tamaño y los tipos los impone el propio
-- bucket, no solo la server action. Y no se admite SVG: un SVG puede llevar
-- scripts, y un avatar no gana nada siendo vectorial.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true,
  1048576, -- 1 MB, igual que MAX_AVATAR_BYTES en lib/types.ts
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "avatares: subo a mi carpeta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatares: actualizo mi carpeta"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatares: borro de mi carpeta"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- La action lista la carpeta propia para borrar el avatar anterior. Sin esta
-- policy `list()` devuelve vacío y los avatares viejos se acumularían. Acotada
-- a la carpeta propia, así que no permite enumerar el bucket.
create policy "avatares: listo mi carpeta"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
