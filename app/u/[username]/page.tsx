import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BadgeCheck, MapPin, Calendar, Layers, MousePointerClick } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { UserAvatar } from "@/components/user-avatar";
import { BenefitCard } from "@/components/benefit-card";
import { BenefitGridSkeleton } from "@/components/benefit-grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { JsonLd } from "@/components/json-ld";
import {
  getBenefitsByPublisher,
  getPublisherByUsername,
  getSitemapEntries,
} from "@/lib/queries";
import { profileJsonLd } from "@/lib/seo";
import type { Publisher } from "@/lib/types";

/**
 * Mismo esquema de ISR que /marca/[slug]: se prerenderizan unos cuantos
 * perfiles con referidos activos y el resto se genera estático tras su primera
 * visita. Al menos un param siempre (lo exige Cache Components).
 */
export async function generateStaticParams() {
  const { profiles } = await getSitemapEntries();
  if (profiles.length === 0) return [{ username: "__placeholder__" }];
  return profiles.slice(0, 50).map((p) => ({ username: p.username }));
}

function formatNumber(n: number) {
  return n.toLocaleString("es-ES");
}

function formatJoined(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const publisher = await getPublisherByUsername(username);
  if (!publisher) return { title: "Perfil no encontrado | MisReferidos" };

  const title = `${publisher.name} (@${publisher.username}) | MisReferidos`;
  const description =
    publisher.bio ||
    `Referidos y códigos compartidos por ${publisher.name} en MisReferidos.`;

  return {
    title,
    description,
    alternates: { canonical: `/u/${publisher.username}` },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `/u/${publisher.username}`,
      ...(publisher.avatarUrl && { images: [{ url: publisher.avatarUrl, alt: publisher.name }] }),
    },
  };
}

/**
 * Los referidos del perfil van en su propio Suspense: son datos vivos (los
 * contadores cambian) y no deben bloquear el shell. El perfil en sí, en cambio,
 * se resuelve arriba y cacheado — es lo que permite devolver un 404 real.
 */
async function PublisherBenefits({ publisher }: { publisher: Publisher }) {
  const benefits = await getBenefitsByPublisher(publisher.id);
  const usosTotales = benefits.reduce((acc, b) => acc + b.uses, 0);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Referidos publicados"
          value={benefits.length}
          icon={Layers}
          accent="text-olive-600 bg-olive-50"
        />
        <StatCard
          label="Usos totales"
          value={formatNumber(usosTotales)}
          icon={MousePointerClick}
          accent="text-emerald-600 bg-emerald-50"
        />
        <StatCard
          label="Estado"
          value={publisher.verified ? "Verificado" : "Miembro"}
          icon={BadgeCheck}
          accent="text-amber-600 bg-amber-50"
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Referidos de {publisher.name.split(" ")[0]}
        </h2>
        {benefits.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Este usuario todavía no publicó referidos.
          </Card>
        ) : (
          <div className="animate-stagger grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {benefits.map((b) => (
              <BenefitCard key={b.id} benefit={b} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  // Lectura cacheada (ver getPublisherByUsername). El status 404 lo pone el
  // proxy (lib/supabase/proxy.ts); este notFound() es la red de seguridad.
  const publisher = await getPublisherByUsername(username);
  if (!publisher) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <JsonLd data={profileJsonLd(publisher)} />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 pt-8 pb-12">
        <Card className="p-6 md:p-8 bg-white/70 border-slate-200/70">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <UserAvatar
              name={publisher.name}
              avatarUrl={publisher.avatarUrl}
              size={80}
              textClassName="text-3xl"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                  {publisher.name}
                </h1>
                {publisher.verified && (
                  <BadgeCheck className="w-6 h-6 text-emerald-500" />
                )}
              </div>
              <p className="text-muted-foreground">@{publisher.username}</p>
              {publisher.bio && (
                <p className="text-sm text-slate-700 mt-2 max-w-xl">
                  {publisher.bio}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                {publisher.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {publisher.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Miembro desde {formatJoined(publisher.joinedAt)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Suspense
          fallback={
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
              <BenefitGridSkeleton count={8} />
            </>
          }
        >
          <PublisherBenefits publisher={publisher} />
        </Suspense>

        <Link
          href="/explorar"
          className="text-sm text-primary font-medium hover:underline"
        >
          Explorar más referidos →
        </Link>
      </main>

      <Footer />
    </div>
  );
}
