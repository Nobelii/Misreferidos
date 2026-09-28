# Image Pipeline — Cómo Funciona

## Sharp

Librería Node para procesamiento de imágenes. Operaciones clave:
- `sharp(buffer).resize(width, height, { fit })` — redimensionar
- `.webp({ quality })` — convertir a WebP
- `.toBuffer({ resolveWithObject: true })` — obtener buffer + metadata (width, height, size)

Siempre procesar antes de subir: convertir a WebP, limitar tamaño máximo, generar thumbnail.

## Cloudflare R2

Compatible con S3 SDK. Usar `@aws-sdk/client-s3` con:
- `PutObjectCommand` para subir
- `DeleteObjectCommand` para borrar
- `GetObjectCommand` para descargar

Endpoint, credentials y bucket van en env vars. La URL pública se construye con el public URL del bucket + key.

## Naming de keys

Usar estructura jerárquica: `{entidad}/{id}/{archivo}.webp`. Guardar el key en DB para poder borrar.

## Módulo reutilizable (USAR ESTE, no reinventar)

- `lib/storage/r2.ts` — cliente R2 + `uploadToR2`, `deleteFromR2`, `publicUrl`, `r2Configured`.
- `lib/storage/images.ts` — `processImage(buffer, preset)` (Sharp → WebP) + `IMAGE_PRESETS`
  (`avatar`, `property`, `plan`).
- `app/api/upload/route.ts` — `POST` multipart (`file`, `folder`): auth → Sharp → R2,
  key `{folder}/{userId}/{uuid}.webp`. Devuelve `{ url, key, width, height }`.
- `lib/hooks/use-image-upload.ts` — hook cliente `useImageUpload(folder)` → `{ upload, uploading, error }`.

En uso: avatar del onboarding (`onboarding-form.tsx` → `PhotoUpload`) y fotos de propiedad
(`section-multimedia.tsx`, persistidas en `property_media` vía `syncMedia`).
