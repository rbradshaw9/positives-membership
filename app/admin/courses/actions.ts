"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * app/admin/courses/actions.ts
 * Server actions for Course → Module → Session CRUD and LearnDash import.
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

// ─── Course CRUD ────────────────────────────────────────────────────────────

export async function createCourse(formData: FormData) {
  const title = formData.get("title")?.toString().trim();
  if (!title) redirect("/admin/courses?error=title_required");

  const description = formData.get("description")?.toString().trim() || null;
  const status = formData.get("status")?.toString() || "draft";
  const slug = slugify(title);

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

  const description = formData.get("description")?.toString().trim() || null;
  const status = formData.get("status")?.toString() || "draft";
  const slug = slugify(title);

  const supabase = adminClient();
  const { error } = await supabase
    .from("course")
    .update({
      title,
      slug,
      description,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) console.error("[updateCourse] Error:", error.message);

  revalidatePath(`/admin/courses/${id}`);
  redirect(`/admin/courses/${id}?success=updated`);
}

export async function deleteCourse(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const supabase = adminClient();
  await supabase.from("course").delete().eq("id", id);

  redirect("/admin/courses?success=deleted");
}

// ─── Module CRUD ────────────────────────────────────────────────────────────

export async function createModule(formData: FormData) {
  const courseId = formData.get("course_id")?.toString();
  const title = formData.get("title")?.toString().trim();
  if (!courseId || !title)
    redirect(`/admin/courses/${courseId ?? ""}?error=missing_fields`);

  // Get next sort_order
  const supabase = adminClient();
  const { count } = await supabase
    .from("course_module")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { error } = await supabase.from("course_module").insert({
    course_id: courseId,
    title,
    description: formData.get("description")?.toString().trim() || null,
    sort_order: (count ?? 0) + 1,
  });

  if (error) console.error("[createModule] Error:", error.message);

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=module_created`);
}

export async function deleteModule(formData: FormData) {
  const moduleId = formData.get("module_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  if (!moduleId) return;

  const supabase = adminClient();
  await supabase.from("course_module").delete().eq("id", moduleId);

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=module_deleted`);
}

// ─── Session CRUD ───────────────────────────────────────────────────────────

export async function createSession(formData: FormData) {
  const moduleId = formData.get("module_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  const title = formData.get("title")?.toString().trim();
  if (!moduleId || !title)
    redirect(`/admin/courses/${courseId ?? ""}?error=missing_fields`);

  const supabase = adminClient();
  const { count } = await supabase
    .from("course_session")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);

  const { error } = await supabase.from("course_session").insert({
    module_id: moduleId,
    title,
    description: formData.get("description")?.toString().trim() || null,
    body: formData.get("body")?.toString().trim() || null,
    video_url: formData.get("video_url")?.toString().trim() || null,
    duration_seconds: formData.get("duration_seconds")?.toString()
      ? parseInt(formData.get("duration_seconds")!.toString(), 10)
      : null,
    sort_order: (count ?? 0) + 1,
  });

  if (error) console.error("[createSession] Error:", error.message);

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=session_created`);
}

export async function deleteSession(formData: FormData) {
  const sessionId = formData.get("session_id")?.toString();
  const courseId = formData.get("course_id")?.toString();
  if (!sessionId) return;

  const supabase = adminClient();
  await supabase.from("course_session").delete().eq("id", sessionId);

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}?success=session_deleted`);
}

// ─── LearnDash Import ────────────────────────────────────────────────────────

export type LearnDashImportResult = {
  success: boolean;
  coursesImported: number;
  modulesImported: number;
  sessionsImported: number;
  errors: string[];
};

/** Try v2 first, fall back to v1 */
async function detectLdApiVersion(
  baseUrl: string,
  headers: Record<string, string>
): Promise<string> {
  const v2 = await fetch(`${baseUrl}/wp-json/ldlms/v2/sfwd-courses?per_page=1`, { headers }).catch(() => null);
  if (v2 && v2.ok) return "v2";
  const v1 = await fetch(`${baseUrl}/wp-json/ldlms/v1/sfwd-courses?per_page=1`, { headers }).catch(() => null);
  if (v1 && v1.ok) return "v1";
  return "v2"; // default
}

/**
 * Import courses from a LearnDash WordPress REST API.
 * Requires: WP site URL + Application Password.
 *
 * Maps:  LD Course → course
 *        LD Section (lesson grouping) → course_module
 *        LD Lesson → course_session
 */
export async function importFromLearnDash(
  formData: FormData
): Promise<LearnDashImportResult> {
  const wpUrl = formData.get("wp_url")?.toString().trim();
  const wpUser = formData.get("wp_user")?.toString().trim();
  const wpPassword = formData.get("wp_password")?.toString().trim();
  const selectedCourseIds = formData.getAll("course_ids").map(String);

  const result: LearnDashImportResult = {
    success: false,
    coursesImported: 0,
    modulesImported: 0,
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

  const headers = {
    Authorization: authHeader,
    "Content-Type": "application/json",
  };

  try {
    // Auto-detect API version
    const apiVer = await detectLdApiVersion(baseUrl, headers);
    const apiBase = `${baseUrl}/wp-json/ldlms/${apiVer}`;

    // Decide which courses to import
    let courseIds = selectedCourseIds;
    if (courseIds.length === 0) {
      // Fetch all courses from LD
      const courseRes = await fetch(
        `${apiBase}/sfwd-courses?per_page=100`,
        { headers }
      );
      if (!courseRes.ok) {
        result.errors.push(
          `Failed to fetch courses: ${courseRes.status} ${courseRes.statusText}`
        );
        return result;
      }
      const courses = await courseRes.json();
      courseIds = courses.map((c: { id: number }) => String(c.id));
    }

    for (const ldCourseId of courseIds) {
      try {
        // Fetch course details
        const courseRes = await fetch(
          `${apiBase}/sfwd-courses/${ldCourseId}`,
          { headers }
        );
        if (!courseRes.ok) {
          result.errors.push(`Failed to fetch course ${ldCourseId}`);
          continue;
        }
        const ldCourse = await courseRes.json();

        // Create course in our DB
        const courseTitle =
          ldCourse.title?.rendered || ldCourse.title || "Untitled Course";
        const courseDesc =
          ldCourse.content?.rendered?.replace(/<[^>]*>/g, "").trim() || null;

        const { data: newCourse, error: courseErr } = await supabase
          .from("course")
          .insert({
            title: courseTitle,
            slug: slugify(courseTitle),
            description: courseDesc,
            status: "draft",
            admin_notes: `Imported from LearnDash (ID: ${ldCourseId})`,
          })
          .select("id")
          .single();

        if (courseErr || !newCourse) {
          result.errors.push(
            `Failed to create course "${courseTitle}": ${courseErr?.message}`
          );
          continue;
        }

        result.coursesImported++;

        // Fetch lessons for this course
        const lessonsRes = await fetch(
          `${apiBase}/sfwd-lessons?course=${ldCourseId}&per_page=100&orderby=menu_order&order=asc`,
          { headers }
        );

        if (!lessonsRes.ok) {
          result.errors.push(
            `Failed to fetch lessons for course ${ldCourseId}`
          );
          continue;
        }

        const lessons = await lessonsRes.json();

        // Group lessons into modules (using LD sections if available, else one default module)
        // LearnDash sections are stored as course meta — we'll create one module per section
        // or a single default module if no sections exist.
        const moduleMap = new Map<
          string,
          { id: string; sort: number }
        >();

        let defaultModuleCreated = false;
        let defaultModuleId = "";

        for (let li = 0; li < lessons.length; li++) {
          const lesson = lessons[li];
          const sectionName = lesson.ld_course_section?.heading || "Main Content";

          // Create module for this section if not already created
          if (!moduleMap.has(sectionName)) {
            const { data: mod, error: modErr } = await supabase
              .from("course_module")
              .insert({
                course_id: newCourse.id,
                title: sectionName,
                sort_order: moduleMap.size + 1,
              })
              .select("id")
              .single();

            if (modErr || !mod) {
              result.errors.push(
                `Failed to create module "${sectionName}": ${modErr?.message}`
              );
              continue;
            }

            moduleMap.set(sectionName, {
              id: mod.id,
              sort: moduleMap.size + 1,
            });
            result.modulesImported++;

            if (!defaultModuleCreated) {
              defaultModuleId = mod.id;
              defaultModuleCreated = true;
            }
          }

          const module = moduleMap.get(sectionName);
          if (!module) continue;

          // Create session from lesson
          const lessonTitle =
            lesson.title?.rendered || lesson.title || "Untitled Lesson";
          const lessonDesc =
            lesson.content?.rendered?.replace(/<[^>]*>/g, "").trim() || null;

          const { error: sessErr } = await supabase
            .from("course_session")
            .insert({
              module_id: module.id,
              title: lessonTitle,
              description: lessonDesc,
              sort_order: li + 1,
            });

          if (sessErr) {
            result.errors.push(
              `Failed to create session "${lessonTitle}": ${sessErr.message}`
            );
          } else {
            result.sessionsImported++;
          }

          // Fetch topics (sub-lessons) for this lesson
          try {
            const topicsRes = await fetch(
              `${apiBase}/sfwd-topic?course=${ldCourseId}&lesson=${lesson.id}&per_page=100&orderby=menu_order&order=asc`,
              { headers }
            );

            if (topicsRes.ok) {
              const topics = await topicsRes.json();
              for (let ti = 0; ti < topics.length; ti++) {
                const topic = topics[ti];
                const topicTitle =
                  topic.title?.rendered || topic.title || "Untitled Topic";
                const topicDesc =
                  topic.content?.rendered?.replace(/<[^>]*>/g, "").trim() ||
                  null;

                const { error: topicErr } = await supabase
                  .from("course_session")
                  .insert({
                    module_id: module.id,
                    title: topicTitle,
                    description: topicDesc,
                    sort_order: (li + 1) * 100 + ti + 1,
                  });

                if (topicErr) {
                  result.errors.push(
                    `Failed to create topic "${topicTitle}": ${topicErr.message}`
                  );
                } else {
                  result.sessionsImported++;
                }
              }
            }
          } catch {
            // Topics endpoint may not exist — non-fatal
          }
        }
      } catch (err) {
        result.errors.push(
          `Error processing course ${ldCourseId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    result.success = result.coursesImported > 0;
  } catch (err) {
    result.errors.push(
      `Connection error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  revalidatePath("/admin/courses");
  return result;
}

/**
 * Fetch available courses from a LearnDash installation for selection.
 * Used by the import UI to show a course picker.
 */
export async function fetchLearnDashCourses(
  formData: FormData
): Promise<{
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

  try {
    // Auto-detect API version
    const hdrs = { Authorization: authHeader, "Content-Type": "application/json" };
    const apiVer = await detectLdApiVersion(baseUrl, hdrs);

    const res = await fetch(
      `${baseUrl}/wp-json/ldlms/${apiVer}/sfwd-courses?per_page=100`,
      { headers: hdrs }
    );

    if (!res.ok) {
      return {
        courses: [],
        error: `Connection failed: ${res.status} ${res.statusText}. Check your URL and credentials.`,
      };
    }

    const data = await res.json();
    return {
      courses: data.map(
        (c: { id: number; title: { rendered: string }; meta?: { course_lessons?: number } }) => ({
          id: c.id,
          title: c.title?.rendered || "Untitled",
          lessons_count: c.meta?.course_lessons ?? 0,
        })
      ),
      error: null,
    };
  } catch (err) {
    return {
      courses: [],
      error: `Connection error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
