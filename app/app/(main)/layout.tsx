import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

// Chrome claro con navbar superior para todo /app salvo el dashboard, que vive
// en el grupo (console) con su propia sidebar oscura.
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
