import type {
  ActivityType,
  AttentionReason,
  BenefitStatus,
} from "@/lib/types";
import type { Enums } from "@/lib/database.types";

// La base habla inglés y la UI español. Este es el punto de traducción para los
// enums que no tienen ya un meta propio.
//
// Los tipos de beneficio NO están aquí: su label, icono, color y unidad viven
// juntos en BENEFIT_TYPE_META (lib/benefit-format.ts), y los tags en TAG_STYLES.

export const STATUS_LABEL: Record<BenefitStatus, string> = {
  draft: "Borrador",
  pending_review: "En revisión",
  active: "Activo",
  rejected: "Rechazado",
  expired: "Vencido",
  archived: "Pausado",
};

export const ATTENTION_REASON_LABEL: Record<AttentionReason, string> = {
  expired: "Venció",
  reported: "Fue reportado",
  rejected: "Fue rechazado",
  expiring_soon: "Termina pronto",
  archived: "Está pausado",
  pending_review: "En revisión",
  no_traction: "Sin usos todavía",
};

export const ATTENTION_REASON_ACTION: Record<AttentionReason, string> = {
  expired: "Actualizar fecha",
  reported: "Ver reporte",
  rejected: "Ver motivo",
  expiring_soon: "Extender",
  archived: "Reactivar",
  pending_review: "Ver estado",
  no_traction: "Compartir",
};

export const REPORT_REASON_LABEL: Record<Enums<"report_reason">, string> = {
  expired: "El beneficio ya venció",
  invalid_code: "El código no funciona",
  spam: "Es spam",
  misleading: "La información engaña",
  inappropriate: "Contenido inapropiado",
  duplicate: "Está duplicado",
  other: "Otro motivo",
};

/**
 * Texto del feed de actividad. La base guarda type + metadata, nunca la frase
 * ya renderizada, así que la copy se puede cambiar o traducir sin migrar filas.
 */
export function activityLabel(type: ActivityType, brand?: string): string {
  const b = brand ?? "tu referido";
  switch (type) {
    case "referral_used":
      return `Alguien usó tu código de ${b}`;
    case "referral_published":
      return `Publicaste tu referido de ${b}`;
    case "referral_verified":
      return `Tu referido de ${b} fue verificado`;
    case "referral_trending":
      return `Tu referido de ${b} entró en tendencia`;
    case "referral_saved":
      return `Alguien guardó tu referido de ${b}`;
    case "referral_reported":
      return `Tu referido de ${b} recibió un reporte`;
    case "referral_expired":
      return `Tu referido de ${b} venció`;
  }
}
