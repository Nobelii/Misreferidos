"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  Plus,
  User,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/explorar", label: "Explorar", icon: Compass },
  { href: "/app/publicar", label: "Publicar", icon: Plus },
  { href: "/app/perfil", label: "Perfil", icon: User },
];

export function DashboardSidebar({
  displayName,
  username,
  isStaff,
}: {
  displayName: string;
  username: string;
  isStaff: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items = isStaff
    ? [...NAV, { href: "/app/moderacion", label: "Moderación", icon: ShieldCheck }]
    : NAV;

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const nav = (
    <>
      <Link
        href="/app/dashboard"
        className="flex items-center px-3"
        onClick={() => setOpen(false)}
      >
        <Image
          src="/logomisreferidos.png"
          alt="MisReferidos.com"
          width={884}
          height={149}
          className="h-7 object-contain invert"
            style={{ width: "auto" }}
        />
      </Link>

      <p className="mt-8 mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        Menú
      </p>

      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ease-brand",
                active
                  ? "bg-slate-800/60 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-olive-400" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  const footer = (
    <div className="border-t border-slate-800 pt-4">
      <div className="flex items-center gap-3 px-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-olive-500 to-olive-400 text-sm font-semibold text-white">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-100">
            {displayName}
          </p>
          <p className="truncate text-xs text-slate-500">@{username}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors duration-150 ease-brand hover:bg-slate-900 hover:text-rose-300"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <>
      {/* Topbar móvil: la sidebar se oculta y se abre como drawer. */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 lg:hidden">
        <Link href="/app/dashboard" className="flex items-center">
          <Image
            src="/logomisreferidos.png"
            alt="MisReferidos.com"
            width={884}
            height={149}
            className="h-6 object-contain invert"
            style={{ width: "auto" }}
          />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-300 hover:bg-slate-900"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Sidebar fija en desktop */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-950 px-3 py-6 lg:flex">
        <div>{nav}</div>
        {footer}
      </aside>

      {/* Drawer móvil */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[248px] flex-col justify-between border-r border-slate-800 bg-slate-950 px-3 py-6 animate-in slide-in-from-left-4 duration-200 ease-brand">
            <div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
              {nav}
            </div>
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
