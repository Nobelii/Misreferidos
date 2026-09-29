import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: "Términos de uso | MisReferidos",
  description:
    "Las reglas para usar MisReferidos: qué puedes publicar, cómo moderamos y qué responsabilidad asumimos sobre los códigos compartidos.",
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <LegalPage title="Términos de uso" updated="29 de septiembre de 2026">
      <p>
        Al usar {siteName} aceptas estos términos. Son cortos a propósito: el sitio
        funciona porque la comunidad comparte códigos útiles y honestos, y estas
        reglas existen para protegerlo.
      </p>

      <h2>Qué es {siteName}</h2>
      <p>
        Un espacio comunitario donde las personas comparten sus códigos de referido,
        descuentos, meses gratis y otros beneficios de marcas y servicios.{" "}
        <strong>
          No somos una plataforma de afiliados, no cobramos comisiones y no tenemos
          relación con las marcas
        </strong>{" "}
        salvo que lo indiquemos expresamente. Los nombres y logotipos de las marcas
        pertenecen a sus dueños y se usan solo para identificarlas.
      </p>

      <h2>Tu cuenta</h2>
      <ul>
        <li>Puedes explorar sin cuenta; para publicar necesitas una.</li>
        <li>
          Eres responsable de lo que se publique desde tu cuenta y de mantener tu
          contraseña segura.
        </li>
        <li>Una persona, una cuenta. No suplantes a otras personas ni a marcas.</li>
      </ul>

      <h2>Qué puedes publicar</h2>
      <p>Al publicar un código o una marca te comprometes a que:</p>
      <ul>
        <li>Es tuyo o tienes derecho a compartirlo, y funciona hasta donde sabes.</li>
        <li>
          La descripción, el valor y las condiciones son reales y no engañan sobre
          lo que se obtiene.
        </li>
        <li>
          No compartes códigos privados, internos, robados o que el programa de la
          marca prohíba difundir.
        </li>
        <li>No es spam, publicidad encubierta, contenido ilegal u ofensivo.</li>
        <li>No publicas duplicados para ganar visibilidad.</li>
      </ul>
      <p>
        Lo que publicas es visible para todo el mundo y puede aparecer en buscadores.
        Nos das permiso para mostrarlo, reordenarlo y destacarlo dentro del sitio
        mientras siga publicado.
      </p>

      <h2>Moderación</h2>
      <p>
        Lo que se publica aparece al instante, sin revisión previa. Cualquiera puede
        reportar un código que no funciona, ha vencido o incumple estas reglas, y
        nuestro equipo revisa los reportes. Podemos retirar contenido, quitar
        verificaciones o suspender cuentas que incumplan estos términos. Para
        evitar abusos aplicamos límites de frecuencia a publicaciones y reportes.
      </p>

      <h2>Sin garantías sobre los códigos</h2>
      <p>
        Los códigos los comparten personas de la comunidad. Mostramos señales para
        ayudarte a decidir (usos, votos, verificación, fecha de vencimiento), pero{" "}
        <strong>no garantizamos que un código funcione, siga vigente o cumpla lo
        que promete</strong>. Las condiciones finales las fija cada marca. Revísalas
        antes de contratar o comprar.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        En la medida en que la ley lo permita, {siteName} no es responsable de los
        daños derivados de usar códigos publicados por terceros, de las decisiones
        de las marcas sobre sus programas ni de interrupciones del servicio. Nada de
        esto limita los derechos que te reconozca la normativa de consumo aplicable.
      </p>

      <h2>Cambios y contacto</h2>
      <p>
        Podemos actualizar estos términos; si el cambio es relevante lo avisaremos en
        el sitio antes de que tenga efecto. Para cualquier duda o aviso legal,
        escríbenos a través de nuestros canales de contacto. El tratamiento de tus datos se explica en la{" "}
        <Link href="/privacidad">política de privacidad</Link>.
      </p>
    </LegalPage>
  );
}
