"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Debe coincidir con la duración de las keyframes modal-out de globals.css. */
const DURATION = 220;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shell de modal de la casa. Unifica lo que auth-modal y brand-modal hacían por
 * separado, y añade lo que a ninguno de los dos le daba: focus trap y roles
 * ARIA.
 *
 * Lo que aporta cada pieza heredada:
 *   - Portal a document.body (de brand-modal): evita anidar el contenido dentro
 *     de formularios o contenedores con overflow/transform del árbol de origen.
 *   - Escape, scroll lock y animación de salida (de auth-modal): sin el estado
 *     `closing` el panel desaparecería de golpe.
 *
 * El `style={{ opacity: 0 }}` inline no es decorativo: las keyframes usan
 * `forwards` y sin él habría un flash a opacidad 1 en el primer frame.
 */
export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  className,
  closeOnOverlay = true,
  zIndexClassName = "z-90",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** id del elemento que titula el modal, para aria-labelledby. */
  labelledBy?: string;
  /** Clases del panel. Por defecto un ancho de lectura cómodo. */
  className?: string;
  closeOnOverlay?: boolean;
  /**
   * Orden de apilado. Por defecto z-[90], por debajo de auth-modal (z-[100]) y
   * brand-modal (z-[110]): si desde este modal hay que pedir sesión, el de auth
   * tiene que quedar encima.
   */
  zIndexClassName?: string;
}) {
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  // Para devolver el foco a quien abrió el modal al cerrarlo.
  const openerRef = useRef<HTMLElement | null>(null);

  // createPortal necesita document, que no existe en el render del servidor.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) setClosing(false);
  }, [open]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, DURATION);
  }, [onClose]);

  // Escape + focus trap en un solo listener: los dos reaccionan a teclas y
  // comparten el guard de `open`.
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }

      if (e.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // El Tab solo se intercepta en los extremos: en medio, el navegador ya
      // hace lo correcto y robarle el control rompe lectores de pantalla.
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Foco al abrir y devolución al cerrar. Sin esto, cerrar con Escape deja el
  // foco en el <body> y el teclado tiene que empezar desde arriba.
  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement as HTMLElement | null;
    const target =
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? panelRef.current;
    target?.focus();

    return () => openerRef.current?.focus?.();
  }, [open]);

  if (!open || !mounted) return null;

  // Entra con out-cubic (frena suave), sale con in-cubic (arranca suave).
  // La salida es un pelín más corta que la entrada.
  const overlayAnim = closing
    ? "animate-[modal-overlay-out_200ms_cubic-bezier(.32,0,.67,0)_forwards]"
    : "animate-[modal-overlay-in_220ms_cubic-bezier(.33,1,.68,1)_forwards]";

  const panelAnim = closing
    ? "animate-[modal-out_200ms_cubic-bezier(.32,0,.67,0)_forwards]"
    : "animate-[modal-in_220ms_cubic-bezier(.33,1,.68,1)_forwards]";

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center p-4",
        zIndexClassName,
      )}
    >
      <div
        className={cn("absolute inset-0 bg-black/25 backdrop-blur-md", overlayAnim)}
        style={{ opacity: 0 }}
        onClick={closeOnOverlay ? handleClose : undefined}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          "relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-paper p-7 shadow-2xl shadow-black/10 outline-hidden",
          panelAnim,
          className,
        )}
        style={{ opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>

        {children}
      </div>
    </div>,
    document.body,
  );
}

/** id estable para enlazar el título del modal con aria-labelledby. */
export function useModalTitleId() {
  return useId();
}
