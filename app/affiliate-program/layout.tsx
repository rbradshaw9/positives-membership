import { PublicGrowthScriptsSlot } from "@/components/analytics/PublicGrowthScriptsSlot";

export default function AffiliateProgramLayout({
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
