/**
 * app/(marketing)/layout.tsx
 * Layout for the public marketing route group.
 * Used by the landing page (/).
 * /join and /login have their own full-page layouts (no shared wrapper needed).
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
