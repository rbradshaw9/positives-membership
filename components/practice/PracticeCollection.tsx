import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { TypeBadge } from "@/components/member/TypeBadge";

type PracticeCollectionItem = {
  id: string;
  type: string;
  title: string;
  excerpt: string | null;
  description: string | null;
  duration_seconds: number | null;
  dateContext: string | null;
  hasNote: boolean;
};

interface PracticeCollectionProps {
  title: string;
  subtitle: string;
  items: PracticeCollectionItem[];
}

export function PracticeCollection({
  title,
  subtitle,
  items,
}: PracticeCollectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <SurfaceCard tone="tint" className="surface-card--editorial">
        <p className="ui-section-eyebrow mb-2">Curated Rhythm</p>
        <h2 className="member-card-title">{title}</h2>
        <p className="member-body-copy mt-2 max-w-3xl">{subtitle}</p>
      </SurfaceCard>

      {items.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <Link key={item.id} href={`/library/${item.id}`} className="group h-full">
              <SurfaceCard
                elevated
                as="article"
                className="surface-card--editorial flex h-full flex-col gap-4 transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-large"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-2">
                    <TypeBadge type={item.type} size="xs" />
                    {item.dateContext ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.dateContext}
                      </span>
                    ) : null}
                  </div>
                  {item.hasNote ? (
                    <span className="rounded-full bg-primary/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary ring-1 ring-primary/15">
                      Reflected
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <h3 className="heading-balance font-heading text-2xl font-semibold tracking-[-0.03em] text-foreground transition-colors group-hover:text-primary">
                    {item.title}
                  </h3>
                  {(item.excerpt ?? item.description) ? (
                    <p className="line-clamp-3 text-sm leading-body text-muted-foreground">
                      {item.excerpt ?? item.description}
                    </p>
                  ) : null}
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {item.duration_seconds
                      ? `${Math.max(1, Math.round(item.duration_seconds / 60))} min`
                      : "Open practice"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    Open
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </div>
              </SurfaceCard>
            </Link>
          ))}
        </div>
      ) : (
        <SurfaceCard elevated className="surface-card--editorial text-center">
          <p className="font-medium text-foreground">Nothing here yet</p>
          <p className="mt-2 text-sm leading-body text-muted-foreground">
            New published practices in this rhythm will appear here automatically. Until then,
            Home and the full library are still the best places to keep moving.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button href="/today" size="sm">
              Go to Home
            </Button>
            <Button href="/library" variant="secondary" size="sm">
              Open library
            </Button>
          </div>
        </SurfaceCard>
      )}
    </section>
  );
}
