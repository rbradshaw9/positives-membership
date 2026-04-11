type StatCardProps = {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  className?: string;
  tone?: "default" | "dark";
};

export function StatCard({
  label,
  value,
  subtext,
  className,
  tone = "default",
}: StatCardProps) {
  return (
    <div
      className={[
        "stat-card",
        tone === "dark" ? "stat-card--dark" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
      {subtext && <p className="mt-2 text-xs text-muted-foreground">{subtext}</p>}
    </div>
  );
}
