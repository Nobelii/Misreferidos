"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMyProfile } from "@/lib/actions";

export function ProfileForm({
  initial,
}: {
  initial: {
    displayName: string;
    username: string;
    bio: string;
    location: string;
  };
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      const result = await updateMyProfile(form);
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={form.displayName}
            maxLength={60}
            onChange={(e) => set("displayName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="username">Usuario</Label>
          {/* El @ es decorativo: la base guarda el username sin él, y el CHECK
              username_format rechazaría el símbolo. */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
              @
            </span>
            <Input
              id="username"
              value={form.username}
              maxLength={30}
              className="pl-7"
              onChange={(e) => set("username", e.target.value.toLowerCase())}
            />
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="bio">Bio</Label>
          <Input
            id="bio"
            value={form.bio}
            maxLength={280}
            onChange={(e) => set("bio", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="location">Ubicación</Label>
          <Input
            id="location"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-600">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        {saved && !pending && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <Check className="w-3.5 h-3.5" />
            Guardado
          </span>
        )}
      </div>
    </>
  );
}
