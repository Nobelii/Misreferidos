import { describe, expect, it } from "vitest";
import { recentUseLabel, relativeTime } from "@/lib/format-time";

const NOW = new Date("2026-09-01T12:00:00Z").getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("relativeTime", () => {
  it.each([
    [10_000, "ahora"],
    [5 * MIN, "hace 5 min"],
    [3 * HOUR, "hace 3 h"],
    [4 * DAY, "hace 4 d"],
  ])("%i ms atrás → %s", (ms, expected) => {
    expect(relativeTime(ago(ms), NOW)).toBe(expected);
  });
});

describe("recentUseLabel", () => {
  it("devuelve null sin fecha, en el futuro o fuera de la ventana", () => {
    expect(recentUseLabel(undefined, NOW)).toBeNull();
    expect(recentUseLabel(ago(-HOUR), NOW)).toBeNull();
    expect(recentUseLabel(ago(8 * DAY), NOW)).toBeNull();
  });

  it.each([
    [10 * MIN, "Usado en la última hora"],
    [90 * MIN, "Usado hace 1 hora"],
    [5 * HOUR, "Usado hace 5 horas"],
    [30 * HOUR, "Usado ayer"],
    [3 * DAY, "Usado hace 3 días"],
  ])("%i ms atrás → %s", (ms, expected) => {
    expect(recentUseLabel(ago(ms), NOW)).toBe(expected);
  });
});
