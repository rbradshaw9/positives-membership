import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Activate Your Membership — Positives",
  description: "Your Positives membership is not currently active.",
};

/**
 * app/subscribe/page.tsx
 * Destination for authenticated users who do not have an active subscription.
 *
 * Shown when:
 * - User signed up but has not purchased a subscription
 * - Subscription was canceled or is past_due
 *
 * Do NOT show this page to unauthenticated users — middleware handles that.
 */
export default async function SubscribePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthentiated users should not reach this page — redirect to login.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <span className="block font-heading font-bold text-2xl tracking-tight mb-1 text-foreground">
          Positives
        </span>
        <p className="text-muted-foreground text-xs mb-10">
          Signed in as {user.email}
        </p>

        <div className="bg-card rounded-lg border border-border shadow-soft p-6 mb-6 text-left">
          <h1 className="font-heading font-semibold text-lg text-foreground mb-2 leading-heading">
            Your membership is not active
          </h1>
          <p className="text-sm text-muted-foreground leading-body">
            To access your daily practice, weekly principles, and content
            library, you need an active Positives membership.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Stripe checkout CTA — wire up Price ID in Milestone 02 */}
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover transition-colors shadow-soft w-full"
          >
            View membership options
          </a>

          <form
            action={async () => {
              "use server";
              const sb = await createClient();
              await sb.auth.signOut();
              redirect("/login");
            }}
          >
            <button
              type="submit"
              className="w-full px-6 py-3 rounded border border-border text-muted-foreground font-medium text-sm hover:text-foreground hover:bg-muted transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
