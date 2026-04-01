type StatCardProps = {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  className?: string;
};

export function StatCard({ label, value, subtext, className }: StatCardProps) {
  return (
    <div className={["stat-card", className ?? ""].filter(Boolean).join(" ")}>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
      {subtext && <p className="mt-2 text-xs text-muted-foreground">{subtext}</p>}
    </div>
  );
}
