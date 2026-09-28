"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

// El modal se descarga solo al abrirse, no en el bundle inicial.
const AuthModal = dynamic(
  () => import("@/components/auth-modal").then((m) => m.AuthModal),
  { ssr: false },
);

export function PublishCta({
  className,
  size = "lg",
}: {
  className?: string;
  size?: "default" | "sm" | "lg";
}) {
  const { user } = useAuth();
  const authed = !!user;
  const [modalOpen, setModalOpen] = useState(false);

  const content = (
    <>
      <Plus className="w-5 h-5" />
      Publicar mi referido
    </>
  );

  const classes = cn("gap-2 shadow-md", className);

  if (authed) {
    return (
      <Button asChild size={size} className={classes}>
        <Link href="/app/publicar">{content}</Link>
      </Button>
    );
  }

  return (
    <>
      <Button size={size} className={classes} onClick={() => setModalOpen(true)}>
        {content}
      </Button>
      {modalOpen && (
        <AuthModal
          isOpen={modalOpen}
          defaultTab="signup"
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
