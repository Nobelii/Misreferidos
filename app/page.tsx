import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { HomeHero } from "@/components/home-hero";
import { ReferralsHome } from "@/components/referrals-home";
import { BenefitGridSkeleton } from "@/components/benefit-grid-skeleton";
import { JsonLd } from "@/components/json-ld";
import { siteJsonLd } from "@/lib/seo";

// El título y la descripción los hereda del layout raíz; aquí solo la canónica,
// que no puede ir en el layout o todas las páginas sin la suya apuntarían a "/".
export const metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <JsonLd data={siteJsonLd()} />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col pt-4 pb-12">
        {/* El hero es estático puro (sin datos): se pinta al instante en el
            shell, mientras solo el catálogo espera a la base. */}
        <HomeHero />

        <Suspense fallback={<BenefitGridSkeleton count={12} />}>
          <ReferralsHome />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
