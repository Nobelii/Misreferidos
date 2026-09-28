import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  PauseCircle,
  Clock3,
  Megaphone,
  ChevronRight,
  CheckCircle2,
  Flag,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { brandColor } from "@/lib/brand";
import { ATTENTION_REASON_ACTION } from "@/lib/labels";
import type { AttentionItem } from "@/lib/queries";
import type { AttentionReason } from "@/lib/types";
import { cn } from "@/lib/utils";

const REASON_STYLES: Record<
  AttentionReason,
  { icon: LucideIcon; className: string }
> = {
  expired: { icon: AlertTriangle, className: "text-rose-600 bg-rose-50" },
  reported: { icon: Flag, className: "text-rose-600 bg-rose-50" },
  rejected: { icon: XCircle, className: "text-rose-600 bg-rose-50" },
  expiring_soon: { icon: CalendarClock, className: "text-amber-600 bg-amber-50" },
  archived: { icon: PauseCircle, className: "text-slate-600 bg-slate-100" },
  pending_review: { icon: Clock3, className: "text-sky-600 bg-sky-50" },
  no_traction: { icon: Megaphone, className: "text-olive-600 bg-olive-50" },
};

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="flex items-center gap-3 p-5 bg-emerald-50/50 border-emerald-200">
        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-medium text-emerald-900">
            Todo en orden
          </p>
          <p className="text-xs text-emerald-700/80">
            Ninguno de tus beneficios necesita atención ahora mismo.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-slate-200/70 bg-white/70 border-slate-200/70 overflow-hidden">
      {items.map(({ benefit, reason, message }) => {
        const style = REASON_STYLES[reason];
        const Icon = style.icon;
        const action = ATTENTION_REASON_ACTION[reason];
        return (
          <Link
            key={benefit.id}
            href={`/app/referido/${benefit.id}`}
            className="flex items-center gap-3 p-4 transition-colors hover:bg-slate-50/80"
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                style.className,
              )}
            >
              <Icon className="w-4 h-4" />
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white",
                    brandColor(benefit.brand),
                  )}
                >
                  {benefit.brand.charAt(0).toUpperCase()}
                </span>
                <p className="font-medium text-sm text-slate-900 truncate">
                  {benefit.brand}
                </p>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{message}</p>
            </div>

            <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary">
              {action}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        );
      })}
    </Card>
  );
}
