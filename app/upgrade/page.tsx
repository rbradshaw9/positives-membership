import { redirect } from "next/navigation";

export const metadata = {
  title: "Manage Membership — Positives",
  description:
    "Open the Stripe billing center to manage your Positives membership.",
};

/**
 * app/upgrade/page.tsx
 * Legacy route kept only for compatibility with older upgrade links.
 *
 * Self-serve membership changes now live entirely in Stripe Customer Portal,
 * so this route simply hands members over to /account/billing.
 */
export default async function UpgradePage() {
  redirect("/account/billing");
}
