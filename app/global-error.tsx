"use client";

/**
 * Último recurso: se pinta cuando falla el propio layout raíz, así que
 * reemplaza el documento entero (de ahí el <html> y <body>) y no cuenta con
 * globals.css, las fuentes ni el ThemeProvider. Por eso los estilos van en
 * línea, con los colores de la marca a mano, y sin componentes del proyecto
 * que puedan ser justo lo que ha fallado.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f5f1e8",
          color: "#1b1a17",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          textAlign: "center",
        }}
      >
        <title>Algo falló | MisReferidos</title>
        <main style={{ maxWidth: 440 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "Georgia, serif",
              fontSize: 72,
              fontWeight: 600,
              lineHeight: 1,
              color: "#4c5636",
            }}
          >
            500
          </p>
          <h1 style={{ fontSize: 26, margin: "20px 0 8px", fontFamily: "Georgia, serif" }}>
            MisReferidos no está disponible ahora
          </h1>
          <p style={{ margin: 0, color: "#57534e", lineHeight: 1.6 }}>
            Algo falló de nuestro lado. Vuelve a intentarlo en unos segundos.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24 }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                background: "#1b1a17",
                color: "#f5f1e8",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
            {/* <a> y no <Link>: si el layout raíz falló, mejor una carga completa. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "1px solid #e6e0d3",
                color: "#1b1a17",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Ir al inicio
            </a>
          </div>
          {error.digest && (
            <p style={{ marginTop: 24, fontSize: 12, color: "#a8a29e" }}>
              Código de error: <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
