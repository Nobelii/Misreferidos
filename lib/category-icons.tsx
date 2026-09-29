import { createElement } from "react";
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

/**
 * El icono de una categoría como componente. Resolver el icono con
 * categoryIcon() y pintarlo en el mismo render lo marca la regla
 * react-hooks/static-components (no puede saber que devuelve un componente ya
 * existente del mapa, no uno nuevo); createElement evita el falso positivo.
 */
export function CategoryIcon({
  iconName,
  className,
}: {
  iconName: string | null | undefined;
  className?: string;
}) {
  return createElement(categoryIcon(iconName), { className });
}
