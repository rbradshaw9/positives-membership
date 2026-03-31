import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LandingPageClient } from "./landing-client";

export const metadata = {
  title: "Positives — A few minutes each day. A more positive life.",
  description:
    "Positives is a guided daily practice designed to help you think more clearly, respond more calmly, and build a life you actually enjoy living. From Dr. Paul Jenkins.",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: member } = await supabase
      .from("member")
      .select("subscription_status")
      .eq("id", user.id)
      .single();
    if (member?.subscription_status === "active") redirect("/today");
  }

  return <LandingPageClient />;
}
