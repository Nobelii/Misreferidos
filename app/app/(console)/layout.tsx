import { Suspense } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { getMyProfile, isStaff } from "@/lib/queries";

// Shell oscuro solo para el dashboard. La clase `dark` activa las variantes
// dark: únicamente en este subárbol (Tailwind darkMode: ["class"]); el resto
// de la app sigue clara.
export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark flex min-h-screen flex-col bg-slate-950 lg:flex-row">
      {/* La sidebar necesita perfil + rol (datos no cacheados). Va en su propio
          Suspense para no bloquear el render del shell — igual que la página,
          que se difiere con su loading.tsx. */}
      <Suspense fallback={<SidebarFallback />}>
        <SidebarData />
      </Suspense>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

async function SidebarData() {
  const [profile, staff] = await Promise.all([getMyProfile(), isStaff()]);

  // NO redirigimos si profile es null: el middleware es el único guardián de
  // auth para /app. getMyProfile usa getClaims() (verificación local), que
  // devuelve null cuando el access token está caducado aunque la sesión siga
  // siendo válida — redirigir aquí pateaba al login a usuarios ya logueados.
  // La sidebar tolera un perfil ausente.
  return (
    <DashboardSidebar
      displayName={profile?.display_name ?? "Tu cuenta"}
      username={profile?.username ?? ""}
      isStaff={staff}
    />
  );
}

// Marco vacío del mismo tamaño que la sidebar, para que no haya salto de layout
// mientras carga.
function SidebarFallback() {
  return (
    <>
      <div className="sticky top-0 z-30 h-[57px] border-b border-slate-800 bg-slate-950 lg:hidden" />
      <div className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-slate-800 bg-slate-950 lg:block" />
    </>
  );
}
