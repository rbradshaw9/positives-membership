import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { CourseCheckoutButton } from "./CourseCheckoutButton";

export const metadata = {
  title: "Courses — Positives",
  description: "Standalone Positives courses you can keep in your library.",
};

type StoreCourse = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  cover_image_url: string | null;
  tier_min: string | null;
  price_cents: number | null;
  stripe_price_id: string | null;
  is_standalone_purchasable: boolean;
  points_price: number | null;
  points_unlock_enabled: boolean;
};

type StoreMember = {
  id: string;
  subscription_status: string | null;
};

function formatUsd(cents: number | null) {
  if (!cents) return "Price coming soon";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const supabase = asLooseSupabaseClient(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = user
    ? await supabase
        .from("member")
        .select<StoreMember>("id, subscription_status")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: entitlements } = member
    ? await supabase
        .from("course_entitlement")
        .select<{ course_id: string }[]>("course_id")
        .eq("member_id", member.id)
        .eq("status", "active")
    : { data: [] };

  const ownedCourseIds = new Set((entitlements ?? []).map((row: { course_id: string }) => row.course_id));

  const { data: courses } = await supabase
    .from("course")
    .select<StoreCourse[]>(
      "id, title, slug, description, cover_image_url, tier_min, price_cents, stripe_price_id, is_standalone_purchasable, points_price, points_unlock_enabled"
    )
    .eq("status", "published")
    .eq("is_standalone_purchasable", true)
    .order("sort_order", { ascending: true });

  const rows = (courses ?? []).filter(
    (course) => !ownedCourseIds.has(course.id)
  );
  const activeSubscriber =
    member?.subscription_status === "active" || member?.subscription_status === "trialing";

  return (
    <main style={{ background: "#FAFAF8", minHeight: "100dvh" }}>
      <section
        style={{
          maxWidth: "68rem",
          margin: "0 auto",
          padding: "clamp(2rem, 6vw, 5rem) 1.5rem",
        }}
      >
        <div style={{ maxWidth: "42rem", marginBottom: "2rem" }}>
          <p
            style={{
              color: "#2EC4B6",
              fontSize: "0.78rem",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}
          >
            Positives Courses
          </p>
          <h1
            className="font-heading"
            style={{
              color: "#121417",
              fontSize: "clamp(2.5rem, 7vw, 5rem)",
              letterSpacing: "-0.055em",
              lineHeight: 0.98,
              textWrap: "balance",
              marginBottom: "1rem",
            }}
          >
            Keep the courses that matter to you.
          </h1>
          <p style={{ color: "#68707A", lineHeight: 1.7, fontSize: "1rem" }}>
            Purchased and granted courses stay in your library permanently. If you are a
            subscriber, your daily practice is still the center; courses are here when
            you want a deeper dive.
          </p>
        </div>

        {success === "course" && (
          <div className="surface-card" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
            Your course purchase is being added to your library.
          </div>
        )}

        {ownedCourseIds.size > 0 && (
          <div
            className="surface-card"
            style={{
              padding: "1rem 1.1rem",
              marginBottom: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "#3F4652", fontSize: "0.92rem" }}>
              You already have {ownedCourseIds.size} course
              {ownedCourseIds.size === 1 ? "" : "s"} in your library.
            </span>
            <Link href="/library" className="btn-secondary">
              Open library
            </Link>
          </div>
        )}

        {rows.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem",
            }}
          >
            {rows.map((course) => {
              const hasPrice = Boolean(course.stripe_price_id && course.price_cents);
              return (
                <article
                  key={course.id}
                  id={course.slug ?? course.id}
                  className="surface-card"
                  style={{
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      minHeight: "8rem",
                      borderRadius: "1rem",
                      background: course.cover_image_url
                        ? `center / cover url(${course.cover_image_url})`
                        : "linear-gradient(135deg, rgba(46,196,182,0.16), rgba(47,111,237,0.12))",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        color: "#121417",
                        fontWeight: 800,
                        fontSize: "1.15rem",
                        lineHeight: 1.2,
                        textWrap: "balance",
                        marginBottom: "0.45rem",
                      }}
                    >
                      {course.title}
                    </p>
                    {course.description && (
                      <p style={{ color: "#68707A", fontSize: "0.9rem", lineHeight: 1.6 }}>
                        {course.description}
                      </p>
                    )}
                  </div>
                  <div>
                    <p style={{ color: "#121417", fontWeight: 800, marginBottom: "0.35rem" }}>
                      {formatUsd(course.price_cents)}
                    </p>
                    {activeSubscriber && course.points_unlock_enabled && (
                      <p style={{ color: "#68707A", fontSize: "0.8rem" }}>
                        Subscriber point unlock:{" "}
                        {course.points_price ?? Math.round((course.price_cents ?? 0) / 100)} pts
                      </p>
                    )}
                  </div>
                  <CourseCheckoutButton
                    courseId={course.id}
                    disabled={!hasPrice}
                    signedIn={Boolean(user)}
                    priceLabel={formatUsd(course.price_cents)}
                  />
                </article>
              );
            })}
          </div>
        ) : (
          <div
            className="surface-card"
            style={{ padding: "2rem", textAlign: "center", maxWidth: "36rem" }}
          >
            <h2
              className="font-heading"
              style={{
                color: "#121417",
                fontSize: "1.6rem",
                letterSpacing: "-0.035em",
                textWrap: "balance",
                marginBottom: "0.5rem",
              }}
            >
              Your available courses are already in your library.
            </h2>
            <p style={{ color: "#68707A", lineHeight: 1.65, marginBottom: "1rem" }}>
              We will keep this store uncluttered by hiding anything you already own.
            </p>
            <Link href="/library" className="btn-primary">
              Go to library
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
