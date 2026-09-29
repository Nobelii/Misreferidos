import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/utils";

describe("safeNextPath", () => {
  it("acepta rutas internas", () => {
    expect(safeNextPath("/app/perfil")).toBe("/app/perfil");
    expect(safeNextPath("/marca/netflix?oferta=1")).toBe("/marca/netflix?oferta=1");
  });

  it("rechaza destinos externos o ambiguos", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("usa el fallback si no hay destino", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("", "/perfil")).toBe("/perfil");
  });
});
