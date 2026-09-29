import type { Metadata } from "next";

// /app es lo único privado del sitio (publicar, dashboard, perfil,
// moderación): el proxy manda a login sin sesión. Se marca noindex además del
// Disallow de robots.txt por si alguna URL llega al índice por un enlace
// externo.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
