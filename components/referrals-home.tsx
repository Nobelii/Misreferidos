import Link from "next/link";
import { StatsRow } from "@/components/stats-row";
import { FilterPanel } from "@/components/filter-panel";
import { BrandCard } from "@/components/brand-card";
import { Card } from "@/components/ui/card";
import { getBrands, getCategories, getHomeStats } from "@/lib/queries";

export async function ReferralsHome() {
  const [brands, categories, stats] = await Promise.all([
    getBrands(24),
    getCategories(),
    getHomeStats(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <StatsRow stats={stats} />

      <div className="border-t border-line" />

      <div className="flex flex-col lg:flex-row items-start gap-6">
        <div className="flex-1 w-full">
          {brands.length === 0 ? (
            <Card className="p-12 text-center bg-paper border-line">
              <p className="font-semibold text-slate-900">
                Todavía no hay beneficios publicados
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Sé la primera persona en compartir uno.
              </p>
            </Card>
          ) : (
            <>
              <div className="animate-stagger grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                {brands.map((b) => (
                  <BrandCard key={b.slug} brand={b} />
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <Link
                  href="/explorar"
                  className="text-sm font-medium text-olive-700 hover:underline"
                >
                  Ver todas las marcas →
                </Link>
              </div>
            </>
          )}
        </div>

        <FilterPanel categories={categories} />
      </div>
    </div>
  );
}
