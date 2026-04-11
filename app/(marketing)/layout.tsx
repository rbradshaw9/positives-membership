/**
 * app/(marketing)/layout.tsx
 * Layout for the public marketing route group.
 * Used by the landing page (/).
 * /join and /login have their own full-page layouts (no shared wrapper needed).
 */
import { PublicGrowthScriptsSlot } from "@/components/analytics/PublicGrowthScriptsSlot";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicGrowthScriptsSlot />
      {children}
    </>
  );
}
