import type { Metadata } from "next";

// Formularios de cuenta: no aportan nada al índice. Se excluyen con noindex y
// NO con Disallow en robots.txt: si el crawler no puede entrar tampoco ve el
// noindex, y una URL bloqueada pero enlazada puede acabar indexada sin
// contenido.
export const metadata: Metadata = {
  title: "Tu cuenta | MisReferidos",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
