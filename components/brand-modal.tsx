"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, UploadCloud, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createBrand } from "@/lib/brand-actions";
import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_BYTES,
  type Brand,
  type Category,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Modal para crear una marca nueva. Al crearla la devuelve por onCreated para
 * que el combobox la preseleccione de inmediato.
 */
export function BrandModal({
  open,
  onClose,
  onCreated,
  categories,
  initialName = "",
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (brand: Brand) => void;
  categories: Category[];
  initialName?: string;
}) {
  const [name, setName] = useState(initialName);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rellena el nombre con lo que la persona ya tecleó en el buscador.
  useEffect(() => {
    if (open) {
      setName(initialName);
      setWebsiteUrl("");
      setCategorySlug("");
      setDescription("");
      setFile(null);
      setPreview(null);
      setError(null);
    }
  }, [open, initialName]);

  // Libera el object URL del preview al cambiarlo o cerrar.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (!open) return null;

  function pickFile(f: File | null) {
    setError(null);
    if (!f) return;
    if (!ALLOWED_LOGO_TYPES.includes(f.type as (typeof ALLOWED_LOGO_TYPES)[number])) {
      setError("El logo debe ser PNG, JPG, WEBP o SVG.");
      return;
    }
    if (f.size > MAX_LOGO_BYTES) {
      setError("El logo pesa demasiado (máx. 2 MB).");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("El nombre de la marca es obligatorio.");
    if (!/^https?:\/\/.+\..+/.test(websiteUrl.trim()))
      return setError("La URL debe empezar por http:// o https://");
    if (!file) return setError("Sube el logo de la marca.");

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("websiteUrl", websiteUrl.trim());
    formData.set("categorySlug", categorySlug);
    formData.set("description", description.trim());
    formData.set("logo", file);

    startTransition(async () => {
      const result = await createBrand(formData);
      if (result.ok) {
        onCreated(result.brand);
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  // Se renderiza en un portal a document.body: si no, el <form> del modal
  // quedaría anidado dentro del <form> de publicar (el combobox vive dentro de
  // ese form) y HTML no permite forms anidados → error de hidratación.
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-md animate-[modal-overlay-in_220ms_cubic-bezier(.33,1,.68,1)_forwards]"
        style={{ opacity: 0 }}
        onClick={pending ? undefined : onClose}
      />

      <div
        className="relative w-full max-w-md bg-paper rounded-2xl shadow-2xl shadow-black/10 border border-line p-7 animate-[modal-in_220ms_cubic-bezier(.33,1,.68,1)_forwards]"
        style={{ opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="font-display text-xl font-semibold text-ink">
          Añade una marca
        </h2>
        <p className="text-sm text-muted-foreground mt-1 mb-5">
          Queda disponible para toda la comunidad y podrás usarla en tu referido
          de inmediato.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field label="Nombre de la marca" required htmlFor="brand-name">
            <Input
              id="brand-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spotify"
              maxLength={80}
              autoFocus
            />
          </Field>

          <Field label="Sitio web oficial" required htmlFor="brand-url">
            <Input
              id="brand-url"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://spotify.com"
            />
          </Field>

          <Field label="Logo" required htmlFor="brand-logo">
            <input
              ref={fileInputRef}
              id="brand-logo"
              type="file"
              accept={ALLOWED_LOGO_TYPES.join(",")}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-line bg-background px-3 py-3 text-left hover:border-olive-300 transition-colors"
            >
              {preview ? (
                <Image
                  src={preview}
                  alt="Vista previa del logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-md object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-olive-50 text-olive-700">
                  <UploadCloud className="h-5 w-5" />
                </span>
              )}
              <span className="min-w-0 text-sm">
                <span className="block font-medium text-ink truncate">
                  {file ? file.name : "Sube un logo"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  PNG, JPG, WEBP o SVG · máx. 2 MB
                </span>
              </span>
            </button>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Categoría" htmlFor="brand-category" hint="Opcional">
              <select
                id="brand-category"
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Descripción" htmlFor="brand-desc" hint="Opcional">
              <Input
                id="brand-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Música en streaming"
                maxLength={280}
              />
            </Field>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {pending ? "Creando…" : "Crear marca"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  required,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5")}>
      <Label htmlFor={htmlFor} className="text-sm">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
        {hint && <span className="ml-1 text-xs text-muted-foreground">({hint})</span>}
      </Label>
      {children}
    </div>
  );
}
