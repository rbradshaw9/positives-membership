import { SurfaceCard } from "@/components/ui/SurfaceCard";

type EmptyStateCardProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyStateCard({
  icon,
  title,
  subtitle,
  action,
  className,
}: EmptyStateCardProps) {
  return (
    <SurfaceCard
      className={["mx-auto max-w-md text-center", className ?? ""].filter(Boolean).join(" ")}
      padding="lg"
      elevated
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <h2 className="heading-balance font-heading text-xl font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-body text-muted-foreground">
          {subtitle}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </SurfaceCard>
  );
}
