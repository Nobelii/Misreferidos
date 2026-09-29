"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Tab = "login" | "signup";

interface AuthModalProps {
  isOpen: boolean;
  defaultTab?: Tab;
  onClose: () => void;
}

const DURATION = 220;

export function AuthModal({ isOpen, defaultTab = "login", onClose }: AuthModalProps) {
  const [closing, setClosing] = useState(false);
  const [tab, setTab] = useState<Tab>(defaultTab);
  const router = useRouter();

  // Estado de los formularios (login / signup)
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setTab(defaultTab);
  }, [isOpen, defaultTab]);

  // Limpiar campos/estado al abrir o cambiar de pestaña
  useEffect(() => {
    setError(null);
    setInfo(null);
    setPassword("");
    setRepeatPassword("");
  }, [tab, isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      onClose();
      // El sitio es público: tras entrar se queda donde estaba; solo se refresca.
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    // Mismo formato que el CHECK username_format de la tabla profiles. Se valida
    // aquí para dar el error antes de crear la cuenta, no después.
    if (!/^[a-z0-9_.]{3,30}$/.test(username)) {
      setError("El usuario admite minúsculas, números, punto y guion bajo (3-30).");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      // handle_new_user() lee username y display_name de raw_user_meta_data al
      // crear el perfil. Si no se mandan, deriva el usuario del email.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
          data: {
            username,
            display_name: displayName.trim() || username,
          },
        },
      });
      if (error) throw error;

      // Si la confirmación de email está desactivada, ya hay sesión → entrar.
      if (data.session) {
        onClose();
        // El sitio es público: tras entrar se queda donde estaba; solo se refresca.
        router.refresh();
      } else {
        // Confirmación de email activada: avisar al usuario.
        setInfo("Cuenta creada. Revisa tu correo para confirmar tu cuenta.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  // Al reabrir hay que soltar el flag de cierre, o el panel entraría con la
  // animación de salida puesta.
  useEffect(() => {
    if (isOpen) setClosing(false);
  }, [isOpen]);

  // useCallback para que el efecto de Escape pueda depender de esta función sin
  // resuscribir el listener en cada render.
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, DURATION);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  // El overlay (fondo blur) y el panel tienen animaciones independientes
  // Easings de la casa: entra con out-cubic (frena suave), sale con in-cubic
  // (arranca suave). Salida un pelín más corta que la entrada.
  const overlayAnim = closing
    ? "animate-[modal-overlay-out_200ms_cubic-bezier(.32,0,.67,0)_forwards]"
    : "animate-[modal-overlay-in_220ms_cubic-bezier(.33,1,.68,1)_forwards]";

  const panelAnim = closing
    ? "animate-[modal-out_200ms_cubic-bezier(.32,0,.67,0)_forwards]"
    : "animate-[modal-in_220ms_cubic-bezier(.33,1,.68,1)_forwards]";

  return (
    // Wrapper: solo posicionamiento, SIN opacidad propia
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Fondo con blur — animación propia, independiente del panel */}
      <div
        className={`absolute inset-0 bg-black/25 backdrop-blur-md ${overlayAnim}`}
        style={{ opacity: 0 }}
        onClick={handleClose}
      />

      {/* Panel del modal — animación propia, SIN blur */}
      <div
        className={`relative w-full max-w-sm bg-white rounded-2xl shadow-2xl shadow-black/10 border border-slate-200/60 p-8 ${panelAnim}`}
        style={{ opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="mb-6">
          <Image
            src="/logomisreferidos.png"
            alt="MisReferidos.com"
            width={884}
            height={149}
            className="h-7 object-contain"
            style={{ width: "auto" }}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-lg">
          {(["login", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                tab === t
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "login" ? "Iniciar sesión" : "Registrarse"}
            </button>
          ))}
        </div>

        {/* Formulario login */}
        {tab === "login" && (
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-1.5">
              <Label htmlFor="login-email" className="text-slate-700">
                Correo electrónico
              </Label>
              <Input
                id="login-email"
                type="email"
                placeholder="tu@email.com"
                className="bg-white border-slate-200"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="login-password" className="text-slate-700">
                  Contraseña
                </Label>
                <a
                  href="/auth/forgot-password"
                  className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                className="bg-white border-slate-200"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
            <p className="text-center text-xs text-slate-400 pt-1">
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => setTab("signup")}
                className="text-slate-700 font-medium hover:underline"
              >
                Regístrate
              </button>
            </p>
          </form>
        )}

        {/* Formulario signup */}
        {tab === "signup" && (
          <form className="space-y-4" onSubmit={handleSignup}>
            <div className="space-y-1.5">
              <Label htmlFor="signup-name" className="text-slate-700">
                Nombre
              </Label>
              <Input
                id="signup-name"
                placeholder="Luis Fernández"
                className="bg-white border-slate-200"
                required
                maxLength={60}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-username" className="text-slate-700">
                Usuario
              </Label>
              {/* Es la URL de tu perfil público: /u/tu-usuario */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
                  @
                </span>
                <Input
                  id="signup-username"
                  placeholder="tu_usuario"
                  className="bg-white border-slate-200 pl-7"
                  required
                  maxLength={30}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email" className="text-slate-700">
                Correo electrónico
              </Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="tu@email.com"
                className="bg-white border-slate-200"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password" className="text-slate-700">
                Contraseña
              </Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="••••••••"
                className="bg-white border-slate-200"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-repeat" className="text-slate-700">
                Repetir contraseña
              </Label>
              <Input
                id="signup-repeat"
                type="password"
                placeholder="••••••••"
                className="bg-white border-slate-200"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {info && <p className="text-sm text-emerald-600">{info}</p>}
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
            <p className="text-center text-xs text-slate-400 pt-1">
              ¿Ya tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => setTab("login")}
                className="text-slate-700 font-medium hover:underline"
              >
                Inicia sesión
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
