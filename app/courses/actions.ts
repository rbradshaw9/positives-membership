"use server";

import { createCourseCheckoutSession } from "@/server/services/stripe/create-course-checkout";
import { createClient } from "@/lib/supabase/server";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

export type CourseCheckoutResult =
  | { url: string; error?: never }
  | { url?: never; error: string };

type CheckoutCourse = {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  stripe_price_id: string | null;
  is_standalone_purchasable: boolean;
};

export async function getCourseCheckoutUrl(formData: FormData): Promise<CourseCheckoutResult> {
  const courseId = (formData.get("courseId") as string | null)?.trim();

  if (!courseId) {
    return { error: "No course selected. Please try again." };
  }

  const supabase = asLooseSupabaseClient(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: course, error: courseError } = await supabase
    .from("course")
    .select<CheckoutCourse>("id, title, slug, status, stripe_price_id, is_standalone_purchasable")
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();

  if (courseError || !course) {
    console.error("[courses] checkout course lookup failed:", courseError?.message);
    return { error: "That course is not available right now." };
  }

  if (!course.is_standalone_purchasable || !course.stripe_price_id) {
    return { error: "This course is not available for standalone purchase yet." };
  }

  let member:
    | { id: string; email: string | null; stripe_customer_id: string | null }
    | null = null;

  if (user) {
    const { data: memberRow } = await supabase
      .from("member")
      .select<{ id: string; email: string | null; stripe_customer_id: string | null }>(
        "id, email, stripe_customer_id"
      )
      .eq("id", user.id)
      .maybeSingle();

    member = memberRow ?? null;

    const { data: entitlement } = await supabase
      .from("course_entitlement")
      .select<{ id: string }>("id")
      .eq("member_id", user.id)
      .eq("course_id", courseId)
      .eq("status", "active")
      .maybeSingle();

    if (entitlement) {
      return { error: "You already own this course. It is waiting in your library." };
    }
  }

  try {
    const { url } = await createCourseCheckoutSession({
      courseId,
      courseTitle: course.title,
      priceId: course.stripe_price_id,
      userId: member?.id ?? user?.id ?? null,
      customerId: member?.stripe_customer_id ?? null,
      customerEmail: member?.email ?? user?.email ?? null,
      sourcePath: `/courses${course.slug ? `#${course.slug}` : ""}`,
    });

    return { url };
  } catch (error) {
    console.error(
      "[courses] checkout creation failed:",
      error instanceof Error ? error.message : String(error)
    );
    return { error: "Could not start checkout. Please try again." };
  }
}
