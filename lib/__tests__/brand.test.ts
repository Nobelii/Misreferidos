import { describe, expect, it } from "vitest";
import { brandColor } from "@/lib/brand";
import { brandDomain } from "@/lib/types";

describe("brandColor", () => {
  it("es determinista", () => {
    expect(brandColor("Spotify")).toBe(brandColor("Spotify"));
  });
});

describe("brandDomain", () => {
  it("quita el www y la ruta", () => {
    expect(brandDomain("https://www.spotify.com/es/premium")).toBe("spotify.com");
  });

  it("devuelve vacío si la URL no es válida", () => {
    expect(brandDomain("no es una url")).toBe("");
  });
});
