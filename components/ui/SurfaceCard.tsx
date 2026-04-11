type SurfaceCardProps = {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  tone?: "default" | "tint" | "dark" | "glass-dark";
  elevated?: boolean;
  as?: "div" | "article" | "section";
};

export function SurfaceCard({
  children,
  className,
  padding = "md",
  tone = "default",
  elevated = false,
  as = "div",
}: SurfaceCardProps) {
  const Component = as;

  return (
    <Component
      className={[
        "surface-card",
        tone === "tint" ? "surface-card--tint" : "",
        tone === "dark" ? "surface-card--dark" : "",
        tone === "glass-dark" ? "surface-card--glass-dark" : "",
        elevated ? "surface-card--elevated" : "",
        padding === "none" ? "" : padding === "sm" ? "p-4" : padding === "lg" ? "p-7" : "p-5",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Component>
  );
}
