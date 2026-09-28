import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportQueue } from "@/components/report-queue";
import { getOpenReports, isStaff } from "@/lib/queries";

export const metadata = {
  title: "Moderación | MisReferidos",
};

async function Queues() {
  // La comprobación de rol aquí es para no renderizar una página inútil. La
  // seguridad real está en la base: las policies de staff y el trigger
  // guard_referral_moderation rechazarían los UPDATE de un usuario normal
  // aunque llegara a esta ruta o llamara a las actions directamente.
  //
  // Ya no hay cola de aprobación previa: los referidos y las marcas se publican
  // solos. Lo que queda aquí es moderación *a posteriori*, sobre lo reportado.
  if (!(await isStaff())) notFound();

  const reports = await getOpenReports();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900">
            Reportes abiertos
          </h2>
          {reports.length > 0 && (
            <Badge variant="destructive" className="tabular-nums">
              {reports.length}
            </Badge>
          )}
        </div>
        <ReportQueue items={reports} />
      </section>
    </div>
  );
}

export default function ModeracionPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Moderación
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Todo se publica al instante. Aquí se revisa lo que la comunidad
          reporta, para retirar lo que no funcione o incumpla las normas.
        </p>
      </header>

      <Suspense fallback={<QueuesSkeleton />}>
        <Queues />
      </Suspense>
    </div>
  );
}

function QueuesSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-6 w-52" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Card
            key={i}
            className="p-5 bg-white/70 border-slate-200/70 flex items-start gap-4"
          >
            <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md shrink-0" />
          </Card>
        ))}
      </div>
    </div>
  );
}
