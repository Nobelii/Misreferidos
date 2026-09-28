import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BenefitGridSkeleton } from "@/components/benefit-grid-skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 pt-8 pb-12">
        <Card className="p-6 md:p-8 bg-white/70 border-slate-200/70">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5 bg-white/70 border-slate-200/70">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>

        <BenefitGridSkeleton count={8} />
      </main>
    </div>
  );
}
