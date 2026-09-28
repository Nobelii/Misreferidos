import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/labels";
import type { BenefitStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// El label vive en STATUS_LABEL (lib/labels.ts); aquí solo el color.
const STATUS_CLASS: Record<BenefitStatus, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  pending_review: "bg-amber-100 text-amber-700 border-amber-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
  expired: "bg-rose-100 text-rose-700 border-rose-200",
  archived: "bg-slate-100 text-slate-600 border-slate-200",
};

export function StatusBadge({ status }: { status: BenefitStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-semibold", STATUS_CLASS[status])}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}
