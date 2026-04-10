import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordClient } from "./reset-password-client";
import { Logo } from "@/components/marketing/Logo";

export const metadata: Metadata = {
  title: "Choose New Password — Positives",
  description: "Create a new password for your Positives account.",
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-dvh flex flex-col" style={{ background: "#F6F3EE" }}>
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, rgba(47,111,237,0.05) 0%, transparent 65%)",
          }}
        />

        <div className="relative flex-1 flex items-center justify-center py-12 px-6">
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center"
            style={{ boxShadow: "0 12px 36px rgba(18,20,23,0.08)" }}
          >
            <div className="flex justify-center mb-5">
              <Logo height={28} />
            </div>
            <h1
              className="font-heading font-bold text-2xl text-foreground"
              style={{ textWrap: "balance" }}
            >
              This reset link has expired
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Request a new password reset email and we&apos;ll send you another secure link.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/forgot-password"
                className="w-full px-6 py-3.5 rounded-full text-white font-medium text-sm transition-all"
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                  boxShadow: "0 6px 24px rgba(47,111,237,0.25)",
                  letterSpacing: "-0.01em",
                }}
              >
                Request another link
              </Link>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ResetPasswordClient email={user.email ?? ""} />;
}
