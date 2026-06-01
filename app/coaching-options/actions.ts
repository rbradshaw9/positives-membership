"use server";

import {
  createCoachingCheckoutSession,
  type CoachingPackType,
} from "@/server/services/stripe/create-coaching-checkout";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { metricCount, metricDistribution, routeBucket } from "@/lib/observability/metrics";

export type CoachingCheckoutResult =
  | { url: string; error?: never }
  | { url?: never; error: string };

function isCoachingPackType(value: FormDataEntryValue | null): value is CoachingPackType {
  return value === "single" || value === "punch_pass";
}

export async function getCoachingCheckoutUrl(
  formData: FormData
): Promise<CoachingCheckoutResult> {
  const startedAt = Date.now();
  const packTypeValue = formData.get("packType");
  const sourcePath =
    (formData.get("sourcePath") as string | null)?.trim() || "/coaching-options";
  const source = routeBucket(sourcePath);

  if (!isCoachingPackType(packTypeValue)) {
    metricCount("checkout.coaching", 1, {
      outcome: "invalid_pack_type",
      source,
    });
    return { error: "Please choose a coaching option and try again." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let member:
    | { id: string; email: string | null; stripe_customer_id: string | null }
    | null = null;

  if (user) {
    const admin = asLooseSupabaseClient(getAdminClient());
    const { data: memberRow } = await admin
      .from("member")
      .select<{ id: string; email: string | null; stripe_customer_id: string | null }>(
        "id, email, stripe_customer_id"
      )
      .eq("id", user.id)
      .maybeSingle();
    member = memberRow ?? null;
  }

  try {
    metricCount("checkout.coaching", 1, {
      outcome: "started",
      source,
      pack_type: packTypeValue,
      logged_in: Boolean(member),
      has_saved_customer: Boolean(member?.stripe_customer_id),
    });

    const { url } = await createCoachingCheckoutSession({
      packType: packTypeValue,
      userId: member?.id ?? user?.id ?? null,
      customerId: member?.stripe_customer_id ?? null,
      customerEmail: member?.email ?? user?.email ?? null,
      sourcePath,
    });

    metricCount("checkout.coaching", 1, {
      outcome: "session_created",
      source,
      pack_type: packTypeValue,
      logged_in: Boolean(member),
      has_saved_customer: Boolean(member?.stripe_customer_id),
    });
    metricDistribution("checkout.coaching.duration", Date.now() - startedAt, {
      outcome: "session_created",
      source,
      pack_type: packTypeValue,
      logged_in: Boolean(member),
      has_saved_customer: Boolean(member?.stripe_customer_id),
    });

    return { url };
  } catch (error) {
    console.error(
      "[coaching-options] checkout creation failed:",
      error instanceof Error ? error.message : String(error)
    );
    metricCount("checkout.coaching", 1, {
      outcome: "error",
      source,
      pack_type: packTypeValue,
      logged_in: Boolean(member),
      has_saved_customer: Boolean(member?.stripe_customer_id),
    });
    metricDistribution("checkout.coaching.duration", Date.now() - startedAt, {
      outcome: "error",
      source,
      pack_type: packTypeValue,
      logged_in: Boolean(member),
      has_saved_customer: Boolean(member?.stripe_customer_id),
    });
    return { error: "Could not start checkout. Please try again." };
  }
}
