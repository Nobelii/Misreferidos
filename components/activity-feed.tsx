"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MousePointerClick,
  BadgeCheck,
  Plus,
  TrendingUp,
  Bookmark,
  Flag,
  CalendarX,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { relativeTime } from "@/lib/format-time";
import { activityLabel } from "@/lib/labels";
import type { ActivityItem, ActivityType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<ActivityType, { icon: LucideIcon; className: string }> =
  {
    referral_used: {
      icon: MousePointerClick,
      className: "text-olive-600 bg-olive-50",
    },
    referral_verified: {
      icon: BadgeCheck,
      className: "text-emerald-600 bg-emerald-50",
    },
    referral_published: { icon: Plus, className: "text-sky-600 bg-sky-50" },
    referral_trending: {
      icon: TrendingUp,
      className: "text-amber-600 bg-amber-50",
    },
    referral_saved: { icon: Bookmark, className: "text-violet-600 bg-violet-50" },
    referral_reported: { icon: Flag, className: "text-rose-600 bg-rose-50" },
    referral_expired: { icon: CalendarX, className: "text-rose-600 bg-rose-50" },
  };

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  // Se calcula la hora actual solo en el cliente tras montar, para no leer
  // Date.now() durante el prerender (Cache Components de Next lo prohíbe).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  if (items.length === 0) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Todavía no hay actividad. Publica un referido para empezar.
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <ul className="animate-stagger space-y-4">
        {items.map((item) => {
          const style = TYPE_STYLES[item.type];
          const Icon = style.icon;
          const row = (
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  style.className,
                )}
              >
                <Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-800 leading-snug">
                  {activityLabel(item.type, item.brand)}
                </p>
                <p className="text-xs text-slate-400">
                  {now === null ? " " : relativeTime(item.at, now)}
                </p>
              </div>
            </div>
          );
          return (
            <li key={item.id}>
              {item.benefitId ? (
                <Link
                  href={`/app/referido/${item.benefitId}`}
                  className="block rounded-lg -m-1 p-1 hover:bg-slate-50 transition-colors"
                >
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
