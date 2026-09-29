"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { updateMyAvatar } from "@/lib/actions";
import { ALLOWED_AVATAR_TYPES, MAX_AVATAR_BYTES } from "@/lib/types";

export function AvatarUpload({
  name,
  initialUrl,
}: {
  name: string;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateMyAvatar(fd);
      if (result.ok) setUrl(result.url);
      else setError(result.error);
    });
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    // Validación temprana para no subir 5 MB y enterarse después. La real
    // está en la action y en el propio bucket.
    if (!(ALLOWED_AVATAR_TYPES as readonly string[]).includes(file.type)) {
      setError("La imagen debe ser PNG, JPG o WEBP.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("La imagen pesa demasiado (máx. 1 MB).");
      return;
    }
    const fd = new FormData();
    fd.set("avatar", file);
    submit(fd);
  }

  function remove() {
    const fd = new FormData();
    fd.set("remove", "1");
    submit(fd);
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar
        name={name}
        avatarUrl={url}
        size={64}
        textClassName="text-2xl"
      />
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {url ? "Cambiar foto" : "Subir foto"}
          </Button>
          {url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={remove}
            >
              Quitar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPG o WEBP. Máx. 1 MB.</p>
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-rose-600">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_AVATAR_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
