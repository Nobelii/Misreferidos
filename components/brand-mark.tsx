"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { brandColor } from "@/lib/brand";

function InitialMark({
  brand,
  className,
  textClassName,
}: {
  brand: string;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-white font-semibold",
        brandColor(brand),
        className,
      )}
    >
      <span className={textClassName}>{brand.charAt(0).toUpperCase()}</span>
    </div>
  );
}

/**
 * Marca visual de la tienda. Si no hay logo (caso por defecto en los datos
 * actuales) se renderiza un cuadro con la inicial — sin JS de cliente en la
 * práctica. Solo cuando hay `logoUrl` se hidrata para manejar el fallback
 * de carga de imagen.
 */
export function BrandMark({
  brand,
  logoUrl,
  size = 36,
  className = "w-9 h-9 rounded-lg",
  textClassName = "text-sm",
}: {
  brand: string;
  logoUrl?: string;
  size?: number;
  className?: string;
  textClassName?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (logoUrl && !errored) {
    return (
      <Image
        src={logoUrl}
        alt={brand}
        width={size}
        height={size}
        onError={() => setErrored(true)}
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <InitialMark
      brand={brand}
      className={className}
      textClassName={textClassName}
    />
  );
}
