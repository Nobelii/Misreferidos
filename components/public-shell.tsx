import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";

/**
 * Chrome de las páginas públicas: navbar, contenido centrado y footer. Mismo
 * ancho (max-w-7xl) que la home, las fichas de marca y los perfiles.
 */
export function PublicShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main
        className={cn(
          "flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 pt-8 pb-12",
          className,
        )}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
