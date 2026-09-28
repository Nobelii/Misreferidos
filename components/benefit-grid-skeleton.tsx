import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BenefitGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="flex flex-col gap-3 p-4 bg-white/70 border-slate-200/70"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-14" />
            {/* El gancho del beneficio, que en la card es la línea dominante. */}
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-1.5 pt-1">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-full rounded-md mt-1" />
        </Card>
      ))}
    </div>
  );
}
