import { SurfaceCard } from "@/components/ui/SurfaceCard";

type CommunityPostCardProps = {
  author: string;
  initials: string;
  timeLabel: string;
  typeLabel: string;
  body: string;
  likes?: number;
};

export function CommunityPostCard({
  author,
  initials,
  timeLabel,
  typeLabel,
  body,
  likes = 0,
}: CommunityPostCardProps) {
  return (
    <SurfaceCard as="article" elevated className="surface-card--editorial">
      <div className="mb-4 flex gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{author}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {typeLabel}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">{timeLabel}</span>
          </div>
        </div>
      </div>
      <p className="text-sm leading-[1.75] text-muted-foreground">{body}</p>
      <div className="mt-5 flex items-center gap-4 border-t border-border pt-4 text-xs font-medium text-muted-foreground">
        <span>♥ {likes}</span>
        <span>Reply</span>
      </div>
    </SurfaceCard>
  );
}
