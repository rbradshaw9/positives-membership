import { PublicGrowthScriptsSlot } from "@/components/analytics/PublicGrowthScriptsSlot";

export default function SubscribeLayout({
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
