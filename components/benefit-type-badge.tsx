import { Badge } from "@/components/ui/badge";
import { BENEFIT_TYPE_META } from "@/lib/benefit-format";
import type { BenefitType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BenefitTypeBadge({
  type,
  className,
}: {
  type: BenefitType;
  className?: string;
}) {
  const meta = BENEFIT_TYPE_META[type];
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px] font-semibold px-1.5 py-0.5",
        meta.className,
        className,
      )}
    >
      <Icon className="w-3 h-3" />
      {meta.label}
    </Badge>
  );
}
