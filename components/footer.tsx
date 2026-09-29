import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/70 bg-background mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">

          {/* Bloque 1: Logo + frase */}
          <div className="space-y-3">
            <Image
              src="/logomisreferidos.png"
              alt="MisReferidos.com"
              width={884}
              height={149}
              className="h-7 object-contain"
            style={{ width: "auto" }}
            />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Referidos y beneficios en un solo lugar.
            </p>
          </div>

          {/* Bloque 2: Navegación */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Explorar
            </h4>
            <ul className="space-y-2">
              {[
                { label: "Explorar marcas", href: "/explorar" },
                { label: "Publicar referido", href: "/app/publicar" },
                { label: "Dashboard", href: "/app/dashboard" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-slate-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Bloque 3: Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Legal
            </h4>
            <ul className="space-y-2">
              {[
                { label: "Privacidad", href: "/privacidad" },
                { label: "Términos de uso", href: "/terminos" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-slate-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Línea inferior */}
        <div className="border-t border-slate-200/70 mt-8 pt-6">
          <p className="text-xs text-muted-foreground">
            © 2025 MisReferidos. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
