import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getBrandSlugOfReferral } from "@/lib/queries";

/**
 * El detalle dejó de ser una página: ahora vive en un modal dentro de la ficha
 * de marca. Esta ruta se conserva como redirección para que los enlaces ya
 * compartidos sigan llevando al mismo sitio en vez de dar 404.
 *
 * El destino lleva ?oferta=<id>, que la página de marca resuelve en el servidor
 * y monta con el modal abierto.
 *
 * OJO: en producción esto NO es un 307. La respuesta sale como 200 con el shell
 * prerenderizado (`x-nextjs-postponed: 1`) y la orden de redirección viaja en el
 * payload, así que la sigue un navegador pero no un crawler ni un fetcher de
 * previews. Es la misma limitación de Cache Components que impide el 404 real
 * en /marca/[slug]. En la práctica da igual: estas URLs siempre estuvieron tras
 * el login, así que nunca hubo nada indexado que preservar. Si algún día
 * importa, la salida es redirigir desde el middleware.
 */
// El tipo de retorno es explícito porque redirect() devuelve `never` y sin la
// anotación TS infiere Promise<never>, que no vale como componente JSX.
async function Redirector({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<null> {
  const { id } = await params;

  const brandSlug = await getBrandSlugOfReferral(id);
  if (!brandSlug) notFound();

  redirect(`/marca/${brandSlug}?oferta=${id}`);
}

export default function ReferidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // El Suspense es obligatorio, no decorativo: con Cache Components, leer
  // `params` fuera de un boundary rompe el build ("Uncached data was accessed
  // outside of <Suspense>"). Las demás rutas lo obtienen de su loading.tsx;
  // aquí no hay ninguno porque no hay UI que enseñar.
  //
  // fallback={null} a propósito: pintar un skeleton para algo que solo redirige
  // sería un parpadeo gratis.
  return (
    <Suspense fallback={null}>
      <Redirector params={params} />
    </Suspense>
  );
}
