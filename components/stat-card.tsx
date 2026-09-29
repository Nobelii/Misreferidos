import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "text-olive-600 bg-olive-50",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: string;
  hint?: string;
}) {
  return (
    <Card className="p-5 bg-white/70 border-slate-200/70 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1 text-slate-900 truncate">
            {value}
          </p>
          {hint && (
            <p className="text-xs text-slate-400 mt-1 truncate">{hint}</p>
          )}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            accent,
          )}
        >
          <Icon className="w-5 h-5" />
        </span>
      </div>
    </Card>
  );
}
