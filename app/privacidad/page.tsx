import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidad | MisReferidos",
  description:
    "Qué datos recoge MisReferidos, para qué los usa, con quién los comparte y cómo ejercer tus derechos.",
  alternates: { canonical: "/privacidad" },
};

// El contenido describe lo que la app hace de verdad (ver STRUCTURE.md y
// lib/actions.ts). Si cambia el tratamiento de datos —analítica, emails,
// nuevos proveedores— esta página tiene que cambiar con él.
export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad" updated="29 de septiembre de 2026">
      <p>
        En {siteName} compartimos códigos de referido y beneficios entre personas.
        Esta política explica qué datos tratamos cuando usas el sitio, para qué y
        qué control tienes sobre ellos. Intentamos recoger lo mínimo necesario.
      </p>

      <h2>Qué datos recogemos</h2>
      <h3>Si solo navegas</h3>
      <p>
        Puedes explorar marcas, códigos y perfiles sin crear una cuenta. Cuando ves,
        copias o abres un código registramos ese evento para mostrar cuánto se usa.
        Para no contar dos veces la misma visita guardamos un identificador
        derivado de tu dirección IP y tu navegador, <strong>transformado con una
        función hash irreversible</strong>: no almacenamos tu IP ni tu navegador en
        claro.
      </p>
      <h3>Si creas una cuenta</h3>
      <ul>
        <li>Tu email y tu contraseña (la contraseña se guarda cifrada; nunca la vemos).</li>
        <li>
          Los datos de perfil que decidas añadir: nombre de usuario, nombre visible,
          biografía, ubicación y foto.
        </li>
        <li>
          Lo que publicas: marcas, códigos, enlaces, condiciones y fechas de
          vencimiento.
        </li>
        <li>
          Tu actividad en el sitio: códigos guardados, votos de &quot;¿te sirvió?&quot;
          y reportes que envías.
        </li>
      </ul>

      <h2>Qué es público</h2>
      <p>
        Tu perfil (nombre de usuario, nombre visible, biografía, ubicación, foto y
        fecha de alta) y todo lo que publicas son públicos y pueden aparecer en
        buscadores. Tu email, tus guardados, tus votos individuales y tus reportes
        no son públicos.
      </p>

      <h2>Para qué usamos tus datos</h2>
      <ul>
        <li>Darte acceso a tu cuenta y mantener la sesión iniciada.</li>
        <li>Mostrar lo que publicas y atribuírtelo en tu perfil.</li>
        <li>
          Calcular métricas de uso (vistas, copias, clics) y señales de confianza
          (verificaciones, reportes).
        </li>
        <li>
          Proteger la comunidad: límites de frecuencia contra el spam y moderación
          de contenido reportado.
        </li>
      </ul>
      <p>
        No vendemos tus datos, no los usamos para publicidad personalizada y no
        cobramos comisiones por los códigos que se comparten.
      </p>

      <h2>Cookies</h2>
      <p>
        Usamos únicamente las cookies necesarias para mantener tu sesión iniciada.
        No usamos cookies de analítica ni de publicidad de terceros. Si en el futuro
        las usamos, lo indicaremos aquí y te pediremos consentimiento cuando la ley
        lo exija.
      </p>

      <h2>Con quién compartimos datos</h2>
      <p>
        Los datos se almacenan en <strong>Supabase</strong>, que nos presta la base
        de datos, la autenticación y el almacenamiento de imágenes, y el sitio se
        sirve desde nuestro proveedor de alojamiento web. Ambos tratan los datos
        solo por encargo nuestro. Fuera de eso, solo compartiríamos datos si una
        ley o una autoridad competente nos lo exigiera.
      </p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        Mientras tengas la cuenta activa. Si nos pides eliminarla, borramos tu
        perfil y lo que publicaste; pueden quedar registros técnicos anonimizados (por ejemplo,
        contadores de uso) que ya no te identifican.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes acceder a tus datos, corregirlos, pedir que los borremos, oponerte a
        un tratamiento o pedir una copia portable, según la normativa de protección
        de datos que te aplique (por ejemplo, el RGPD en la Unión Europea o la ley
        de tu país). Tus datos de perfil puedes corregirlos tú mismo desde{" "}
        <Link href="/app/perfil">tu cuenta</Link>; para lo demás, incluido borrar
        la cuenta, puedes ejercerlos a través de nuestros canales de contacto. También puedes reclamar ante la autoridad de protección de
        datos de tu país.
      </p>

      <h2>Menores</h2>
      <p>
        {siteName} no está dirigido a menores de 16 años. Si crees que un menor nos
        ha dado datos, contáctanos y los eliminaremos.
      </p>

      <h2>Cambios</h2>
      <p>
        Si cambiamos esta política de forma relevante, lo avisaremos en el sitio
        antes de que el cambio tenga efecto. Consulta también los{" "}
        <Link href="/terminos">términos de uso</Link>.
      </p>
    </LegalPage>
  );
}
