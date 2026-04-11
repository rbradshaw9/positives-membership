import { PublicGrowthScriptsSlot } from "@/components/analytics/PublicGrowthScriptsSlot";

export default function PrivacyLayout({
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
