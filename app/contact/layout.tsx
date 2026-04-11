import { PublicGrowthScriptsSlot } from "@/components/analytics/PublicGrowthScriptsSlot";

export default function ContactLayout({
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
