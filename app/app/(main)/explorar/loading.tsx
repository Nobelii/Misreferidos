import { Skeleton } from "@/components/ui/skeleton";
import { BenefitGridSkeleton } from "@/components/benefit-grid-skeleton";

export default function ExplorarLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-md" />
      <BenefitGridSkeleton count={12} />
    </div>
  );
}
