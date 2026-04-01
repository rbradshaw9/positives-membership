import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type SharedProps = {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  href?: string;
};

type ButtonProps = SharedProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children">;

function classesFor(variant: ButtonVariant, size: ButtonSize, className?: string): string {
  return [
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
        ? "btn-secondary"
        : variant === "outline"
          ? "btn-outline"
          : "btn-ghost",
    size === "sm" ? "px-4 py-2 text-sm" : size === "lg" ? "px-6 py-3 text-base" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  href,
  ...props
}: ButtonProps) {
  const classes = classesFor(variant, size, className);

  if (href) {
    return (
      <Link href={href} className={classes} target={props.target} rel={props.rel}>
        {children}
      </Link>
    );
  }

  return (
    <button {...props} className={classes}>
      {children}
    </button>
  );
}
