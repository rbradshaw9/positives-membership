import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { CourseCheckoutButton } from "../CourseCheckoutButton";

type PublicCourseLesson = {
  id: string;
  title: string;
  sort_order: number;
};

type PublicCourseModule = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  course_lesson: PublicCourseLesson[];
};

type PublicCourse = {
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
  course_module: PublicCourseModule[];
};

function formatUsd(cents: number | null) {
  if (!cents) return "Price coming soon";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

async function getPublicCourseBySlug(slug: string) {
  const supabase = asLooseSupabaseClient(await createClient());
  const { data, error } = await supabase
    .from("course")
    .select<PublicCourse>(
      `id, title, slug, description, cover_image_url, tier_min, price_cents, stripe_price_id, is_standalone_purchasable, points_price, points_unlock_enabled,
      course_module(
        id, title, description, sort_order,
        course_lesson(id, title, sort_order)
      )`
    )
    .eq("slug", slug)
    .eq("status", "published")
    .eq("is_standalone_purchasable", true)
    .maybeSingle();

  if (error) {
    console.error("[courses/detail] course lookup failed:", error.message);
    return null;
  }

  return (data as PublicCourse | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPublicCourseBySlug(slug);

  if (!course) {
    return {
      title: "Course — Positives",
    };
  }

  return {
    title: `${course.title} — Positives`,
    description:
      course.description ??
      `Explore ${course.title} and keep it in your Positives library permanently.`,
  };
}

export default async function PublicCourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getPublicCourseBySlug(slug);

  if (!course) notFound();

  const supabase = asLooseSupabaseClient(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = user
    ? await supabase
        .from("member")
        .select<{ id: string; subscription_status: string | null }>("id, subscription_status")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: entitlement } = member
    ? await supabase
        .from("course_entitlement")
        .select<{ id: string }>("id")
        .eq("member_id", member.id)
        .eq("course_id", course.id)
        .eq("status", "active")
        .maybeSingle()
    : { data: null };

  const owned = Boolean(entitlement);
  const activeSubscriber =
    member?.subscription_status === "active" || member?.subscription_status === "trialing";
  const modules = [...(course.course_module ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const lessonCount = modules.reduce(
    (sum, module) => sum + (module.course_lesson?.length ?? 0),
    0
  );
  const hasPrice = Boolean(course.stripe_price_id && course.price_cents);

  return (
    <main style={{ background: "#FAFAF8", minHeight: "100dvh" }}>
      <section
        style={{
          maxWidth: "72rem",
          margin: "0 auto",
          padding: "clamp(2rem, 5vw, 4.5rem) 1.5rem 4rem",
        }}
      >
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ marginBottom: "1.5rem" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to courses
        </Link>

        <section
          className="surface-card surface-card--editorial"
          style={{
            padding: "clamp(1.25rem, 4vw, 2rem)",
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(18rem, 0.75fr)",
          }}
        >
          <div style={{ display: "grid", gap: "1rem" }}>
            <p
              className="ui-section-eyebrow"
              style={{ marginBottom: 0 }}
            >
              Positives Course
            </p>
            <h1 className="heading-balance font-heading text-4xl font-bold tracking-[-0.05em] text-foreground sm:text-5xl">
              {course.title}
            </h1>
            <p style={{ color: "#4C5561", lineHeight: 1.75, fontSize: "1rem", maxWidth: "42rem" }}>
              {course.description ??
                "A focused Positives deep dive you can return to whenever you want extra support, clarity, and structure around this topic."}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
              <span className="admin-badge admin-badge--review">Permanent library access</span>
              <span className="admin-badge admin-badge--active">
                {modules.length} module{modules.length === 1 ? "" : "s"}
              </span>
              <span className="admin-badge admin-badge--l1">
                {lessonCount} lesson{lessonCount === 1 ? "" : "s"}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gap: "0.85rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              }}
            >
              {[
                {
                  title: "A focused deep dive",
                  body: "Use this when you want more than the daily practice without turning your growth into a giant program.",
                },
                {
                  title: "Come back at your pace",
                  body: "Your access stays in your library, so you can revisit the material whenever you need it.",
                },
                {
                  title: "Support that fits real life",
                  body: "The goal is steady, meaningful progress, not pressure to finish everything all at once.",
                },
              ].map((item) => (
                <article
                  key={item.title}
                  className="surface-card"
                  style={{ padding: "1rem", background: "rgba(255,255,255,0.82)" }}
                >
                  <h2 className="heading-balance font-heading text-xl font-semibold tracking-[-0.03em] text-foreground">
                    {item.title}
                  </h2>
                  <p style={{ color: "#68707A", lineHeight: 1.65, marginTop: "0.45rem" }}>
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside style={{ display: "grid", gap: "1rem", alignSelf: "start" }}>
            <div
              className="surface-card"
              style={{
                padding: "1rem",
                background: course.cover_image_url
                  ? `linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.16)), center / cover url(${course.cover_image_url})`
                  : "linear-gradient(145deg, rgba(46,196,182,0.18), rgba(47,111,237,0.14))",
                minHeight: "13rem",
                borderRadius: "1.25rem",
              }}
            />
            <div className="surface-card" style={{ padding: "1.15rem" }}>
              <p style={{ color: "#121417", fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.35rem" }}>
                {formatUsd(course.price_cents)}
              </p>
              <p style={{ color: "#68707A", lineHeight: 1.65, marginBottom: "0.9rem" }}>
                One-time purchase. Keep this course in your Positives library permanently.
              </p>
              {owned ? (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <p style={{ color: "#146C5F", fontSize: "0.9rem", lineHeight: 1.6 }}>
                    You already own this course. It is ready whenever you want to come back to it.
                  </p>
                  <Link href={`/library/courses/${course.slug}`} className="btn-primary" style={{ justifyContent: "center" }}>
                    Open in library
                  </Link>
                </div>
              ) : (
                <>
                  <CourseCheckoutButton
                    courseId={course.id}
                    disabled={!hasPrice}
                    signedIn={Boolean(user)}
                    priceLabel={formatUsd(course.price_cents)}
                    sourcePath={`/courses/${course.slug}`}
                  />
                  {!hasPrice ? (
                    <p style={{ color: "#68707A", fontSize: "0.82rem", lineHeight: 1.55, marginTop: "0.65rem" }}>
                      This course page is ready, but pricing has not been connected in Stripe yet.
                    </p>
                  ) : null}
                </>
              )}
              {activeSubscriber && course.points_unlock_enabled ? (
                <p style={{ color: "#68707A", fontSize: "0.82rem", lineHeight: 1.55, marginTop: "0.8rem" }}>
                  Subscriber point unlock:{" "}
                  {course.points_price ?? Math.round((course.price_cents ?? 0) / 100)} points
                </p>
              ) : null}
            </div>
          </aside>
        </section>

        <section
          style={{
            marginTop: "1.5rem",
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "minmax(0, 1fr) minmax(18rem, 0.78fr)",
          }}
        >
          <article className="surface-card" style={{ padding: "1.25rem" }}>
            <p className="ui-section-eyebrow" style={{ marginBottom: "0.5rem" }}>
              Who this is for
            </p>
            <h2 className="heading-balance font-heading text-2xl font-bold tracking-[-0.04em] text-foreground">
              A calmer way to go deeper.
            </h2>
            <p style={{ color: "#68707A", lineHeight: 1.7, marginTop: "0.7rem" }}>
              This course is for members and guests who want more structure around this topic
              without losing the gentle, repeatable rhythm that makes Positives work in real life.
            </p>
            <ul style={{ marginTop: "1rem", display: "grid", gap: "0.7rem", color: "#4C5561", paddingLeft: "1.2rem" }}>
              <li>If you want practical guidance you can actually return to.</li>
              <li>If you want more support than a single daily practice, but less overwhelm than a giant curriculum.</li>
              <li>If you want a resource that can stay with you instead of expiring at the end of a promotion.</li>
            </ul>
          </article>

          <article className="surface-card surface-card--editorial" style={{ padding: "1.25rem" }}>
            <p className="ui-section-eyebrow" style={{ marginBottom: "0.5rem" }}>
              Permanent access
            </p>
            <h2 className="heading-balance font-heading text-2xl font-bold tracking-[-0.04em] text-foreground">
              Keep it in your library.
            </h2>
            <p style={{ color: "#68707A", lineHeight: 1.7, marginTop: "0.7rem" }}>
              Purchased courses stay with you. Even if your membership changes later, your owned
              courses remain available in your Positives library.
            </p>
          </article>
        </section>

        <section className="surface-card" style={{ padding: "1.25rem", marginTop: "1.5rem" }}>
          <p className="ui-section-eyebrow" style={{ marginBottom: "0.5rem" }}>
            Course outline
          </p>
          <h2 className="heading-balance font-heading text-2xl font-bold tracking-[-0.04em] text-foreground">
            What you’ll find inside
          </h2>
          <p style={{ color: "#68707A", lineHeight: 1.7, marginTop: "0.7rem", marginBottom: "1rem" }}>
            Preview the structure before you buy. Titles are visible here; lesson content stays
            inside the course once it is in your library.
          </p>

          {modules.length > 0 ? (
            <div style={{ display: "grid", gap: "0.9rem" }}>
              {modules.map((module, index) => {
                const lessons = [...(module.course_lesson ?? [])].sort((a, b) => a.sort_order - b.sort_order);
                return (
                  <article
                    key={module.id}
                    className="surface-card surface-card--editorial"
                    style={{ padding: "1rem" }}
                  >
                    <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: "2rem",
                          height: "2rem",
                          borderRadius: "999px",
                          background: "rgba(46,196,182,0.12)",
                          color: "#146C5F",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 className="heading-balance font-heading text-xl font-semibold tracking-[-0.03em] text-foreground">
                          {module.title}
                        </h3>
                        {module.description ? (
                          <p style={{ color: "#68707A", lineHeight: 1.65, marginTop: "0.45rem" }}>
                            {module.description}
                          </p>
                        ) : null}
                        <ol style={{ marginTop: "0.9rem", display: "grid", gap: "0.5rem", paddingLeft: "1.15rem", color: "#4C5561" }}>
                          {lessons.map((lesson) => (
                            <li key={lesson.id}>{lesson.title}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="surface-card" style={{ padding: "1rem", color: "#68707A" }}>
              The full outline is being prepared.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
