"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

/** Returns pre-configured LearnDash credentials from env vars (server-only). */
export async function getLearnDashDefaults(): Promise<{
  wpUrl: string;
  wpUser: string;
  wpPassword: string;
  configured: boolean;
}> {
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
      status: formData.get("status")?.toString() || "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id!);

  revalidatePath(`/admin/courses/${id}`);
  redirect(`/admin/courses/${id}?success=updated`);
}

export async function deleteCourse(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;
  await adminClient().from("course").delete().eq("id", id);
  revalidatePath("/admin/courses");
  redirect("/admin/courses?success=deleted");
}

// ─── Module CRUD ─────────────────────────────────────────────────────────────

export async function createModule(formData: FormData) {
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
  const moduleId = formData.get("module_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  if (!moduleId) return;
  await adminClient().from("course_module").delete().eq("id", moduleId);
  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=module_deleted`);
}

// ─── Lesson CRUD ─────────────────────────────────────────────────────────────

export async function createLesson(formData: FormData) {
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
    description: formData.get("description")?.toString().trim() || null,
    body: formData.get("body")?.toString().trim() || null,
    video_url: formData.get("video_url")?.toString().trim() || null,
    duration_seconds: formData.get("duration_seconds")?.toString()
      ? parseInt(formData.get("duration_seconds")!.toString(), 10) : null,
    resources: formData.get("resources")?.toString().trim() || null,
    sort_order: (count ?? 0) + 1,
  });

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=lesson_created`);
}

export async function updateLesson(formData: FormData) {
  const lessonId = formData.get("lesson_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  const title = formData.get("title")?.toString().trim();
  if (!lessonId || !title) redirect(`/admin/courses/${courseId ?? ""}?error=missing_fields`);

  await adminClient()
    .from("course_lesson")
    .update({
      title,
      description: formData.get("description")?.toString().trim() || null,
      body: formData.get("body")?.toString().trim() || null,
      video_url: formData.get("video_url")?.toString().trim() || null,
      duration_seconds: formData.get("duration_seconds")?.toString()
        ? parseInt(formData.get("duration_seconds")!.toString(), 10) : null,
      resources: formData.get("resources")?.toString().trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lessonId!);

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=lesson_updated`);
}

export async function deleteLesson(formData: FormData) {
  const lessonId = formData.get("lesson_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  if (!lessonId) return;
  await adminClient().from("course_lesson").delete().eq("id", lessonId);
  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=lesson_deleted`);
}

// ─── Session (Topic) CRUD ─────────────────────────────────────────────────────

export async function createSession(formData: FormData) {
  const lessonId = formData.get("lesson_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  const title = formData.get("title")?.toString().trim();
  if (!lessonId || !title) redirect(`/admin/courses/${courseId ?? ""}?error=missing_fields`);

  const supabase = adminClient();
  const { count } = await supabase
    .from("course_session")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId!);

  await supabase.from("course_session").insert({
    lesson_id: lessonId,
    title,
    description: formData.get("description")?.toString().trim() || null,
    body: formData.get("body")?.toString().trim() || null,
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
  const sessionId = formData.get("session_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  const title = formData.get("title")?.toString().trim();
  if (!sessionId || !title) redirect(`/admin/courses/${courseId ?? ""}?error=missing_fields`);

  await adminClient()
    .from("course_session")
    .update({
      title,
      description: formData.get("description")?.toString().trim() || null,
      body: formData.get("body")?.toString().trim() || null,
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
  errors: string[];
};

/** Try v2, fall back to v1 */
async function detectLdApiVersion(baseUrl: string, headers: Record<string, string>): Promise<string> {
  const v2 = await fetch(`${baseUrl}/wp-json/ldlms/v2/sfwd-courses?per_page=1`, { headers }).catch(() => null);
  if (v2?.ok) return "v2";
  const v1 = await fetch(`${baseUrl}/wp-json/ldlms/v1/sfwd-courses?per_page=1`, { headers }).catch(() => null);
  if (v1?.ok) return "v1";
  return "v1";
}

/**
 * Extract the Vimeo/YouTube video URL from a lesson/topic's Elementor data.
 * Returns the canonical URL (e.g. https://vimeo.com/123456) or null.
 */
function extractElementorVideo(elementorData: unknown): string | null {
  if (!elementorData || !Array.isArray(elementorData)) return null;

  function walk(elements: unknown[]): string | null {
    for (const el of elements) {
      if (typeof el !== "object" || el === null) continue;
      const elem = el as Record<string, unknown>;

      if (elem.widgetType === "video") {
        const s = (elem.settings ?? {}) as Record<string, unknown>;
        const type = s.video_type as string | undefined;
        if (type === "vimeo" && s.vimeo_url) return s.vimeo_url as string;
        if (type === "youtube" && s.youtube_url) return s.youtube_url as string;
        // Fallback: return whichever URL is non-default
        const vimeo = s.vimeo_url as string | undefined;
        const youtube = s.youtube_url as string | undefined;
        if (vimeo && !vimeo.includes("XHOmBV4js_E")) return vimeo; // skip placeholder
        if (youtube && !youtube.includes("XHOmBV4js_E")) return youtube;
      }

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
 * Extract the main body text from Elementor text-editor widgets.
 */
function extractElementorBody(elementorData: unknown): string | null {
  if (!elementorData || !Array.isArray(elementorData)) return null;
  const parts: string[] = [];

  function walk(elements: unknown[]) {
    for (const el of elements) {
      if (typeof el !== "object" || el === null) continue;
      const elem = el as Record<string, unknown>;
      if (elem.widgetType === "text-editor") {
        const s = (elem.settings ?? {}) as Record<string, unknown>;
        const editor = s.editor as string | undefined;
        if (editor) {
          const text = stripHtml(decodeHtmlEntities(editor)).trim();
          if (text.length > 10) parts.push(text);
        }
      }
      if (Array.isArray(elem.elements)) walk(elem.elements as unknown[]);
    }
  }

  walk(elementorData as unknown[]);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

/**
 * Extract resource URLs (PDFs, MP3s, S3 files) from a materials shortcode or HTML content.
 * Returns a JSON string: [{label, url, type}]
 */
function extractResources(materialsField: string, htmlContent: string): string | null {
  interface Resource { label: string; url: string; type: string }
  const resources: Resource[] = [];
  const seen = new Set<string>();

  function add(url: string, label = "", type = "file") {
    const clean = url.split("?")[0].split(" ")[0];
    if (seen.has(clean) || !clean.startsWith("http")) return;
    seen.add(clean);
    const ext = clean.split(".").pop()?.toLowerCase() ?? "";
    const detectedType = ext === "pdf" ? "pdf" : ext === "mp3" || ext === "m4a" ? "audio" : ext === "mp4" ? "video" : type;
    resources.push({ label: label || clean.split("/").pop() || "Resource", url: clean, type: detectedType });
  }

  // 1. Parse [easy_media_download] shortcode
  const shortcodeRe = /\[easy_media_download[^\]]*url=\\"([^"\\]+)\\"[^\]]*text=\\"([^"\\]+)\\"/g;
  let m;
  while ((m = shortcodeRe.exec(materialsField)) !== null) add(m[1], m[2]);

  // Also try unescaped version
  const shortcodeRe2 = /url="([^"]+)"[^/]*text="([^"]+)"/g;
  while ((m = shortcodeRe2.exec(materialsField)) !== null) add(m[1], m[2]);

  // 2. Scan HTML content for PDF/MP3/S3 hrefs
  const hrefRe = /href="(https?:\/\/[^"]+\.(pdf|mp3|m4a|mp4|zip|docx|pptx))"/gi;
  while ((m = hrefRe.exec(htmlContent)) !== null) add(m[1]);

  // 3. S3 links in content
  const s3Re = /(https?:\/\/[^"\s<>]*s3[^"\s<>]*\.(?:pdf|mp3|mp4|zip|m4a))/gi;
  while ((m = s3Re.exec(materialsField + " " + htmlContent)) !== null) add(m[1]);

  return resources.length > 0 ? JSON.stringify(resources) : null;
}

/**
 * Fully import a LearnDash course into the 4-level hierarchy.
 * LD: Course → Section → Lesson → Topic
 * Us: Course → Module → Lesson → Session
 */
export async function importFromLearnDash(formData: FormData): Promise<LearnDashImportResult> {
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

  async function ldGet(path: string) {
    const res = await fetch(`${baseUrl}/wp-json/ldlms/${apiVer}${path}`, { headers: hdrs });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} at ${path}`);
    return res.json();
  }

  let apiVer: string;

  try {
    apiVer = await detectLdApiVersion(baseUrl, hdrs);

    // Fetch courses to import
    let courseIds = selectedCourseIds;
    if (courseIds.length === 0) {
      const all = await ldGet("/sfwd-courses?per_page=100");
      courseIds = all.map((c: { id: number }) => String(c.id));
    }

    for (const ldCourseId of courseIds) {
      try {
        // ── Fetch course details ──────────────────────────────────────────────
        const ldCourse = await ldGet(`/sfwd-courses/${ldCourseId}`);
        const courseTitle = decodeHtmlEntities(ldCourse.title?.rendered || ldCourse.title || "Untitled Course");
        const courseDesc = ldCourse.excerpt?.rendered
          ? stripHtml(decodeHtmlEntities(ldCourse.excerpt.rendered))
          : ldCourse.content?.rendered
            ? stripHtml(decodeHtmlEntities(ldCourse.content.rendered)).slice(0, 500)
            : null;

        // ── Create course ─────────────────────────────────────────────────────
        const { data: newCourse, error: courseErr } = await supabase
          .from("course")
          .insert({
            title: courseTitle,
            slug: slugify(courseTitle),
            description: courseDesc,
            status: "draft",
            admin_notes: `Imported from LearnDash ID: ${ldCourseId} | URL: ${ldCourse.link || ""}`,
          })
          .select("id")
          .single();

        if (courseErr || !newCourse) {
          result.errors.push(`Failed to create course "${courseTitle}": ${courseErr?.message}`);
          continue;
        }
        result.coursesImported++;

        // ── Fetch course steps (section/lesson hierarchy) ─────────────────────
        const steps = await ldGet(`/sfwd-courses/${ldCourseId}/steps`);
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

        // ── Create lessons (LD lessons) and sessions (LD topics) ─────────────
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
            (ldLesson.title as { rendered?: string })?.rendered || String(ldLesson.title || "Untitled Lesson")
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

          const lessonVideoUrl = extractElementorVideo(elementorData);
          const lessonBody = extractElementorBody(elementorData)
            || stripHtml(decodeHtmlEntities(
              ((ldLesson.content as { rendered?: string })?.rendered) || ""
            )) || null;
          const lessonDesc = (ldLesson.excerpt as { rendered?: string })?.rendered
            ? stripHtml(decodeHtmlEntities((ldLesson.excerpt as { rendered?: string }).rendered!))
            : null;
          const materialsField = String(ldLesson.lesson_materials ?? "");
          const contentHtml = String((ldLesson.content as { rendered?: string })?.rendered ?? "");
          const lessonResources = extractResources(materialsField, contentHtml);

          // Sort order within this module
          const lSortCount = lessonSortCounters.get(moduleId) ?? 0;
          lessonSortCounters.set(moduleId, lSortCount + 1);

          // Create the lesson row
          const { data: newLesson, error: lessonErr } = await supabase
            .from("course_lesson")
            .insert({
              module_id: moduleId,
              title: lessonTitle,
              description: lessonDesc,
              body: lessonBody,
              video_url: lessonVideoUrl,
              resources: lessonResources,
              sort_order: lSortCount + 1,
            })
            .select("id")
            .single();

          if (lessonErr || !newLesson) {
            result.errors.push(`Failed to create lesson "${lessonTitle}": ${lessonErr?.message}`);
            continue;
          }
          result.lessonsImported++;

          // ── Fetch and create topics (sessions) under this lesson ────────────
          if (step.topicIds.length > 0) {
            // Fetch topics individually to preserve order
            for (let ti = 0; ti < step.topicIds.length; ti++) {
              const topicId = step.topicIds[ti];
              try {
                const ldTopic = await ldGet(`/sfwd-topic/${topicId}`);

                const topicTitle = decodeHtmlEntities(
                  (ldTopic.title as { rendered?: string })?.rendered || String(ldTopic.title || "Untitled Topic")
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

                const topicVideoUrl = extractElementorVideo(topicElementorData);
                const topicBody = extractElementorBody(topicElementorData)
                  || stripHtml(decodeHtmlEntities(
                    ((ldTopic.content as { rendered?: string })?.rendered) || ""
                  )) || null;
                const topicDesc = (ldTopic.excerpt as { rendered?: string })?.rendered
                  ? stripHtml(decodeHtmlEntities((ldTopic.excerpt as { rendered?: string }).rendered!))
                  : null;
                const topicMaterialsField = String(ldTopic.topic_materials ?? "");
                const topicContentHtml = String((ldTopic.content as { rendered?: string })?.rendered ?? "");
                const topicResources = extractResources(topicMaterialsField, topicContentHtml);

                const { error: sessErr } = await supabase.from("course_session").insert({
                  lesson_id: newLesson.id,
                  title: topicTitle,
                  description: topicDesc,
                  body: topicBody,
                  video_url: topicVideoUrl,
                  resources: topicResources,
                  sort_order: ti + 1,
                });

                if (sessErr) {
                  result.errors.push(`Failed to create topic "${topicTitle}": ${sessErr.message}`);
                } else {
                  result.sessionsImported++;
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

    const res = await fetch(`${baseUrl}/wp-json/ldlms/${apiVer}/sfwd-courses?per_page=100`, { headers: hdrs });
    if (!res.ok) {
      return { courses: [], error: `Connection failed: ${res.status} ${res.statusText}. Check URL and credentials.` };
    }

    const data = await res.json();

    const courses = await Promise.all(
      data.map(async (c: { id: number; title: { rendered: string } }) => {
        let lessonsCount = 0;
        try {
          const stepsRes = await fetch(
            `${baseUrl}/wp-json/ldlms/${apiVer}/sfwd-courses/${c.id}/steps`,
            { headers: hdrs }
          );
          if (stepsRes.ok) {
            const steps = await stepsRes.json();
            const lessons = steps?.t?.["sfwd-lessons"] ?? [];
            const topics = steps?.t?.["sfwd-topic"] ?? [];
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
    return { courses: [], error: `Connection error: ${err instanceof Error ? err.message : String(err)}` };
  }
}
