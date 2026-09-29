import { PublicShell } from "@/components/public-shell";

/**
 * Plantilla de las páginas legales: columna de lectura estrecha y tipografía
 * de texto largo. Los estilos van en los selectores hijos para escribir el
 * contenido como HTML semántico plano (h2, p, ul) sin clases en cada etiqueta.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <PublicShell className="max-w-3xl">
      <article
        className={[
          "space-y-4 text-[15px] leading-relaxed text-slate-700",
          "[&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink",
          "[&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-ink",
          "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
          "[&_a]:font-medium [&_a]:text-olive-700 [&_a]:underline-offset-2 hover:[&_a]:underline",
          "[&_strong]:text-ink",
        ].join(" ")}
      >
        <header className="space-y-2 border-b border-line pb-6">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          <p className="text-sm text-slate-500">Última actualización: {updated}</p>
        </header>
        {children}
      </article>
    </PublicShell>
  );
}

