"use client";

import { useOptimistic, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { updateNotificationPreferences } from "@/lib/actions";

export interface NotificationPrefs {
  notifyUses: boolean;
  notifyVerification: boolean;
  notifyExpiration: boolean;
  notifyNews: boolean;
}

const FIELDS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: "notifyUses", label: "Cuando alguien usa o guarda un beneficio que publiqué" },
  { key: "notifyVerification", label: "Cuando verificamos uno de mis beneficios" },
  { key: "notifyExpiration", label: "Cuando un beneficio mío está por vencer" },
  { key: "notifyNews", label: "Novedades y beneficios destacados de la comunidad" },
];

/**
 * Estos toggles no son decorativos: los triggers de actividad de Postgres
 * consultan notification_preferences antes de insertar, así que desmarcar
 * "cuando alguien usa" corta de verdad esas notificaciones en la base.
 *
 * Guarda al vuelo, sin botón: son cuatro booleanos, y un "Guardar" aparte solo
 * añade un paso que la gente se olvida de dar.
 */
export function NotificationPreferencesForm({
  initial,
}: {
  initial: NotificationPrefs;
}) {
  const [prefs, setPrefs] = useOptimistic(initial);
  const [, startTransition] = useTransition();

  function toggle(key: keyof NotificationPrefs, value: boolean) {
    startTransition(async () => {
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      await updateNotificationPreferences(next);
    });
  }

  return (
    <div className="space-y-3">
      {FIELDS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-3">
          <Checkbox
            id={key}
            checked={prefs[key]}
            onCheckedChange={(checked) => toggle(key, checked === true)}
          />
          <Label htmlFor={key} className="text-sm font-normal text-slate-600">
            {label}
          </Label>
        </div>
      ))}
    </div>
  );
}
