import Link from "next/link";

type FilterChipProps = {
  children: React.ReactNode;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
};

export function FilterChip({
  children,
  active = false,
  href,
  onClick,
  className,
}: FilterChipProps) {
  const classes = ["filter-chip", className ?? ""].filter(Boolean).join(" ");

  if (href) {
    return (
      <Link href={href} className={classes} data-active={active}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={classes}
      data-active={active}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
