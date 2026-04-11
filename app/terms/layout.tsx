import { PublicGrowthScriptsSlot } from "@/components/analytics/PublicGrowthScriptsSlot";

export default function TermsLayout({
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
