"use server";

import { randomUUID } from "node:crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sanitizeCourseHtml } from "@/lib/content/sanitize-course-html";
import { getStripe } from "@/lib/stripe/config";
import { getS3MediaConfig, mediaObjectKey, putMediaObject } from "@/lib/media/s3";

/**
 * app/admin/courses/actions.ts
 *
 * Server actions for the 4-level Course hierarchy:
 *   Course → Module (LD Section) → Lesson (LD Lesson) → Session (LD Topic)
 *
 * Also handles LearnDash WordPress import with full content extraction.
 */

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#038;/g, "&");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getRenderedField(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "rendered" in value) {
    const rendered = (value as { rendered?: unknown }).rendered;
    return typeof rendered === "string" ? rendered : "";
  }
  return "";
}

function cleanImportedHtml(html: string): string | null {
  return sanitizeCourseHtml(decodeHtmlEntities(html));
}

function cleanFormValue(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim() ?? "";
  return value.length > 0 ? value : null;
}

async function getCourseRow(courseId: string) {
  const { data, error } = await adminClient()
    .from("course")
    .select("id, title, description, slug, stripe_product_id, stripe_price_id, is_standalone_purchasable")
    .eq("id", courseId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Course not found.");
  }

  return data as {
    id: string;
    title: string;
    description: string | null;
    slug: string | null;
    stripe_product_id: string | null;
    stripe_price_id: string | null;
    is_standalone_purchasable: boolean;
  };
}

async function syncCourseToStripePrice(args: {
  courseId: string;
  stripePriceId: string;
  standalonePurchasable?: boolean;
}) {
  const stripe = getStripe();
  const price = await stripe.prices.retrieve(args.stripePriceId, {
    expand: ["product"],
  });

  if (!price.active) {
    throw new Error("This Stripe price is inactive. Attach an active one-time price instead.");
  }

  if (price.type !== "one_time") {
    throw new Error("Standalone courses require a one-time Stripe price.");
  }

  if (!price.unit_amount) {
    throw new Error("This Stripe price does not have a fixed amount.");
  }

  const productId =
    typeof price.product === "string" ? price.product : price.product?.id ?? null;

  if (!productId) {
    throw new Error("This Stripe price is missing a product.");
  }

  await adminClient()
    .from("course")
    .update({
      stripe_product_id: productId,
      stripe_price_id: price.id,
      price_cents: price.unit_amount,
      is_standalone_purchasable: args.standalonePurchasable ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.courseId);

  return {
    productId,
    priceId: price.id,
    amountCents: price.unit_amount,
    currency: price.currency,
  };
}

async function ensureCourseStripeProduct(courseId: string) {
  const stripe = getStripe();
  const course = await getCourseRow(courseId);

  if (course.stripe_product_id) {
    await stripe.products.update(course.stripe_product_id, {
      name: course.title,
      description: course.description ?? undefined,
      metadata: {
        course_id: course.id,
        course_slug: course.slug ?? "",
        source: "positives-course-editor",
      },
    });
    return course.stripe_product_id;
  }

  const product = await stripe.products.create({
    name: course.title,
    description: course.description ?? undefined,
    metadata: {
      course_id: course.id,
      course_slug: course.slug ?? "",
      source: "positives-course-editor",
    },
  });

  await adminClient()
    .from("course")
    .update({
      stripe_product_id: product.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", course.id);

  return product.id;
}

async function fetchJsonWithTimeout<T>(
  input: string,
  init: RequestInit,
  timeoutMs = 12000
): Promise<{ ok: boolean; status: number; statusText: string; data: T | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    const data = response.ok ? ((await response.json()) as T) : null;

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getWpMediaUrl(
  baseUrl: string,
  headers: Record<string, string>,
  mediaId: unknown
): Promise<string | null> {
  const id = Number(mediaId);
  if (!Number.isFinite(id) || id <= 0) return null;

  try {
    const res = await fetchJsonWithTimeout<Record<string, unknown>>(
      `${baseUrl}/wp-json/wp/v2/media/${id}`,
      { headers },
      8000
    );
    if (!res.ok || !res.data) return null;
    const sourceUrl = res.data.source_url;
    return typeof sourceUrl === "string" && sourceUrl.startsWith("http") ? sourceUrl : null;
  } catch {
    return null;
  }
}

/** Returns pre-configured LearnDash credentials from env vars (server-only). */
export async function getLearnDashDefaults(): Promise<{
  wpUrl: string;
  wpUser: string;
  wpPassword: string;
  configured: boolean;
}> {
  await requireAdmin();
  const wpUrl = process.env.LEARNDASH_WP_URL ?? "";
  const wpUser = process.env.LEARNDASH_WP_USER ?? "";
  const wpPassword = process.env.LEARNDASH_WP_APP_PASSWORD ?? "";
  return { wpUrl, wpUser, wpPassword, configured: !!(wpUrl && wpUser && wpPassword) };
}

/**
 * Returns a Set of LearnDash course IDs that have already been imported.
 * We detect these by reading admin_notes for the pattern "Imported from LearnDash ID: XXXXX".
 */
export async function getImportedLearnDashIds(): Promise<number[]> {
  await requireAdmin();
  const { data } = await adminClient()
    .from("course")
    .select("admin_notes")
    .like("admin_notes", "Imported from LearnDash ID:%");

  const imported: number[] = [];
  for (const row of data ?? []) {
    const match = String(row.admin_notes ?? "").match(/Imported from LearnDash ID:\s*(\d+)/);
    if (match) imported.push(parseInt(match[1], 10));
  }
  return imported;
}

// ─── Course CRUD ─────────────────────────────────────────────────────────────

export async function createCourse(formData: FormData) {
  await requireAdmin();
  const title = formData.get("title")?.toString().trim();
  if (!title) redirect("/admin/courses?error=title_required");

  const description = formData.get("description")?.toString().trim() || null;
  const status = formData.get("status")?.toString() || "draft";
  const slug = slugify(title!);

  const supabase = adminClient();
  const { data, error } = await supabase
    .from("course")
    .insert({ title, slug, description, status })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createCourse] Error:", error?.message);
    redirect("/admin/courses?error=create_failed");
  }

  redirect(`/admin/courses/${data.id}`);
}

export async function updateCourse(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) redirect("/admin/courses?error=missing_id");

  const title = formData.get("title")?.toString().trim();
  if (!title) redirect(`/admin/courses/${id}?error=title_required`);

  const supabase = adminClient();
  await supabase
    .from("course")
    .update({
      title,
      slug: slugify(title!),
      description: formData.get("description")?.toString().trim() || null,
      short_description: formData.get("short_description")?.toString().trim() || formData.get("description")?.toString().trim() || null,
      full_description: sanitizeCourseHtml(formData.get("full_description")?.toString().trim() || null),
      cover_image_url: formData.get("cover_image_url")?.toString().trim() || null,
      promo_video_url: formData.get("promo_video_url")?.toString().trim() || null,
      estimated_duration_seconds: formData.get("estimated_duration_seconds")?.toString()
        ? parseInt(formData.get("estimated_duration_seconds")!.toString(), 10)
        : null,
      category: formData.get("category")?.toString().trim() || null,
      access_type: formData.get("access_type")?.toString() || "membership_included",
      visibility: formData.get("visibility")?.toString() || "public",
      status: formData.get("status")?.toString() || "draft",
      is_standalone_purchasable:
        formData.get("is_standalone_purchasable")?.toString() === "true",
      points_unlock_enabled:
        formData.get("points_unlock_enabled")?.toString() === "true",
      points_price: formData.get("points_price")?.toString()
        ? parseInt(formData.get("points_price")!.toString(), 10)
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id!);

  const course = await getCourseRow(id);
  revalidatePath(`/admin/courses/${id}`);
  revalidatePath("/courses");
  if (course.slug) {
    revalidatePath(`/courses/${course.slug}`);
  }
  redirect(`/admin/courses/${id}?success=updated`);
}

export async function attachExistingCourseStripePrice(formData: FormData) {
  await requireAdmin();
  const courseId = cleanFormValue(formData, "course_id");
  const stripePriceId = cleanFormValue(formData, "stripe_price_id");

  if (!courseId || !stripePriceId) {
    redirect(`/admin/courses/${courseId ?? ""}?error=missing_fields`);
  }

  try {
    await syncCourseToStripePrice({
      courseId,
      stripePriceId,
      standalonePurchasable: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "stripe_attach_failed";
    redirect(`/admin/courses/${courseId}?error=${message}`);
  }

  const course = await getCourseRow(courseId);
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/courses");
  if (course.slug) {
    revalidatePath(`/courses/${course.slug}`);
  }
  redirect(`/admin/courses/${courseId}?success=stripe_price_attached`);
}

export async function createCourseStripePrice(formData: FormData) {
  await requireAdmin();
  const courseId = cleanFormValue(formData, "course_id");
  const amountRaw = cleanFormValue(formData, "price_cents");

  if (!courseId || !amountRaw) {
    redirect(`/admin/courses/${courseId ?? ""}?error=missing_fields`);
  }

  const amountCents = parseInt(amountRaw, 10);
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    redirect(`/admin/courses/${courseId}?error=invalid_price`);
  }

  try {
    const productId = await ensureCourseStripeProduct(courseId);
    const stripe = getStripe();
    const price = await stripe.prices.create({
      currency: "usd",
      unit_amount: amountCents,
      product: productId,
      metadata: {
        course_id: courseId,
        source: "positives-course-editor",
      },
    });

    await syncCourseToStripePrice({
      courseId,
      stripePriceId: price.id,
      standalonePurchasable: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "stripe_price_create_failed";
    redirect(`/admin/courses/${courseId}?error=${message}`);
  }

  const course = await getCourseRow(courseId);
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/courses");
  if (course.slug) {
    revalidatePath(`/courses/${course.slug}`);
  }
  redirect(`/admin/courses/${courseId}?success=stripe_price_created`);
}

export async function deleteCourse(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  await adminClient().from("course").delete().eq("id", id);
  revalidatePath("/admin/courses");
  redirect("/admin/courses?success=deleted");
}

// ─── Module CRUD ─────────────────────────────────────────────────────────────

export async function createModule(formData: FormData) {
  await requireAdmin();
  const courseId = formData.get("course_id")?.toString();
  const title = formData.get("title")?.toString().trim();
  if (!courseId || !title) redirect(`/admin/courses/${courseId ?? ""}?error=missing_fields`);

  const supabase = adminClient();
  const { count } = await supabase
    .from("course_module")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId!);

  await supabase.from("course_module").insert({
    course_id: courseId,
    title,
    description: formData.get("description")?.toString().trim() || null,
    sort_order: (count ?? 0) + 1,
  });

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=module_created`);
}

export async function updateModule(formData: FormData) {
  await requireAdmin();
  const moduleId = formData.get("module_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  const title = formData.get("title")?.toString().trim();
  if (!moduleId || !title) redirect(`/admin/courses/${courseId ?? ""}?error=missing_fields`);

  await adminClient()
    .from("course_module")
    .update({ title, description: formData.get("description")?.toString().trim() || null })
    .eq("id", moduleId!);

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=module_updated`);
}

export async function deleteModule(formData: FormData) {
  await requireAdmin();
  const moduleId = formData.get("module_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  if (!moduleId) return;
  await adminClient().from("course_module").delete().eq("id", moduleId);
  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=module_deleted`);
}

// ─── Lesson CRUD ─────────────────────────────────────────────────────────────

export async function createLesson(formData: FormData) {
  await requireAdmin();
  const moduleId = formData.get("module_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  const title = formData.get("title")?.toString().trim();
  if (!moduleId || !title) redirect(`/admin/courses/${courseId ?? ""}?error=missing_fields`);

  const supabase = adminClient();
  const { count } = await supabase
    .from("course_lesson")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId!);

  await supabase.from("course_lesson").insert({
    module_id: moduleId,
    title,
    slug: slugify(title),
    description: formData.get("description")?.toString().trim() || null,
    body: sanitizeCourseHtml(formData.get("body")?.toString().trim() || null),
    video_url: formData.get("video_url")?.toString().trim() || null,
    audio_url: formData.get("audio_url")?.toString().trim() || null,
    duration_seconds: formData.get("duration_seconds")?.toString()
      ? parseInt(formData.get("duration_seconds")!.toString(), 10) : null,
    resources: formData.get("resources")?.toString().trim() || null,
    is_preview: formData.get("is_preview")?.toString() === "true",
    status: formData.get("status")?.toString() || "published",
    sort_order: (count ?? 0) + 1,
  });

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=lesson_created`);
}

export async function updateLesson(formData: FormData) {
  await requireAdmin();
  const lessonId = formData.get("lesson_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  const title = formData.get("title")?.toString().trim();
  if (!lessonId || !title) redirect(`/admin/courses/${courseId ?? ""}?error=missing_fields`);

  await adminClient()
    .from("course_lesson")
    .update({
      title,
      slug: slugify(title),
      description: formData.get("description")?.toString().trim() || null,
      body: sanitizeCourseHtml(formData.get("body")?.toString().trim() || null),
      video_url: formData.get("video_url")?.toString().trim() || null,
      audio_url: formData.get("audio_url")?.toString().trim() || null,
      duration_seconds: formData.get("duration_seconds")?.toString()
        ? parseInt(formData.get("duration_seconds")!.toString(), 10) : null,
      resources: formData.get("resources")?.toString().trim() || null,
      is_preview: formData.get("is_preview")?.toString() === "true",
      status: formData.get("status")?.toString() || "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", lessonId!);

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=lesson_updated`);
}

export async function deleteLesson(formData: FormData) {
  await requireAdmin();
  const lessonId = formData.get("lesson_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  if (!lessonId) return;
  await adminClient().from("course_lesson").delete().eq("id", lessonId);
  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=lesson_deleted`);
}

// ─── Session (Topic) CRUD ─────────────────────────────────────────────────────

export async function createSession(formData: FormData) {
  await requireAdmin();
  const lessonId = formData.get("lesson_id")?.toString();
  const moduleId = formData.get("module_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  const title = formData.get("title")?.toString().trim();
  if (!lessonId || !moduleId || !title) {
    redirect(`/admin/courses/${courseId ?? ""}?error=missing_fields`);
  }

  const supabase = adminClient();
  const { count } = await supabase
    .from("course_session")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId!);

  await supabase.from("course_session").insert({
    lesson_id: lessonId,
    module_id: moduleId,
    title,
    description: formData.get("description")?.toString().trim() || null,
    body: sanitizeCourseHtml(formData.get("body")?.toString().trim() || null),
    video_url: formData.get("video_url")?.toString().trim() || null,
    duration_seconds: formData.get("duration_seconds")?.toString()
      ? parseInt(formData.get("duration_seconds")!.toString(), 10) : null,
    resources: formData.get("resources")?.toString().trim() || null,
    sort_order: (count ?? 0) + 1,
  });

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=session_created`);
}

export async function updateSession(formData: FormData) {
  await requireAdmin();
  const sessionId = formData.get("session_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  const title = formData.get("title")?.toString().trim();
  if (!sessionId || !title) redirect(`/admin/courses/${courseId ?? ""}?error=missing_fields`);

  await adminClient()
    .from("course_session")
    .update({
      title,
      description: formData.get("description")?.toString().trim() || null,
      body: sanitizeCourseHtml(formData.get("body")?.toString().trim() || null),
      video_url: formData.get("video_url")?.toString().trim() || null,
      duration_seconds: formData.get("duration_seconds")?.toString()
        ? parseInt(formData.get("duration_seconds")!.toString(), 10) : null,
      resources: formData.get("resources")?.toString().trim() || null,
    })
    .eq("id", sessionId!);

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=session_updated`);
}

export async function deleteSession(formData: FormData) {
  await requireAdmin();
  const sessionId = formData.get("session_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  if (!sessionId) return;
  await adminClient().from("course_session").delete().eq("id", sessionId);
  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=session_deleted`);
}

// ─── LearnDash Import ─────────────────────────────────────────────────────────

export type LearnDashImportResult = {
  success: boolean;
  coursesImported: number;
  modulesImported: number;
  lessonsImported: number;
  sessionsImported: number;
  resourcesCopied: number;
  resourcesLinked: number;
  resourceFailures: number;
  warnings: string[];
  errors: string[];
};

/** Try v2, fall back to v1 */
async function detectLdApiVersion(baseUrl: string, headers: Record<string, string>): Promise<string> {
  const v2 = await fetchJsonWithTimeout<unknown[]>(
    `${baseUrl}/wp-json/ldlms/v2/sfwd-courses?per_page=1`,
    { headers },
    8000
  ).catch(() => null);
  if (v2?.ok) return "v2";

  const v1 = await fetchJsonWithTimeout<unknown[]>(
    `${baseUrl}/wp-json/ldlms/v1/sfwd-courses?per_page=1`,
    { headers },
    8000
  ).catch(() => null);
  if (v1?.ok) return "v1";

  return "v1";
}

/**
 * Extract the Vimeo/YouTube video URL from a lesson/topic's Elementor data.
 * Returns the canonical URL (e.g. https://vimeo.com/123456) or null.
 */
function extractElementorVideo(elementorData: unknown): string | null {
  if (!elementorData || !Array.isArray(elementorData)) return null;

  const placeholderVideoRe = /XHOmBV4js_E|placeholder/i;

  function normalizeVideoCandidate(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const candidate = decodeHtmlEntities(value).trim();
    if (!candidate || placeholderVideoRe.test(candidate)) return null;

    const embedded = extractEmbeddedVideoUrl(candidate);
    if (embedded) return embedded;

    if (/^https?:\/\//i.test(candidate) && /\.(mp4|mov|m4v|webm)(?:\?|#|$)/i.test(candidate)) {
      return candidate;
    }

    return null;
  }

  function scanSettingsForVideoCandidate(
    value: unknown,
    keyHint = ""
  ): string | null {
    if (typeof value === "string") {
      const normalizedKey = keyHint.toLowerCase();
      const looksVideoish =
        !normalizedKey ||
        /(video|embed|hosted|external|source|url|link|file|mp4|mov|webm|youtube|vimeo)/i.test(
          normalizedKey
        );
      return looksVideoish ? normalizeVideoCandidate(value) : null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = scanSettingsForVideoCandidate(item, keyHint);
        if (found) return found;
      }
      return null;
    }

    if (value && typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
        const found = scanSettingsForVideoCandidate(childValue, childKey);
        if (found) return found;
      }
    }

    return null;
  }

  function walk(elements: unknown[]): string | null {
    for (const el of elements) {
      if (typeof el !== "object" || el === null) continue;
      const elem = el as Record<string, unknown>;

      if (elem.widgetType === "video") {
        const s = (elem.settings ?? {}) as Record<string, unknown>;
        const directKeys = [
          "vimeo_url",
          "youtube_url",
          "dailymotion_url",
          "hosted_url",
          "external_url",
          "insert_url",
          "url",
        ];

        for (const key of directKeys) {
          const found = normalizeVideoCandidate(s[key]);
          if (found) return found;
        }

        for (const value of Object.values(s)) {
          if (value && typeof value === "object" && "url" in value) {
            const found = normalizeVideoCandidate((value as { url?: unknown }).url);
            if (found) return found;
          }
        }
      }

      if (elem.widgetType === "html" || elem.widgetType === "shortcode") {
        const s = (elem.settings ?? {}) as Record<string, unknown>;
        const found = extractEmbeddedVideoUrl(
          typeof s.html === "string" ? s.html : null,
          typeof s.shortcode === "string" ? s.shortcode : null
        );
        if (found) return found;
      }

      const genericSettingsHit = scanSettingsForVideoCandidate(elem.settings ?? null);
      if (genericSettingsHit) return genericSettingsHit;

      if (Array.isArray(elem.elements)) {
        const found = walk(elem.elements as unknown[]);
        if (found) return found;
      }
    }
    return null;
  }

  return walk(elementorData as unknown[]);
}

/**
 * Extract meaningful fallback body HTML from common Elementor content widgets.
 */
function extractElementorBody(elementorData: unknown): string | null {
  if (!elementorData || !Array.isArray(elementorData)) return null;
  const parts: string[] = [];

  function pushHtmlFragment(html: string | null | undefined) {
    if (!html) return;
    const cleaned = cleanImportedHtml(html);
    if (cleaned && stripHtml(cleaned).length > 10) {
      parts.push(cleaned);
    }
  }

  function pushPlainTextAsHtml(
    value: unknown,
    tag: "p" | "h2" | "h3" | "li" = "p"
  ) {
    if (typeof value !== "string") return;
    const text = stripHtml(decodeHtmlEntities(value)).trim();
    if (!text) return;
    parts.push(`<${tag}>${escapeHtml(text)}</${tag}>`);
  }

  function walk(elements: unknown[]) {
    for (const el of elements) {
      if (typeof el !== "object" || el === null) continue;
      const elem = el as Record<string, unknown>;
      const s = (elem.settings ?? {}) as Record<string, unknown>;

      if (elem.widgetType === "text-editor") {
        pushHtmlFragment(typeof s.editor === "string" ? s.editor : null);
      }

      if (elem.widgetType === "heading") {
        pushPlainTextAsHtml(s.title, "h2");
      }

      if (elem.widgetType === "button") {
        const text = typeof s.text === "string" ? stripHtml(decodeHtmlEntities(s.text)).trim() : "";
        const link = s.link && typeof s.link === "object" ? (s.link as { url?: unknown }).url : null;
        const url = typeof link === "string" ? decodeHtmlEntities(link).trim() : "";
        if (text && url.startsWith("http")) {
          parts.push(`<p><a href="${escapeHtml(url)}">${escapeHtml(text)}</a></p>`);
        }
      }

      if (elem.widgetType === "icon-list") {
        const items = Array.isArray(s.icon_list) ? s.icon_list : [];
        const listItems = items
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const listItem = item as Record<string, unknown>;
            const text = typeof listItem.text === "string"
              ? stripHtml(decodeHtmlEntities(listItem.text)).trim()
              : "";
            const link = listItem.link && typeof listItem.link === "object"
              ? (listItem.link as { url?: unknown }).url
              : null;
            const url = typeof link === "string" ? decodeHtmlEntities(link).trim() : "";

            if (!text) return null;
            if (url.startsWith("http")) {
              return `<li><a href="${escapeHtml(url)}">${escapeHtml(text)}</a></li>`;
            }
            return `<li>${escapeHtml(text)}</li>`;
          })
          .filter(Boolean);

        if (listItems.length > 0) {
          parts.push(`<ul>${listItems.join("")}</ul>`);
        }
      }

      if (elem.widgetType === "accordion" || elem.widgetType === "toggle") {
        const items = Array.isArray(s.tabs) ? s.tabs : [];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const section = item as Record<string, unknown>;
          pushPlainTextAsHtml(section.title, "h3");
          pushHtmlFragment(typeof section.content === "string" ? section.content : null);
        }
      }

      if (elem.widgetType === "tabs") {
        const items = Array.isArray(s.tabs) ? s.tabs : [];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const tab = item as Record<string, unknown>;
          pushPlainTextAsHtml(tab.tab_title, "h3");
          pushHtmlFragment(typeof tab.tab_content === "string" ? tab.tab_content : null);
        }
      }

      if (elem.widgetType === "image-box" || elem.widgetType === "call-to-action") {
        pushPlainTextAsHtml(s.title_text ?? s.title, "h3");
        pushHtmlFragment(typeof s.description_text === "string" ? s.description_text : null);
      }

      if (elem.widgetType === "text-path" || elem.widgetType === "animated-headline") {
        pushPlainTextAsHtml(s.title ?? s.text ?? s.before_text ?? s.highlighted_text, "h3");
      }

      if (Array.isArray(elem.elements)) walk(elem.elements as unknown[]);
    }
  }

  walk(elementorData as unknown[]);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

function resolveImportedBodyHtml(renderedContent: string, elementorData: unknown): string | null {
  const renderedBody = cleanImportedHtml(renderedContent);
  const elementorBody = extractElementorBody(elementorData);

  if (renderedBody && elementorBody) {
    return stripHtml(renderedBody).length >= stripHtml(elementorBody).length ? renderedBody : elementorBody;
  }

  return renderedBody || elementorBody || (stripHtml(decodeHtmlEntities(renderedContent)) || null);
}

function extractEmbeddedVideoUrl(...values: Array<string | null | undefined>): string | null {
  const text = values.filter(Boolean).join("\n");
  const patterns = [
    /https?:\/\/(?:www\.)?vimeo\.com\/\d+[^\s"'<>)]*/i,
    /https?:\/\/player\.vimeo\.com\/video\/\d+[^\s"'<>)]*/i,
    /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+[^\s"'<>)]*/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return decodeHtmlEntities(match[0]).replace(/[),.;]+$/, "");
  }

  return null;
}

function resolveImportedVideoUrl(params: {
  learndashVideoUrl?: unknown;
  elementorData: unknown;
  renderedContent?: string | null;
  materials?: string | null;
}) {
  const nativeVideo =
    typeof params.learndashVideoUrl === "string" && params.learndashVideoUrl.trim().startsWith("http")
      ? params.learndashVideoUrl.trim()
      : null;

  return (
    nativeVideo ||
    extractElementorVideo(params.elementorData) ||
    extractEmbeddedVideoUrl(params.renderedContent, params.materials)
  );
}

type ImportedResourceItem = {
  label: string;
  url: string;
  type: string;
};

type ImportResourceStats = {
  resourcesCopied: number;
  resourcesLinked: number;
  resourceFailures: number;
  warnings: string[];
};

const MAX_IMPORTED_RESOURCE_BYTES = 50 * 1024 * 1024;

function resourceKind(type: string, contentType?: string | null) {
  if (type === "audio" || contentType?.startsWith("audio/")) return "audio";
  if (type === "video" || contentType?.startsWith("video/")) return "video";
  if (type === "pdf" || type === "document" || contentType === "application/pdf") return "document";
  return "other";
}

function safeResourceFilename(value: string) {
  return (value.split("/").pop()?.split("?")[0] || "course-resource")
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "course-resource";
}

function inferResourceType(url: string, fallback = "file") {
  let ext = "";
  try {
    ext = new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";
  } catch {
    ext = url.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  }

  if (ext === "pdf") return "pdf";
  if (ext === "mp3" || ext === "m4a" || ext === "wav" || ext === "aac") return "audio";
  if (ext === "mp4" || ext === "mov" || ext === "m4v" || ext === "webm") return "video";
  if (ext === "zip") return "download";
  if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)) return "document";
  return fallback;
}

/**
 * Extract resource URLs (PDFs, audio files, worksheets, S3 files) from
 * LearnDash materials, rendered HTML, download shortcodes, and Elementor data.
 */
function extractResourceItems(...sources: Array<string | null | undefined>): ImportedResourceItem[] {
  const resources: ImportedResourceItem[] = [];
  const seen = new Set<string>();
  const sourceText = sources.filter(Boolean).join("\n");

  function isLikelyResourceUrl(url: string) {
    return (
      /\.(pdf|mp3|m4a|mp4|mov|m4v|webm|zip|docx?|pptx?|xlsx?)(?:\?|#|$)/i.test(url) ||
      /s3|amazonaws|wp-content\/uploads|drive\.google\.com|dropbox\.com|box\.com/i.test(url)
    );
  }

  function add(url: string, label = "", type = "file") {
    const clean = decodeHtmlEntities(url).trim().replace(/[),.;]+$/, "");
    if (seen.has(clean) || !clean.startsWith("http")) return;
    seen.add(clean);
    const cleanLabel = stripHtml(decodeHtmlEntities(label)).trim();
    resources.push({
      label: cleanLabel || clean.split("/").pop()?.split("?")[0] || "Resource",
      url: clean,
      type: inferResourceType(clean, type),
    });
  }

  // 1. Parse [easy_media_download] and similar shortcode attributes in any order.
  const shortcodeRe = /\[[^\]]*(?:easy_media_download|download)[^\]]*\]/gi;
  let m;
  while ((m = shortcodeRe.exec(sourceText)) !== null) {
    const shortcode = m[0];
    const attrs = new Map<string, string>();
    const attrRe = /([a-z0-9_-]+)=(?:"|&quot;|\\")([^"\\\]]+)(?:"|&quot;|\\")/gi;
    let attrMatch;
    while ((attrMatch = attrRe.exec(shortcode)) !== null) {
      attrs.set(attrMatch[1].toLowerCase(), attrMatch[2]);
    }
    const url = attrs.get("url") ?? attrs.get("file") ?? attrs.get("href");
    const label = attrs.get("text") ?? attrs.get("label") ?? attrs.get("title") ?? "";
    if (url) add(url, label);
  }

  // 2. Scan anchor tags and keep labels from link text.
  const anchorRe = /<a\b[^>]*href=(?:"|')([^"']+)(?:"|')[^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = anchorRe.exec(sourceText)) !== null) {
    const url = m[1];
    const isLikelyResource =
      isLikelyResourceUrl(url) ||
      sourceText.includes("materials");
    if (isLikelyResource) add(url, m[2]);
  }

  // 3. Resource-looking raw URLs.
  const rawResourceRe = /(https?:\/\/[^"\s<>]*(?:\.(?:pdf|mp3|m4a|mp4|mov|m4v|webm|zip|docx?|pptx?|xlsx?)(?:\?[^"\s<>]*)?|s3[^"\s<>]*|amazonaws[^"\s<>]*|wp-content\/uploads[^"\s<>]*|drive\.google\.com[^"\s<>]*|dropbox\.com[^"\s<>]*|box\.com[^"\s<>]*))/gi;
  while ((m = rawResourceRe.exec(sourceText)) !== null) add(m[1]);

  // 4. Elementor button/file widgets often store resource links in JSON objects.
  const elementorLinkRe = /"(?:url|href)"\s*:\s*"([^"]+)"/gi;
  while ((m = elementorLinkRe.exec(sourceText)) !== null) {
    const url = m[1].replace(/\\\//g, "/");
    if (isLikelyResourceUrl(url)) add(url);
  }

  return resources;
}

async function fetchImportedResource(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Positives LearnDash Importer" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_IMPORTED_RESOURCE_BYTES) {
      throw new Error("file is larger than 50 MB");
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMPORTED_RESOURCE_BYTES) {
      throw new Error("file is larger than 50 MB");
    }

    return {
      body: Buffer.from(arrayBuffer),
      contentType: response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream",
      sizeBytes: arrayBuffer.byteLength,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function copyImportedResourceToS3(params: {
  item: ImportedResourceItem;
  courseId: string;
  sourceId?: string | null;
}) {
  const file = await fetchImportedResource(params.item.url);
  const objectKey = mediaObjectKey(
    "courses",
    "learndash-imports",
    params.courseId,
    `${randomUUID()}-${safeResourceFilename(params.item.url)}`
  );

  await putMediaObject({
    key: objectKey,
    body: file.body,
    contentType: file.contentType,
  });

  const { bucket } = getS3MediaConfig();
  const { data: asset, error } = await adminClient()
    .from("media_asset")
    .insert({
      storage_provider: "s3",
      bucket,
      object_key: objectKey,
      kind: resourceKind(params.item.type, file.contentType),
      usage_context: "course",
      title: params.item.label,
      original_filename: safeResourceFilename(params.item.url),
      content_type: file.contentType,
      size_bytes: file.sizeBytes,
      status: "active",
      visibility: "member",
      metadata: {
        source_system: "learndash",
        source_url: params.item.url,
        source_id: params.sourceId ?? null,
      },
    })
    .select("id")
    .single();

  const assetRow = asset as { id: string } | null;
  if (error || !assetRow) {
    throw new Error(error?.message ?? "media asset insert failed");
  }

  return {
    mediaAssetId: assetRow.id,
    url: `/api/media/assets/${assetRow.id}`,
    s3Key: objectKey,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
  };
}

async function persistImportedResources(params: {
  courseId: string;
  moduleId?: string | null;
  lessonId?: string | null;
  scope: "course" | "module" | "lesson";
  sourceId?: string | null;
  items: ImportedResourceItem[];
  result: ImportResourceStats;
}) {
  if (params.items.length === 0) return;

  for (let index = 0; index < params.items.length; index++) {
    const item = params.items[index];
    let copied:
      | {
          mediaAssetId: string;
          url: string;
          s3Key: string;
          contentType: string;
          sizeBytes: number;
        }
      | null = null;
    let importStatus: "copied" | "external" | "failed" = "external";

    try {
      copied = await copyImportedResourceToS3({
        item,
        courseId: params.courseId,
        sourceId: params.sourceId,
      });
      importStatus = "copied";
      params.result.resourcesCopied++;
    } catch (error) {
      params.result.resourcesLinked++;
      params.result.warnings.push(
        `Kept external resource link for "${item.label}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    const { error } = await adminClient().from("course_resource").insert({
      course_id: params.courseId,
      module_id: params.scope === "module" || params.scope === "lesson" ? params.moduleId ?? null : null,
      lesson_id: params.scope === "lesson" ? params.lessonId ?? null : null,
      media_asset_id: copied?.mediaAssetId ?? null,
      scope: params.scope,
      label: item.label,
      url: copied?.url ?? item.url,
      s3_key: copied?.s3Key ?? null,
      source_url: item.url,
      source_system: "learndash",
      source_id: params.sourceId ?? null,
      source_metadata: { original_type: item.type },
      file_type: item.type,
      content_type: copied?.contentType ?? null,
      size_bytes: copied?.sizeBytes ?? null,
      sort_order: index + 1,
      status: "active",
      import_status: importStatus,
    });

    if (error) {
      params.result.resourceFailures++;
      params.result.warnings.push(`Could not save resource "${item.label}": ${error.message}`);
    }
  }
}

function primaryAudioUrl(items: ImportedResourceItem[]) {
  return items.find((item) => item.type === "audio")?.url ?? null;
}

function hasMeaningfulImportedContent(params: {
  body: string | null;
  description: string | null;
  videoUrl: string | null;
  resources: ImportedResourceItem[];
}) {
  return Boolean(
    params.videoUrl ||
      params.resources.length > 0 ||
      (params.body && stripHtml(params.body).length > 10) ||
      (params.description && params.description.length > 10)
  );
}

/**
 * Fully import a LearnDash course into the simplified Course → Module → Lesson
 * hierarchy. LearnDash topics become lessons; materials become structured
 * course_resource rows with S3 copies when the source file is fetchable.
 */
export async function importFromLearnDash(formData: FormData): Promise<LearnDashImportResult> {
  await requireAdmin();
  const wpUrl = formData.get("wp_url")?.toString().trim();
  const wpUser = formData.get("wp_user")?.toString().trim();
  const wpPassword = formData.get("wp_password")?.toString().trim();
  const selectedCourseIds = formData.getAll("course_ids").map(String);

  const result: LearnDashImportResult = {
    success: false,
    coursesImported: 0,
    modulesImported: 0,
    lessonsImported: 0,
    sessionsImported: 0,
    resourcesCopied: 0,
    resourcesLinked: 0,
    resourceFailures: 0,
    warnings: [],
    errors: [],
  };

  if (!wpUrl || !wpUser || !wpPassword) {
    result.errors.push("WordPress URL, username, and Application Password are required.");
    return result;
  }

  const supabase = adminClient();
  const baseUrl = wpUrl.replace(/\/+$/, "");
  const authHeader = `Basic ${Buffer.from(`${wpUser}:${wpPassword}`).toString("base64")}`;
  const hdrs = { Authorization: authHeader, "Content-Type": "application/json" };

  async function ldGet<T = Record<string, unknown>>(path: string): Promise<T> {
    const res = await fetchJsonWithTimeout<unknown>(
      `${baseUrl}/wp-json/ldlms/${apiVer}${path}`,
      { headers: hdrs }
    );
    if (!res.ok || !res.data) throw new Error(`${res.status} ${res.statusText} at ${path}`);
    return res.data as T;
  }

  let apiVer: string;

  try {
    apiVer = await detectLdApiVersion(baseUrl, hdrs);

    // Fetch courses to import
    let courseIds = selectedCourseIds;
    if (courseIds.length === 0) {
      const all = await ldGet<Array<{ id: number }>>("/sfwd-courses?per_page=100");
      courseIds = all.map((c: { id: number }) => String(c.id));
    }

    for (const ldCourseId of courseIds) {
      try {
        // ── Fetch course details ──────────────────────────────────────────────
        const ldCourse = await ldGet<Record<string, unknown>>(`/sfwd-courses/${ldCourseId}`);
        const courseTitleField = getRenderedField(ldCourse.title);
        const courseExcerptHtml = getRenderedField(ldCourse.excerpt);
        const courseContentHtml = getRenderedField(ldCourse.content);
        const courseTitle = decodeHtmlEntities(
          courseTitleField || "Untitled Course"
        );
        const courseDesc = courseExcerptHtml
          ? stripHtml(decodeHtmlEntities(courseExcerptHtml))
          : courseContentHtml
            ? stripHtml(decodeHtmlEntities(courseContentHtml)).slice(0, 500)
            : null;
        const courseCoverImageUrl = await getWpMediaUrl(baseUrl, hdrs, ldCourse.featured_media);
        const courseMaterials = String(ldCourse.materials ?? "");
        const courseResources = extractResourceItems(courseMaterials, courseContentHtml);

        // ── Create course ─────────────────────────────────────────────────────
        const { data: newCourse, error: courseErr } = await supabase
          .from("course")
          .insert({
            title: courseTitle,
            slug: slugify(courseTitle),
            description: courseDesc,
            short_description: courseDesc,
            full_description: cleanImportedHtml(courseContentHtml),
            cover_image_url: courseCoverImageUrl,
            status: "draft",
            learndash_source: {
              id: ldCourseId,
              url: ldCourse.link || null,
              imported_at: new Date().toISOString(),
            },
            admin_notes: `Imported from LearnDash ID: ${ldCourseId} | URL: ${ldCourse.link || ""}`,
          })
          .select("id")
          .single();

        if (courseErr || !newCourse) {
          result.errors.push(`Failed to create course "${courseTitle}": ${courseErr?.message}`);
          continue;
        }
        result.coursesImported++;

        await persistImportedResources({
          courseId: newCourse.id,
          scope: "course",
          sourceId: String(ldCourseId),
          items: courseResources,
          result,
        });

        // ── Fetch course steps (section/lesson hierarchy) ─────────────────────
        const steps = await ldGet<{
          h?: { "sfwd-lessons"?: Record<string, Record<string, unknown>> };
          t?: { "sfwd-lessons"?: string[]; "sfwd-topic"?: string[] };
          sections?: { heading: string; lesson_ids?: number[] }[];
        }>(`/sfwd-courses/${ldCourseId}/steps`);
        // steps.h = { "sfwd-lessons": { lessonId: { "sfwd-topic": [...], ... }, ... } }
        // steps.t = { "sfwd-lessons": [...ids], "sfwd-topic": [...ids] }

        // Build ordered list of lessons with their topic IDs
        type LdStep = {
          lessonId: string;
          topicIds: string[];
          sectionName: string;
        };

        const orderedSteps: LdStep[] = [];
        const lessonHierarchy = steps?.h?.["sfwd-lessons"] ?? {};
        const lessonOrder: string[] = steps?.t?.["sfwd-lessons"] ?? [];
        const sectionsData: { heading: string; lesson_ids?: number[] }[] = steps?.sections ?? [];

        // Build a map of lessonId → section name
        const lessonSectionMap = new Map<string, string>();
        if (sectionsData.length > 0) {
          for (const section of sectionsData) {
            for (const lid of (section.lesson_ids ?? [])) {
              lessonSectionMap.set(String(lid), decodeHtmlEntities(section.heading || "Main Content"));
            }
          }
        }

        for (const lid of lessonOrder) {
          const topicData = lessonHierarchy[lid] ?? {};
          // sfwd-topic is a dict keyed by topic ID: { "34402": { sfwd-quiz: [] }, ... }
          // or an empty array [] when there are no topics
          const rawTopics = topicData["sfwd-topic"];
          const topicIds: string[] = Array.isArray(rawTopics)
            ? rawTopics.map(String)                   // empty array case
            : Object.keys(rawTopics ?? {});           // dict case — keys are topic IDs

          orderedSteps.push({
            lessonId: lid,
            topicIds,
            sectionName: lessonSectionMap.get(String(lid)) ?? "Main Content",
          });
        }


        // ── Create modules (one per unique section) ───────────────────────────
        const moduleMap = new Map<string, string>(); // sectionName → module UUID

        for (const step of orderedSteps) {
          if (!moduleMap.has(step.sectionName)) {
            const moduleCount = moduleMap.size;
            const { data: mod, error: modErr } = await supabase
              .from("course_module")
              .insert({
                course_id: newCourse.id,
                title: step.sectionName,
                sort_order: moduleCount + 1,
              })
              .select("id")
              .single();

            if (modErr || !mod) {
              result.errors.push(`Failed to create module "${step.sectionName}": ${modErr?.message}`);
              continue;
            }
            moduleMap.set(step.sectionName, mod.id);
            result.modulesImported++;
          }
        }

        // ── Create lessons. LearnDash topics become first-class lessons. ─────
        const lessonSortCounters = new Map<string, number>(); // moduleId → count

        for (const step of orderedSteps) {
          const moduleId = moduleMap.get(step.sectionName);
          if (!moduleId) continue;

          // Fetch full lesson data
          let ldLesson: Record<string, unknown>;
          try {
            ldLesson = await ldGet(`/sfwd-lessons/${step.lessonId}`);
          } catch (e) {
            result.errors.push(`Failed to fetch lesson ${step.lessonId}: ${e}`);
            continue;
          }

          const lessonTitle = decodeHtmlEntities(
            getRenderedField(ldLesson.title) || "Untitled Lesson"
          );

          // Extract content from Elementor data
          let elementorData: unknown = null;
          const meta = ldLesson.meta as Record<string, unknown> | undefined;
          const elementorRaw = meta?.["_elementor_data"];
          if (elementorRaw && typeof elementorRaw === "string") {
            try { elementorData = JSON.parse(elementorRaw); } catch { /* not JSON */ }
          } else if (Array.isArray(elementorRaw)) {
            elementorData = elementorRaw;
          }

          const lessonContentHtml = getRenderedField(ldLesson.content);
          const lessonMaterials = String(ldLesson.materials ?? "");
          const lessonVideoUrl = resolveImportedVideoUrl({
            learndashVideoUrl: ldLesson.video_url,
            elementorData,
            renderedContent: lessonContentHtml,
            materials: lessonMaterials,
          });
          const lessonBody = resolveImportedBodyHtml(lessonContentHtml, elementorData);
          const lessonExcerptHtml = getRenderedField(ldLesson.excerpt);
          const lessonDesc = lessonExcerptHtml
            ? stripHtml(decodeHtmlEntities(lessonExcerptHtml))
            : null;
          const lessonResourceItems = extractResourceItems(lessonMaterials, lessonContentHtml, JSON.stringify(elementorData ?? ""));
          const lessonResources = lessonResourceItems.length > 0 ? JSON.stringify(lessonResourceItems) : null;
          const shouldCreateLesson =
            step.topicIds.length === 0 ||
            hasMeaningfulImportedContent({
              body: lessonBody,
              description: lessonDesc,
              videoUrl: lessonVideoUrl,
              resources: lessonResourceItems,
            });

          if (shouldCreateLesson) {
            const lSortCount = lessonSortCounters.get(moduleId) ?? 0;
            lessonSortCounters.set(moduleId, lSortCount + 1);

            const { data: newLesson, error: lessonErr } = await supabase
              .from("course_lesson")
              .insert({
                module_id: moduleId,
                title: lessonTitle,
                slug: slugify(lessonTitle),
                description: lessonDesc,
                body: lessonBody,
                video_url: lessonVideoUrl,
                audio_url: primaryAudioUrl(lessonResourceItems),
                resources: lessonResources,
                sort_order: lSortCount + 1,
                status: "published",
                source_system: "learndash",
                source_id: step.lessonId,
                source_metadata: { source_type: "lesson", parent_course_id: ldCourseId },
              })
              .select("id")
              .single();

            if (lessonErr || !newLesson) {
              result.errors.push(`Failed to create lesson "${lessonTitle}": ${lessonErr?.message}`);
              continue;
            }
            result.lessonsImported++;

            await persistImportedResources({
              courseId: newCourse.id,
              moduleId,
              lessonId: newLesson.id,
              scope: "lesson",
              sourceId: step.lessonId,
              items: lessonResourceItems,
              result,
            });
          }

          // ── Fetch LearnDash topics and import them as lessons ───────────────
          if (step.topicIds.length > 0) {
            // Fetch topics individually to preserve order
            for (let ti = 0; ti < step.topicIds.length; ti++) {
              const topicId = step.topicIds[ti];
              try {
                const ldTopic = await ldGet<Record<string, unknown>>(`/sfwd-topic/${topicId}`);

                const topicTitle = decodeHtmlEntities(
                  getRenderedField(ldTopic.title) || "Untitled Topic"
                );

                // Elementor extraction for topic
                let topicElementorData: unknown = null;
                const topicMeta = ldTopic.meta as Record<string, unknown> | undefined;
                const topicElementorRaw = topicMeta?.["_elementor_data"];
                if (topicElementorRaw && typeof topicElementorRaw === "string") {
                  try { topicElementorData = JSON.parse(topicElementorRaw); } catch { /* ok */ }
                } else if (Array.isArray(topicElementorRaw)) {
                  topicElementorData = topicElementorRaw;
                }

                const topicContentHtml = getRenderedField(ldTopic.content);
                const topicMaterials = String(ldTopic.materials ?? "");
                const topicVideoUrl = resolveImportedVideoUrl({
                  learndashVideoUrl: ldTopic.video_url,
                  elementorData: topicElementorData,
                  renderedContent: topicContentHtml,
                  materials: topicMaterials,
                });
                const topicBody = resolveImportedBodyHtml(topicContentHtml, topicElementorData);
                const topicExcerptHtml = getRenderedField(ldTopic.excerpt);
                const topicDesc = topicExcerptHtml
                  ? stripHtml(decodeHtmlEntities(topicExcerptHtml))
                  : null;
                const topicResourceItems = extractResourceItems(topicMaterials, topicContentHtml, JSON.stringify(topicElementorData ?? ""));
                const topicResources = topicResourceItems.length > 0 ? JSON.stringify(topicResourceItems) : null;

                const topicSortCount = lessonSortCounters.get(moduleId) ?? 0;
                lessonSortCounters.set(moduleId, topicSortCount + 1);

                const { data: topicLesson, error: topicLessonErr } = await supabase.from("course_lesson").insert({
                  module_id: moduleId,
                  title: topicTitle,
                  slug: slugify(topicTitle),
                  description: topicDesc,
                  body: topicBody,
                  video_url: topicVideoUrl,
                  audio_url: primaryAudioUrl(topicResourceItems),
                  resources: topicResources,
                  sort_order: topicSortCount + 1,
                  status: "published",
                  source_system: "learndash",
                  source_id: topicId,
                  source_parent_id: step.lessonId,
                  source_metadata: {
                    source_type: "topic",
                    parent_lesson_id: step.lessonId,
                    parent_lesson_title: lessonTitle,
                    parent_course_id: ldCourseId,
                  },
                }).select("id").single();

                if (topicLessonErr || !topicLesson) {
                  result.errors.push(`Failed to create topic lesson "${topicTitle}": ${topicLessonErr?.message}`);
                } else {
                  result.lessonsImported++;
                  result.sessionsImported++;
                  await persistImportedResources({
                    courseId: newCourse.id,
                    moduleId,
                    lessonId: topicLesson.id,
                    scope: "lesson",
                    sourceId: topicId,
                    items: topicResourceItems,
                    result,
                  });
                }
              } catch (e) {
                result.errors.push(`Failed to fetch topic ${topicId}: ${e}`);
              }
            }
          }
        } // end per-lesson loop

        result.success = true;
      } catch (err) {
        result.errors.push(`Error processing course ${ldCourseId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    result.success = result.coursesImported > 0;
  } catch (err) {
    result.errors.push(`Connection error: ${err instanceof Error ? err.message : String(err)}`);
  }

  revalidatePath("/admin/courses");
  return result;
}

// ─── Course browser (for import panel) ───────────────────────────────────────

export async function fetchLearnDashCourses(formData: FormData): Promise<{
  courses: { id: number; title: string; lessons_count: number }[];
  error: string | null;
}> {
  await requireAdmin();
  const wpUrl = formData.get("wp_url")?.toString().trim();
  const wpUser = formData.get("wp_user")?.toString().trim();
  const wpPassword = formData.get("wp_password")?.toString().trim();

  if (!wpUrl || !wpUser || !wpPassword) {
    return { courses: [], error: "All connection fields are required." };
  }

  const baseUrl = wpUrl.replace(/\/+$/, "");
  const authHeader = `Basic ${Buffer.from(`${wpUser}:${wpPassword}`).toString("base64")}`;
  const hdrs = { Authorization: authHeader, "Content-Type": "application/json" };

  try {
    const apiVer = await detectLdApiVersion(baseUrl, hdrs);

    const res = await fetchJsonWithTimeout<Array<{ id: number; title: { rendered: string } }>>(
      `${baseUrl}/wp-json/ldlms/${apiVer}/sfwd-courses?per_page=100`,
      { headers: hdrs }
    );
    if (!res.ok || !res.data) {
      return { courses: [], error: `Connection failed: ${res.status} ${res.statusText}. Check URL and credentials.` };
    }

    const courses = await Promise.all(
      res.data.map(async (c: { id: number; title: { rendered: string } }) => {
        let lessonsCount = 0;
        try {
          const stepsRes = await fetchJsonWithTimeout<{
            t?: {
              "sfwd-lessons"?: unknown[];
              "sfwd-topic"?: unknown[];
            };
          }>(
            `${baseUrl}/wp-json/ldlms/${apiVer}/sfwd-courses/${c.id}/steps`,
            { headers: hdrs },
            8000
          );
          if (stepsRes.ok && stepsRes.data) {
            const lessons = stepsRes.data.t?.["sfwd-lessons"] ?? [];
            const topics = stepsRes.data.t?.["sfwd-topic"] ?? [];
            lessonsCount = lessons.length + topics.length;
          }
        } catch { /* fallback 0 */ }

        return {
          id: c.id,
          title: decodeHtmlEntities(c.title?.rendered || "Untitled"),
          lessons_count: lessonsCount,
        };
      })
    );

    return { courses, error: null };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        courses: [],
        error: "Connection timed out. Check the LearnDash URL, credentials, or site availability and try again.",
      };
    }

    return { courses: [], error: `Connection error: ${err instanceof Error ? err.message : String(err)}` };
  }
}
