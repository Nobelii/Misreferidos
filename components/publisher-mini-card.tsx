import Link from "next/link";
import { BadgeCheck, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import type { Publisher } from "@/lib/types";

export function PublisherMiniCard({ publisher }: { publisher: Publisher }) {
  return (
    <Link href={`/u/${publisher.username}`} className="block">
      <Card className="flex items-center gap-3 p-4 bg-white/70 border-slate-200/70 shadow-xs hover:border-primary/30 hover:shadow-md transition-all">
        <UserAvatar
          name={publisher.name}
          avatarUrl={publisher.avatarUrl}
          size={44}
          textClassName="text-base"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="font-semibold text-slate-900 truncate">
              {publisher.name}
            </p>
            {publisher.verified && (
              <BadgeCheck className="w-4 h-4 shrink-0 text-emerald-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            Publicado por @{publisher.username}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
      </Card>
    </Link>
  );
}
