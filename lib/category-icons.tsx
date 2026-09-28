import {
  LayoutGrid,
  Banknote,
  ShoppingCart,
  UtensilsCrossed,
  Briefcase,
  Zap,
  Plane,
  Sparkles,
  Clapperboard,
  HeartPulse,
  Tag,
  type LucideIcon,
} from "lucide-react";

// La base guarda el nombre del icono como texto (categories.icon_name), no el
// componente. Este mapa lo resuelve, y el fallback permite añadir una categoría
// desde admin sin desplegar código: aparecerá con el icono genérico hasta que
// se añada aquí.
const ICONS: Record<string, LucideIcon> = {
  LayoutGrid,
  Banknote,
  ShoppingCart,
  UtensilsCrossed,
  Briefcase,
  Zap,
  Plane,
  Sparkles,
  Clapperboard,
  HeartPulse,
};

export function categoryIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Tag;
  return ICONS[iconName] ?? Tag;
}

/** Icono del sentinela "Todas" de los filtros. */
export const ALL_CATEGORIES_ICON = LayoutGrid;
