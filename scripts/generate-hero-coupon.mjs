// Vuelca el arte del cupón del hero (lib/hero-coupon-art.ts) a SVG estáticos.
// Uso: pnpm gen:hero  (Node >= 23.6 importa .ts directamente, sin compilar)
import { writeFileSync, mkdirSync } from "node:fs";
import { couponDotsSvg, couponScatterSvg } from "../lib/hero-coupon-art.ts";

const out = new URL("../public/hero/", import.meta.url);
mkdirSync(out, { recursive: true });

for (const [name, content] of [
  ["coupon-dots.svg", couponDotsSvg()],
  ["coupon-scatter.svg", couponScatterSvg()],
]) {
  writeFileSync(new URL(name, out), content);
  console.log(`public/hero/${name}  ${(content.length / 1024).toFixed(1)} KB`);
}
