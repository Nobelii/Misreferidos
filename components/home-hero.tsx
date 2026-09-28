import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublishCta } from "@/components/publish-cta";
import { TypewriterText } from "@/components/typewriter-text";

// ═════════════════════════════════════════════════════════════════════════════
// CFG — ajusta aquí para tunear tamaño, densidad, colores y proporción
// ═════════════════════════════════════════════════════════════════════════════
const CFG = {
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
type Dot = { x: number; y: number; r: number; f: string; o: number };

const { MAIN, MICRO, SCATTER, SHADOW } = (() => {
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
function couponPath() {
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
// CouponVisual
// ═════════════════════════════════════════════════════════════════════════════
function CouponVisual() {
  const { VB_W: W, VB_H: H, STUB_W, CARD_BG, STUB_BG } = CFG;
  const path = couponPath();

  // Extensión externa (para halo, scatter y sombra)
  const EXT_X = 160;
  const EXT_Y = 130;
  const OUTER_W = W + EXT_X * 2;
  const OUTER_H = H + EXT_Y * 2;

  const outerSvgStyle = {
    position: "absolute" as const,
    top: `${(-EXT_Y / H) * 100}%`,
    left: `${(-EXT_X / W) * 100}%`,
    width: `${(OUTER_W / W) * 100}%`,
    height: `${(OUTER_H / H) * 100}%`,
    pointerEvents: "none" as const,
  };

  return (
    <div
      className="animate-coupon"
      style={{
        position: "relative",
        display: "inline-block",
        width: "min(1000px, 96vw)",
        aspectRatio: `${W} / ${H}`,
      }}
    >
      {/* z:0 — halo pixelado difuso detrás */}
      <svg
        aria-hidden
        viewBox={`${-EXT_X} ${-EXT_Y} ${OUTER_W} ${OUTER_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ ...outerSvgStyle, zIndex: 0 }}
      >
        <defs>
          <pattern id="halo-dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.8" fill={CFG.DOT_FRINGE} />
          </pattern>
          <radialGradient id="halo-fade" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="55%" stopColor="white" stopOpacity="0.16" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="halo-mask">
            <rect x={-EXT_X} y={-EXT_Y} width={OUTER_W} height={OUTER_H} fill="url(#halo-fade)" />
          </mask>
        </defs>
        <rect
          x={-EXT_X}
          y={-EXT_Y}
          width={OUTER_W}
          height={OUTER_H}
          fill="url(#halo-dots)"
          mask="url(#halo-mask)"
          opacity="0.28"
        />
      </svg>

      {/* z:1 — Matriz principal + placas de contraste */}
      <svg
        aria-hidden
        viewBox={`${-EXT_X} ${-EXT_Y} ${OUTER_W} ${OUTER_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ ...outerSvgStyle, zIndex: 1 }}
      >
        <defs>
          <clipPath id="coupon-silhouette">
            <path d={path} />
          </clipPath>
        </defs>

        {/* Placa de contraste — zona principal (bone tenue) */}
        <rect
          x={0}
          y={0}
          width={W - STUB_W}
          height={H}
          fill={CARD_BG}
          opacity="0.15"
          clipPath="url(#coupon-silhouette)"
        />
        {/* Placa de contraste — talonera (ink tenue) */}
        <rect
          x={W - STUB_W}
          y={0}
          width={STUB_W}
          height={H}
          fill={STUB_BG}
          opacity="0.22"
          clipPath="url(#coupon-silhouette)"
        />

        {/* Sombra pixelada bajo el cupón */}
        {SHADOW.map((p, i) => (
          <circle key={`sh-${i}`} cx={p.x} cy={p.y} r={p.r} fill={p.f} opacity={p.o} />
        ))}

        {/* Matriz principal */}
        {MAIN.map((p, i) => (
          <circle key={`m-${i}`} cx={p.x} cy={p.y} r={p.r} fill={p.f} opacity={p.o} />
        ))}

        {/* Segunda pasada micro */}
        {MICRO.map((p, i) => (
          <circle key={`u-${i}`} cx={p.x} cy={p.y} r={p.r} fill={p.f} opacity={p.o} />
        ))}
      </svg>

      {/* z:2 — Texto HTML sobre la matriz */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          pointerEvents: "none",
        }}
      >
        {/* Zona principal */}
        <div
          style={{
            flex: 1,
            padding: "clamp(1.4rem, 3.2vw, 2.8rem)",
            paddingRight: "clamp(1rem, 2vw, 1.6rem)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-space-grotesk, 'Space Grotesk', sans-serif)",
              fontSize: "clamp(0.7rem, 1.1vw, 0.95rem)",
              textTransform: "uppercase",
              letterSpacing: "0.24em",
              color: "#4C5636",
              fontWeight: 700,
              textShadow: "0 1px 0 rgba(238,241,228,0.85), 0 0 8px rgba(238,241,228,0.6)",
            }}
          >
            Cupón de referido
          </span>

          <div>
            <p
              style={{
                fontFamily: "var(--font-newsreader, 'Newsreader', Georgia, serif)",
                fontSize: "clamp(3rem, 8.5vw, 6.8rem)",
                lineHeight: 0.92,
                fontWeight: 500,
                color: "#1B1A17",
                letterSpacing: "-0.015em",
                textShadow:
                  "0 1px 0 rgba(238,241,228,0.95), 0 0 20px rgba(238,241,228,0.9), 0 0 40px rgba(238,241,228,0.55)",
              }}
            >
              10% OFF
            </p>
            <p
              style={{
                fontSize: "clamp(0.9rem, 1.4vw, 1.15rem)",
                color: "#4C5636",
                marginTop: "0.55rem",
                fontWeight: 600,
                textShadow: "0 1px 0 rgba(238,241,228,0.9), 0 0 10px rgba(238,241,228,0.65)",
              }}
            >
              Descuento para nuevos usuarios
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <code
              style={{
                fontFamily: "ui-monospace, 'Fira Code', monospace",
                fontSize: "clamp(0.9rem, 1.4vw, 1.2rem)",
                fontWeight: 700,
                letterSpacing: "0.16em",
                padding: "clamp(0.4rem, 0.75vw, 0.6rem) clamp(0.85rem, 1.5vw, 1.15rem)",
                borderRadius: "0.45rem",
                background: "rgba(76,86,54,0.22)",
                color: "#2E3421",
                boxShadow: "inset 0 0 0 1px rgba(76,86,54,0.32)",
                backdropFilter: "blur(2px)",
              }}
            >
              REFERIDO10
            </code>
          </div>
        </div>

        {/* Zona talonera (solo texto vertical) */}
        <div
          style={{
            width: `${(STUB_W / W) * 100}%`,
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-space-grotesk, 'Space Grotesk', sans-serif)",
                fontSize: "clamp(0.7rem, 1.1vw, 0.95rem)",
                textTransform: "uppercase",
                letterSpacing: "0.32em",
                color: "#F5F1E8",
                transform: "rotate(90deg)",
                whiteSpace: "nowrap",
                fontWeight: 700,
                textShadow: "0 1px 0 rgba(27,26,23,0.9), 0 0 10px rgba(27,26,23,0.6)",
              }}
            >
              Válido 30 días
            </span>
          </div>
        </div>
      </div>

      {/* z:3 — Separador punteado (detalle "perforado") */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${((W - STUB_W) / W) * 100}%`,
          zIndex: 3,
          width: 0,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "clamp(20px, 2.4vw, 30px)",
            bottom: "clamp(20px, 2.4vw, 30px)",
            left: -1,
            width: 2,
            backgroundImage: "linear-gradient(to bottom, rgba(27,26,23,0.32) 50%, transparent 50%)",
            backgroundSize: "2px 12px",
            opacity: 0.7,
          }}
        />
      </div>

      {/* z:4 — SCATTER: pixels sueltos alrededor */}
      <svg
        aria-hidden
        viewBox={`${-EXT_X} ${-EXT_Y} ${OUTER_W} ${OUTER_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ ...outerSvgStyle, zIndex: 4 }}
      >
        {SCATTER.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.f} opacity={p.o} />
        ))}
      </svg>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// HomeHero
// ═════════════════════════════════════════════════════════════════════════════
export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden py-14 lg:py-24 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center">

          {/* Columna izquierda */}
          <div className="flex flex-col gap-6 items-center text-center lg:items-start lg:text-left lg:w-[45%] lg:pr-8 relative z-10">
            <span className="font-nav inline-flex items-center gap-2 rounded-full border border-olive-200 bg-olive-50 px-3.5 py-1 text-xs font-medium uppercase tracking-[0.14em] text-olive-700">
              <span className="h-1.5 w-1.5 rounded-full bg-olive-500" />
              Beneficios de la comunidad
            </span>

            <h1 className="font-display text-[2rem] font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl sm:leading-[1.05] lg:text-6xl">
              Comparte, descubre y gana con cada{" "}
              <span className="block sm:inline">
                <TypewriterText
                  words={["referido", "descuento", "beneficio", "premio"]}
                  className="italic text-olive-700"
                />
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Publica tus códigos de referido, encuentra beneficios verificados y gana
              recompensas cuando la comunidad los usa. 100% gratis.
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row lg:items-start">
              <PublishCta className="h-11 text-base" />
              <Button asChild size="lg" variant="outline" className="h-11 gap-2 text-base">
                <Link href="/app/explorar">
                  <Compass className="h-5 w-5" />
                  Explorar beneficios
                </Link>
              </Button>
            </div>
          </div>

          {/* Columna derecha: cupón */}
          <div className="relative mt-16 lg:mt-0 lg:flex-1 flex justify-center lg:justify-end">
            <div
              className="relative"
              style={{ transform: "translateX(clamp(1rem, 16vw, 18rem))" }}
            >
              <CouponVisual />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
