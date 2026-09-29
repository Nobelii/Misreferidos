"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronDown,
  Menu,
  X,
  LogOut,
  User,
  Compass,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";

// El modal (formularios + validación) se descarga solo al abrirse, no en el
// bundle inicial de cada página.
const AuthModal = dynamic(
  () => import("@/components/auth-modal").then((m) => m.AuthModal),
  { ssr: false },
);

type AuthTab = "login" | "signup";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<AuthTab>("login");
  const { user } = useAuth();
  const router = useRouter();

  const userEmail = user?.email ?? null;
  const isAuthenticated = !!userEmail;
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "";

  // Solo decide si se enseña el enlace. Quien entre a /app/moderacion sin ser
  // staff recibe un 404, y las policies de la base rechazarían sus acciones
  // igualmente: esto es cosmética, no seguridad.
  const [isStaff, setIsStaff] = useState(false);
  useEffect(() => {
    if (!isAuthenticated) {
      setIsStaff(false);
      return;
    }
    let cancelled = false;
    createClient()
      .rpc("is_staff")
      .then(({ data }) => {
        if (!cancelled) setIsStaff(data === true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  };

  const openModal = (tab: AuthTab) => {
    setModalTab(tab);
    setModalOpen(true);
    setMobileOpen(false);
  };

  return (
    <>
      <header className="font-nav sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md border-b border-line/60 shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">

            {/* ── Izquierda: Logo + Buscador (buscador extendido) ── */}
            <div className="flex flex-1 items-center gap-3 lg:gap-4 min-w-0">
              {/* Logo */}
              <Link href="/" className="shrink-0 flex items-center group">
                <Image
                  src="/logomisreferidos.png"
                  alt="MisReferidos.com"
                  width={884}
                  height={149}
                  priority
                  className="h-7 object-contain"
            style={{ width: "auto" }}
                />
              </Link>

              {/* Buscador (se extiende) */}
              <div className="hidden md:flex flex-1 max-w-2xl">
                <label className="w-full flex items-center gap-2.5 px-4 py-2 bg-paper/70 border border-line rounded-full text-slate-400 cursor-text hover:border-olive-300 transition-colors focus-within:ring-2 focus-within:ring-olive-400/40 focus-within:border-olive-400">
                  <Search className="w-4 h-4 shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar referidos..."
                    className="flex-1 bg-transparent outline-hidden text-sm text-slate-700 placeholder:text-slate-400"
                  />
                </label>
              </div>
            </div>

            {/* ── Derecha (grupo pegado a la derecha) ── */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              {/* Explorar (junto a Publicar) */}
              <Link href="/app/explorar" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap">
                <Compass className="w-4 h-4" />
                Explorar
              </Link>

              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => openModal("signup")}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Publicar
                  </button>

                  <button
                    onClick={() => openModal("login")}
                    className="hidden sm:block px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    Iniciar sesión
                  </button>

                  <button
                    onClick={() => openModal("signup")}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
                  >
                    Registrarse
                  </button>
                </>
              ) : (
                /* Autenticado - Acciones + Avatar */
                <>
                  <Link
                    href="/app/publicar"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Publicar
                  </Link>

                  <Link
                    href="/app/perfil"
                    className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-full transition-colors shadow-xs"
                  >
                    <User className="w-4 h-4" />
                    Mi perfil
                  </Link>

                  <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-olive-600 text-white text-xs font-semibold">
                      {initials}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-xs border border-slate-300/50 rounded-lg shadow-lg py-1 text-sm">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                      </div>
                      <Link href="/app/perfil" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        Mi perfil
                      </Link>
                      <Link href="/app/dashboard" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        Dashboard
                      </Link>
                      <Link href="/app/publicar" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        Publicar referido
                      </Link>
                      {isStaff && (
                        <Link href="/app/moderacion" className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                          <ShieldCheck className="w-4 h-4" />
                          Moderación
                        </Link>
                      )}
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
                          <LogOut className="w-4 h-4" />
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                </>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile: Buscador + menú */}
          {mobileOpen && (
            <>
              <div className="pb-3">
                <label className="flex items-center gap-2.5 px-3 py-2 bg-paper/70 border border-line rounded-lg text-slate-400 cursor-text focus-within:ring-2 focus-within:ring-olive-400/40">
                  <Search className="w-4 h-4 shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="flex-1 bg-transparent outline-hidden text-sm text-slate-700 placeholder:text-slate-400"
                  />
                </label>
              </div>

              <div className="border-t border-slate-100 py-3 space-y-1">
                {!isAuthenticated ? (
                  <>
                    <Link href="/app/explorar" className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md">
                      Explorar
                    </Link>
                    <Link href="/app/publicar" className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Publicar
                    </Link>
                    <div className="border-t border-slate-100 mt-2 pt-2 flex gap-2">
                      <button
                        onClick={() => openModal("login")}
                        className="flex-1 px-3 py-2 text-sm text-center text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100"
                      >
                        Iniciar sesión
                      </button>
                      <button
                        onClick={() => openModal("signup")}
                        className="flex-1 px-3 py-2 text-sm text-center text-white bg-slate-900 rounded-md hover:bg-slate-800"
                      >
                        Registrarse
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link href="/app/perfil" className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md">
                      Mi perfil
                    </Link>
                    <Link href="/app/dashboard" className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md">
                      Dashboard
                    </Link>
                    <Link href="/app/publicar" className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Publicar referido
                    </Link>
                    {isStaff && (
                      <Link href="/app/moderacion" className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Moderación
                      </Link>
                    )}
                    <div className="border-t border-slate-100 mt-2 pt-2">
                      <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-md flex items-center gap-2">
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Overlay para cerrar menús del navbar */}
      {(mobileOpen || userMenuOpen) && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => {
            setMobileOpen(false);
            setUserMenuOpen(false);
          }}
        />
      )}

      {/* Modal de autenticación (se carga al abrir) */}
      {modalOpen && (
        <AuthModal
          isOpen={modalOpen}
          defaultTab={modalTab}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
