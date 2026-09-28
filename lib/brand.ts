const BRAND_COLORS = [
  "bg-slate-900",
  "bg-olive-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-sky-600",
];

// Color determinista por marca (mismo hash en servidor y cliente).
export function brandColor(brand: string) {
  const hash = Array.from(brand).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return BRAND_COLORS[hash % BRAND_COLORS.length];
}
