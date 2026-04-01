type SectionEyebrowProps = {
  children: React.ReactNode;
  id?: string;
  className?: string;
  as?: "p" | "h2";
};

export function SectionEyebrow({
  children,
  id,
  className,
  as = "p",
}: SectionEyebrowProps) {
  const Component = as;

  return (
    <Component
      id={id}
      className={["ui-section-eyebrow", className ?? ""].filter(Boolean).join(" ")}
    >
      {children}
    </Component>
  );
}
