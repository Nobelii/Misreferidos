"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Avatar de usuario: la imagen si hay `avatarUrl`, si no (o si falla la carga)
 * un círculo con la inicial. Mismo patrón de fallback que BrandMark.
 */
export function UserAvatar({
  name,
  avatarUrl,
  size,
  className,
  textClassName,
}: {
  name: string;
  avatarUrl?: string | null;
  size: number;
  className?: string;
  textClassName?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (avatarUrl && !errored) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        onError={() => setErrored(true)}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/60 text-white font-bold",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span className={textClassName}>{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}
