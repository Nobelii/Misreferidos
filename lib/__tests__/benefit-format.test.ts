import { describe, expect, it } from "vitest";
import {
  daysUntil,
  formatBenefitValue,
  formatCount,
  formatExpiry,
  isEndingSoon,
  isExpired,
  magnitude,
} from "@/lib/benefit-format";
import type { Benefit } from "@/lib/types";

const NOW = new Date("2026-09-01T12:00:00Z");
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString();

function benefit(overrides: Partial<Benefit> = {}): Benefit {
  return {
    id: "1",
    brand: "Marca",
    brandSlug: "marca",
    headline: "Oferta",
    category: "Compras",
    type: "discount",
    value: "40",
    ctaLabel: "Copiar Código",
    uses: 0,
    views: 0,
    savedCount: 0,
    helpfulCount: 0,
    verified: false,
    ...overrides,
  };
}

describe("formatBenefitValue", () => {
  it.each([
    [{ type: "discount", value: "40" }, "40% OFF"],
    [{ type: "discount" }, "Descuento"],
    [{ type: "cashback", value: "5" }, "5% de cashback"],
    [{ type: "free_months", value: "1" }, "1 mes gratis"],
    [{ type: "free_months", value: "3" }, "3 meses gratis"],
    [{ type: "free_trial", value: "1" }, "1 día gratis"],
    [{ type: "free_trial", value: "30" }, "30 días gratis"],
    [{ type: "bonus", value: "20" }, "$20 de bono"],
    [{ type: "gift" }, "Regalo de bienvenida"],
    [{ type: "free_shipping", value: "99" }, "Envío gratis"],
    [{ type: "bogo" }, "2x1"],
    [{ type: "other", value: "Acceso VIP" }, "Acceso VIP"],
    [{ type: "other" }, "Beneficio"],
  ] as const)("%o → %s", (input, expected) => {
    expect(formatBenefitValue(input)).toBe(expected);
  });

  it("ignora espacios alrededor del valor", () => {
    expect(formatBenefitValue({ type: "discount", value: "  15 " })).toBe("15% OFF");
    expect(formatBenefitValue({ type: "discount", value: "   " })).toBe("Descuento");
  });
});

describe("caducidad", () => {
  it("daysUntil redondea hacia arriba", () => {
    expect(daysUntil(inDays(0.5), NOW)).toBe(1);
    expect(daysUntil(inDays(-0.5), NOW)).toBe(-0);
  });

  it("sin fecha no caduca ni termina pronto", () => {
    const b = benefit();
    expect(isExpired(b, NOW)).toBe(false);
    expect(isEndingSoon(b, NOW)).toBe(false);
    expect(formatExpiry(b, NOW)).toBeUndefined();
  });

  it("marca como vencida una fecha pasada", () => {
    const b = benefit({ expiresAt: inDays(-2) });
    expect(isExpired(b, NOW)).toBe(true);
    expect(formatExpiry(b, NOW)).toBe("Vencido");
  });

  it("termina pronto dentro de 7 días, no después", () => {
    expect(isEndingSoon(benefit({ expiresAt: inDays(7) }), NOW)).toBe(true);
    expect(isEndingSoon(benefit({ expiresAt: inDays(8) }), NOW)).toBe(false);
  });

  it.each([
    [1, "Termina mañana"],
    [5, "Termina en 5 días"],
    [30, "Termina en 30 días"],
  ])("a %i días → %s", (d, expected) => {
    expect(formatExpiry(benefit({ expiresAt: inDays(d) }), NOW)).toBe(expected);
  });

  it("más allá de 30 días enseña la fecha", () => {
    expect(formatExpiry(benefit({ expiresAt: "2026-12-25T00:00:00Z" }), NOW)).toMatch(
      /^Válido hasta el 25 dic/,
    );
  });
});

describe("magnitude", () => {
  it("ordena meses gratis por encima de un descuento equivalente", () => {
    const months = magnitude(benefit({ type: "free_months", value: "3" }));
    const discount = magnitude(benefit({ type: "discount", value: "30" }));
    expect(months).toBeGreaterThan(discount);
  });

  it("valores no numéricos cuentan como 0", () => {
    expect(magnitude(benefit({ type: "discount", value: "abc" }))).toBe(0);
  });
});

describe("formatCount", () => {
  it("abrevia los miles", () => {
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1500)).toBe("1.5k");
  });
});
