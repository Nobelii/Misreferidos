import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublicarLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
        <div className="space-y-6">
          {[1, 2].map((step) => (
            <Card key={step} className="p-6 bg-white/70 border-slate-200/70 space-y-5">
              <div className="flex items-start gap-3">
                <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
              <div className="space-y-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
          <Skeleton className="h-11 w-48 rounded-md" />
        </div>

        <aside className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </aside>
      </div>
    </div>
  );
}
