/**
 * Tiempo relativo en español.
 *
 * `now` se pasa como parámetro y no se lee con Date.now() dentro: las páginas
 * que usan esto están cacheadas, y Cache Components prohíbe leer la hora
 * durante el prerender. Quien llame debe calcularla en el cliente tras montar
 * (ver el patrón de useEffect en components/activity-feed.tsx).
 */
export function relativeTime(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.round((now - then) / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `hace ${diffD} d`;
}

/** Ventana de actividad reciente, en días. Fuera de ella no se dice nada. */
export const RECENT_USE_DAYS = 7;

/**
 * Igual, pero sin bajar de la hora y en lenguaje natural.
 *
 * La razón de no dar minutos no es estética: la ficha de marca está cacheada
 * con cacheLife("hours") y trackEvent no invalida nada a propósito (hacerlo en
 * cada uso destruiría la caché). Así que este dato puede llegar con hasta una
 * hora de desfase — decir "hace 5 min" sería mentira la mitad de las veces.
 *
 * Devuelve null si no hay fecha o si el uso queda fuera de RECENT_USE_DAYS: sin
 * actividad reciente es mejor no decir nada que presumir de un uso de hace un
 * mes.
 */
export function recentUseLabel(iso: string | undefined, now: number): string | null {
  if (!iso) return null;

  const diffH = (now - new Date(iso).getTime()) / 3_600_000;
  if (diffH < 0 || diffH > RECENT_USE_DAYS * 24) return null;

  if (diffH < 1) return "Usado en la última hora";
  if (diffH < 2) return "Usado hace 1 hora";
  if (diffH < 24) return `Usado hace ${Math.floor(diffH)} horas`;

  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Usado ayer";
  return `Usado hace ${diffD} días`;
}
