-- CREATE OR REPLACE FUNCTION descarta los SET que no se redeclaren, así que al
-- reescribir set_published_at() en 20260728000000 se perdió el
-- `set search_path = public` que le puso 20260713010000. Esto lo restaura en la
-- base remota, que ya tenía aplicada la versión sin él.
--
-- El archivo 20260728000000 ya lo declara dentro de la propia función, de modo
-- que un `db reset` desde cero llega al mismo estado y esta migración es un
-- no-op idempotente.
alter function public.set_published_at() set search_path = public;
