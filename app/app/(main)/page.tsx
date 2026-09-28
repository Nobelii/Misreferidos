import { Suspense } from "react";
import { ReferralsHome } from "@/components/referrals-home";
import { BenefitGridSkeleton } from "@/components/benefit-grid-skeleton";

// Cache Components exige que todo dato no cacheado viva bajo un <Suspense>: así
// el shell de la página se sirve al instante y el grid llega cuando la base
// responde, en vez de bloquear el render entero.
export default function Page() {
  return (
    <Suspense fallback={<BenefitGridSkeleton count={12} />}>
      <ReferralsHome />
    </Suspense>
  );
}
