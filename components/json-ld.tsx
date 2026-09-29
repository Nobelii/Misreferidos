import { serializeJsonLd } from "@/lib/seo";

/** Bloque JSON-LD. Server Component: no añade nada al bundle del cliente. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
