import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublishCta } from "@/components/publish-cta";
import { TypewriterText } from "@/components/typewriter-text";
import { CFG, EXT_X, EXT_Y } from "@/lib/hero-coupon-art";

// ═════════════════════════════════════════════════════════════════════════════
// CouponVisual
// ═════════════════════════════════════════════════════════════════════════════
function CouponVisual() {
  const { VB_W: W, VB_H: H, STUB_W } = CFG;

  // Extensión externa (para halo, scatter y sombra)
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

      {/* z:1 — Matriz principal + placas de contraste. Es un SVG estático
          (public/hero, generado desde lib/hero-coupon-art.ts): inline eran
          miles de <circle> en el HTML y en el payload RSC de la home. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG vectorial:
          next/image no lo optimiza y solo añadiría un wrapper. */}
      <img
        src="/hero/coupon-dots.svg"
        alt=""
        aria-hidden
        decoding="async"
        fetchPriority="low"
        style={{ ...outerSvgStyle, zIndex: 1 }}
      />

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

      {/* z:4 — SCATTER: pixels sueltos alrededor, por encima del texto */}
      {/* eslint-disable-next-line @next/next/no-img-element -- ver z:1 */}
      <img
        src="/hero/coupon-scatter.svg"
        alt=""
        aria-hidden
        decoding="async"
        fetchPriority="low"
        style={{ ...outerSvgStyle, zIndex: 4 }}
      />
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

            {/* Siempre 3 líneas; la tercera no se parte aunque cambie la palabra */}
            <h1 className="font-display text-[clamp(1.75rem,8.5vw,3rem)] font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl sm:leading-[1.05] lg:text-[clamp(2.5rem,3.9vw,3.25rem)]">
              <span className="block">Comparte,</span>
              <span className="block">descubre y gana</span>
              <span className="block whitespace-nowrap">
                con cada{" "}
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
                <Link href="/explorar">
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
