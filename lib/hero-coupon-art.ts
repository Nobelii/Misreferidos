/**
 * Arte del cupón del hero: la matriz de puntos pixelada.
 *
 * NO se renderiza en React. Son ~6.500 círculos: inline en el HTML pesaban
 * ~900 KB de markup más otro tanto en el payload RSC (casi 500 KB con gzip),
 * todo en el camino crítico de la home. scripts/generate-hero-coupon.mjs
 * vuelca estas capas a public/hero/*.svg, que el navegador pide aparte, en
 * paralelo y cacheadas como cualquier imagen.
 *
 * Para retocar el dibujo: cambia CFG o la generación y ejecuta
 * `pnpm gen:hero`. La semilla es fija, así que el resultado es determinista.
 */
// ═════════════════════════════════════════════════════════════════════════════
// CFG — ajusta aquí para tunear tamaño, densidad, colores y proporción
// ═════════════════════════════════════════════════════════════════════════════
export const CFG = {
  // Dimensiones conceptuales (unidades del viewBox)
  VB_W: 1000,
  VB_H: 450,
  STUB_W: 200,
  CORNER_R: 34,
  NOTCH_R: 24,

  // Retícula
  GRID_STEP: 14,
  JITTER: 4,

  // Colores
  PAGE_BG: "#f5f1e8",
  CARD_BG: "#EEF1E4",
  STUB_BG: "#1B1A17",
  ACCENT:  "#E8704A",
  DOT_INNER:  "#4C5636",   // olive-700 — cuerpo principal
  DOT_EDGE:   "#5E6B42",   // olive-600 — borde interior
  DOT_FRINGE: "#7C8A5A",   // olive-500 — fringe/halo
  DOT_MICRO:  "#93A268",   // olive-400 — segunda pasada
  DOT_STUB_HL:"#F5F1E8",   // crema sobre talonera
  DOT_SHADOW: "#3C442B",   // olive-800 — sombra pixelada
};

// ═════════════════════════════════════════════════════════════════════════════
// Utilidades matemáticas
// ═════════════════════════════════════════════════════════════════════════════
function seededRand(seed: number) {
  let x = seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

const smoothstep = (a: number, b: number, t: number) => {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// SDF de rectángulo redondeado centrado en el origen
function sdRoundedBox(px: number, py: number, hw: number, hh: number, r: number) {
  const qx = Math.abs(px) - hw + r;
  const qy = Math.abs(py) - hh + r;
  const outsideDist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const insideDist = Math.min(Math.max(qx, qy), 0);
  return outsideDist + insideDist - r;
}

// SDF combinado: rectángulo del cupón menos las dos muescas
function sdCoupon(x: number, y: number) {
  const { VB_W, VB_H, STUB_W, CORNER_R, NOTCH_R } = CFG;
  const rect = sdRoundedBox(x - VB_W / 2, y - VB_H / 2, VB_W / 2, VB_H / 2, CORNER_R);
  const sepX = VB_W - STUB_W;
  const notchTop = Math.hypot(x - sepX, y) - NOTCH_R;
  const notchBot = Math.hypot(x - sepX, y - VB_H) - NOTCH_R;
  return Math.max(rect, -notchTop, -notchBot);
}

function insideNotch(x: number, y: number) {
  const sepX = CFG.VB_W - CFG.STUB_W;
  return (
    Math.hypot(x - sepX, y) < CFG.NOTCH_R ||
    Math.hypot(x - sepX, y - CFG.VB_H) < CFG.NOTCH_R
  );
}

function cornerDistance(x: number, y: number) {
  const { VB_W, VB_H } = CFG;
  return Math.min(
    Math.hypot(x, y),
    Math.hypot(x - VB_W, y),
    Math.hypot(x, y - VB_H),
    Math.hypot(x - VB_W, y - VB_H),
  );
}

function quietWeight(x: number, y: number) {
  // Elipse detrás de "10% OFF" — reduce densidad
  const cx = 260, cy = 250, rx = 220, ry = 130;
  const dx = (x - cx) / rx, dy = (y - cy) / ry;
  const d = Math.hypot(dx, dy);
  return 1 - smoothstep(0, 1, d);
}

// ═════════════════════════════════════════════════════════════════════════════
// Generación de la matriz de puntos (top-level → una sola vez, SSR/CSR estable)
// ═════════════════════════════════════════════════════════════════════════════
export type Dot = { x: number; y: number; r: number; f: string; o: number };

export const { MAIN, MICRO, SCATTER, SHADOW } = (() => {
  const rand = seededRand(1337);
  const { VB_W, VB_H, GRID_STEP, JITTER, STUB_W } = CFG;
  const sepX = VB_W - STUB_W;

  const MAIN: Dot[] = [];
  const MICRO: Dot[] = [];
  const SCATTER: Dot[] = [];
  const SHADOW: Dot[] = [];

  const MINX = -160, MAXX = VB_W + 160;
  const MINY = -130, MAXY = VB_H + 130;
  const jit = () => (rand() - 0.5) * 2 * JITTER;

  // ── Pasada principal ───────────────────────────────────────────────────
  for (let gx = MINX; gx <= MAXX; gx += GRID_STEP) {
    for (let gy = MINY; gy <= MAXY; gy += GRID_STEP) {
      const x = gx + jit();
      const y = gy + jit();

      if (insideNotch(x, y)) continue;

      const d = sdCoupon(x, y);

      let rMin: number, rMax: number, oMin: number, oMax: number;
      let skipProb: number;
      let color = CFG.DOT_INNER;

      if (d < -80) {
        rMin = 2.5; rMax = 4.5; oMin = 0.75; oMax = 0.95; skipProb = 0.10;
      } else if (d < -20) {
        rMin = 2.2; rMax = 3.8; oMin = 0.60; oMax = 0.85; skipProb = 0.15;
      } else if (d < 0) {
        rMin = 2.0; rMax = 3.2; oMin = 0.55; oMax = 0.80; skipProb = 0.22;
      } else if (d < 18) {
        rMin = 1.6; rMax = 2.6; oMin = 0.35; oMax = 0.65; skipProb = 0.35;
        color = CFG.DOT_EDGE;
      } else if (d < 60) {
        rMin = 1.2; rMax = 2.0; oMin = 0.18; oMax = 0.40; skipProb = 0.60;
        color = CFG.DOT_FRINGE;
      } else if (d < 130) {
        rMin = 0.8; rMax = 1.5; oMin = 0.10; oMax = 0.25; skipProb = 0.85;
        color = CFG.DOT_FRINGE;
      } else {
        rMin = 0.6; rMax = 1.2; oMin = 0.08; oMax = 0.18; skipProb = 0.96;
        color = CFG.DOT_FRINGE;
      }

      // Talonera: cambio de color y densidad
      const inStub = d < 0 && x > sepX;
      if (inStub) {
        color = CFG.STUB_BG;
        skipProb = Math.max(0, skipProb - 0.10);
        if (rand() < 0.12) color = CFG.DOT_STUB_HL;
      }

      // Borde terracota fragmentado (banda superior de la zona principal)
      if (d < 0 && y < 22 && y > -4 && x < sepX) {
        if (rand() < 0.55) color = CFG.ACCENT;
        skipProb += 0.30;
        rMin *= 1.1; rMax *= 1.1;
      }

      // Quiet zone alrededor de "10% OFF"
      if (d < 0) {
        const q = quietWeight(x, y);
        rMin *= (1 - 0.5 * q); rMax *= (1 - 0.5 * q);
        oMin *= (1 - 0.55 * q); oMax *= (1 - 0.55 * q);
        skipProb += 0.35 * q;
      }

      // Volumen: luz desde arriba-derecha
      if (d < 0) {
        const light = clamp((x - y * 0.4) / VB_W, 0, 1);
        if (light > 0.6) {
          oMin *= 0.85; oMax *= 0.85;
          rMin *= 0.9;  rMax *= 0.9;
        } else if (light < 0.4) {
          oMin *= 1.15; oMax *= 1.15;
          rMin *= 1.05; rMax *= 1.05;
        }
      }

      // Disolución en esquinas y borde derecho
      if (d < 40 && d > -80) {
        const cd = cornerDistance(x, y);
        if (cd < 60) skipProb += 0.25 * (1 - cd / 60);
        const rightBias = smoothstep(0.75, 1.0, x / VB_W);
        skipProb += 0.35 * rightBias;
        rMin *= (1 - 0.25 * rightBias);
        rMax *= (1 - 0.25 * rightBias);
      }

      if (rand() < skipProb) continue;

      MAIN.push({
        x, y,
        r: lerp(rMin, rMax, rand()),
        f: color,
        o: clamp(lerp(oMin, oMax, rand()), 0, 1),
      });
    }
  }

  // ── Segunda pasada: micro-puntos (textura fina en bandas cercanas) ─────
  const mstep = GRID_STEP / 2;
  for (let gx = MINX; gx <= MAXX; gx += mstep) {
    for (let gy = MINY; gy <= MAXY; gy += mstep) {
      const x = gx + (rand() - 0.5) * 3;
      const y = gy + (rand() - 0.5) * 3;
      if (insideNotch(x, y)) continue;
      const d = sdCoupon(x, y);
      if (d > 30) continue;
      if (rand() < 0.62) continue;

      let color = CFG.DOT_MICRO;
      if (d < 0 && x > sepX) color = CFG.DOT_STUB_HL;

      let oMul = 1;
      if (d < 0) oMul *= (1 - 0.6 * quietWeight(x, y));

      // right dissolve también aplica a micros
      if (d > -60) {
        const rightBias = smoothstep(0.75, 1.0, x / VB_W);
        if (rand() < 0.4 * rightBias) continue;
      }

      MICRO.push({
        x, y,
        r: lerp(0.6, 1.4, rand()),
        f: color,
        o: clamp(lerp(0.20, 0.45, rand()) * oMul, 0, 1),
      });
    }
  }

  // ── SCATTER: pixels sueltos alrededor ──────────────────────────────────
  // Estela hacia la derecha (main trail)
  for (let i = 0; i < 42; i++) {
    const dd = rand() * 280;
    SCATTER.push({
      x: VB_W + 20 + dd,
      y: rand() * VB_H,
      r: lerp(1.0, 2.5, rand()),
      f: CFG.DOT_FRINGE,
      o: Math.max(0.10, 0.52 - (dd / 280) * 0.38),
    });
  }
  // Arriba/abajo dispersos
  for (let i = 0; i < 34; i++) {
    const isTop = rand() > 0.5;
    SCATTER.push({
      x: rand() * VB_W,
      y: isTop ? -30 + rand() * 25 : VB_H + 8 + rand() * 30,
      r: lerp(1.0, 2.2, rand()),
      f: CFG.DOT_FRINGE,
      o: 0.18 + rand() * 0.28,
    });
  }
  // Izquierda (sutil)
  for (let i = 0; i < 16; i++) {
    SCATTER.push({
      x: -30 + rand() * 32,
      y: rand() * VB_H,
      r: lerp(1.0, 2.0, rand()),
      f: CFG.DOT_FRINGE,
      o: 0.15 + rand() * 0.22,
    });
  }

  // ── SHADOW: sombra pixelada bajo el cupón (dispersa, no box-shadow) ───
  for (let i = 0; i < 60; i++) {
    const t = rand();
    const yOff = 14 + t * 110;
    SHADOW.push({
      x: 40 + rand() * (VB_W - 80),
      y: VB_H + yOff,
      r: lerp(1.4, 3.0, rand() * (1 - t * 0.5)),
      f: CFG.DOT_SHADOW,
      o: clamp((0.38 - t * 0.30) * (0.7 + rand() * 0.3), 0, 1),
    });
  }

  return { MAIN, MICRO, SCATTER, SHADOW };
})();

// ═════════════════════════════════════════════════════════════════════════════
// Path del cupón (para clipPath y placa de contraste)
// ═════════════════════════════════════════════════════════════════════════════
export function couponPath() {
  const { VB_W: W, VB_H: H, STUB_W, CORNER_R: R, NOTCH_R: NR } = CFG;
  const sepX = W - STUB_W;
  return [
    `M ${R} 0`,
    `L ${sepX - NR} 0`,
    `A ${NR} ${NR} 0 0 1 ${sepX + NR} 0`,
    `L ${W - R} 0`,
    `A ${R} ${R} 0 0 1 ${W} ${R}`,
    `L ${W} ${H - R}`,
    `A ${R} ${R} 0 0 1 ${W - R} ${H}`,
    `L ${sepX + NR} ${H}`,
    `A ${NR} ${NR} 0 0 1 ${sepX - NR} ${H}`,
    `L ${R} ${H}`,
    `A ${R} ${R} 0 0 1 0 ${H - R}`,
    `L 0 ${R}`,
    `A ${R} ${R} 0 0 1 ${R} 0`,
    `Z`,
  ].join(" ");
}

// ═════════════════════════════════════════════════════════════════════════════
// Serialización a SVG (la usa el script de generación)
// ═════════════════════════════════════════════════════════════════════════════

/** Extensión alrededor del cupón para halo, scatter y sombra (unidades del viewBox). */
export const EXT_X = 160;
export const EXT_Y = 130;

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Círculos agrupados por color y opacidad: el fill y el opacity van una vez en
 * el <g> y no en cada círculo, que es lo que más pesa. Reordenar puntos del
 * mismo color no cambia el resultado (la mezcla alfa de un mismo color es
 * conmutativa) y los de distinto color apenas se solapan.
 */
function circles(dots: Dot[]): string {
  const groups = new Map<string, Dot[]>();
  for (const d of dots) {
    const key = `${d.f}|${r2(d.o)}`;
    const list = groups.get(key);
    if (list) list.push(d);
    else groups.set(key, [d]);
  }
  let out = "";
  for (const [key, list] of groups) {
    const [fill, opacity] = key.split("|");
    out += `<g fill="${fill}" opacity="${opacity}">`;
    for (const d of list) {
      out += `<circle cx="${r1(d.x)}" cy="${r1(d.y)}" r="${r2(d.r)}"/>`;
    }
    out += "</g>";
  }
  return out;
}

function svg(body: string): string {
  const w = CFG.VB_W + EXT_X * 2;
  const h = CFG.VB_H + EXT_Y * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-EXT_X} ${-EXT_Y} ${w} ${h}">` +
    body +
    "</svg>\n"
  );
}

/** Capa z:1 — placas de contraste, sombra pixelada, matriz principal y micro. */
export function couponDotsSvg(): string {
  const { VB_W: W, VB_H: H, STUB_W, CARD_BG, STUB_BG } = CFG;
  const plates =
    `<defs><clipPath id="s"><path d="${couponPath()}"/></clipPath></defs>` +
    `<g clip-path="url(#s)">` +
    `<rect width="${W - STUB_W}" height="${H}" fill="${CARD_BG}" opacity="0.15"/>` +
    `<rect x="${W - STUB_W}" width="${STUB_W}" height="${H}" fill="${STUB_BG}" opacity="0.22"/>` +
    `</g>`;
  return svg(plates + circles(SHADOW) + circles(MAIN) + circles(MICRO));
}

/** Capa z:4 — píxeles sueltos alrededor, por encima del texto. */
export function couponScatterSvg(): string {
  return svg(circles(SCATTER));
}
