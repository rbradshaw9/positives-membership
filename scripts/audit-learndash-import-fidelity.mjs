#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const wpUrl = process.env.LEARNDASH_WP_URL?.replace(/\/+$/, "");
const wpUser = process.env.LEARNDASH_WP_USER;
const wpPassword = process.env.LEARNDASH_WP_APP_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldFixMissingCover = process.argv.includes("--fix-missing-cover");

if (!wpUrl || !wpUser || !wpPassword || !supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing required env. Expected LEARNDASH_WP_URL, LEARNDASH_WP_USER, LEARNDASH_WP_APP_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const authHeader =
  "Basic " + Buffer.from(`${wpUser}:${wpPassword}`).toString("base64");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function htmlHasMeaningfulContent(value) {
  if (typeof value !== "string") return false;
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length > 0;
}

function hasDownloadLikeResource(value) {
  if (typeof value !== "string") return false;
  return /(?:https?:\/\/[^\s"'<>]+)?[^\s"'<>]+\.(?:pdf|zip|docx?|pptx?|xlsx?|txt)(?:[?#][^\s"'<>]*)?/i.test(
    value
  );
}

async function ldGet(path) {
  const response = await fetch(`${wpUrl}/wp-json/ldlms/v2${path}`, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} ${path}`);
  }

  return response.json();
}

async function getWpMediaUrl(mediaId) {
  if (!mediaId) return null;

  const response = await fetch(`${wpUrl}/wp-json/wp/v2/media/${mediaId}`, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) return null;

  const media = await response.json();
  return typeof media?.source_url === "string" ? media.source_url : null;
}

async function getImportedCourses() {
  const { data, error } = await supabase
    .from("course")
    .select(
      `
      id,
      title,
      slug,
      status,
      description,
      cover_image_url,
      admin_notes,
      created_at,
      course_module(
        id,
        title,
        sort_order,
        course_lesson(
          id,
          title,
          body,
          description,
          video_url,
          resources,
          sort_order,
          course_session(
            id,
            title,
            body,
            description,
            video_url,
            resources,
            sort_order
          )
        )
      )
    `
    )
    .like("admin_notes", "Imported from LearnDash ID:%")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

function parseLearnDashId(adminNotes) {
  const match = String(adminNotes ?? "").match(/Imported from LearnDash ID:\s*(\d+)/);
  return match?.[1] ? Number(match[1]) : null;
}

async function buildSourceAudit(learnDashCourseId) {
  const course = await ldGet(`/sfwd-courses/${learnDashCourseId}`);
  const steps = await ldGet(`/sfwd-courses/${learnDashCourseId}/steps`);
  const lessonOrder = steps?.t?.["sfwd-lessons"] ?? [];
  const lessonHierarchy = steps?.h?.["sfwd-lessons"] ?? {};
  let lessons = 0;
  let topics = 0;
  let lessonBodies = 0;
  let topicBodies = 0;
  let lessonVideos = 0;
  let topicVideos = 0;
  let lessonResources = 0;
  let topicResources = 0;

  for (const lessonId of lessonOrder) {
    lessons += 1;
    const lesson = await ldGet(`/sfwd-lessons/${lessonId}`);
    const lessonContent = lesson?.content?.rendered ?? "";
    const lessonMaterials = String(lesson?.materials ?? "");
    if (htmlHasMeaningfulContent(lessonContent)) lessonBodies += 1;
    if (lesson?.video_url || lessonContent.includes("vimeo") || lessonContent.includes("youtube")) {
      lessonVideos += 1;
    }
    if (
      hasDownloadLikeResource(lessonMaterials) ||
      hasDownloadLikeResource(lessonContent)
    ) {
      lessonResources += 1;
    }

    const rawTopics = lessonHierarchy?.[lessonId]?.["sfwd-topic"];
    const topicIds = Array.isArray(rawTopics)
      ? rawTopics.map(String)
      : Object.keys(rawTopics ?? {});

    for (const topicId of topicIds) {
      topics += 1;
      const topic = await ldGet(`/sfwd-topic/${topicId}`);
      const topicContent = topic?.content?.rendered ?? "";
      const topicMaterials = String(topic?.materials ?? "");
      if (htmlHasMeaningfulContent(topicContent)) topicBodies += 1;
      if (topic?.video_url || topicContent.includes("vimeo") || topicContent.includes("youtube")) {
        topicVideos += 1;
      }
      if (
        hasDownloadLikeResource(topicMaterials) ||
        hasDownloadLikeResource(topicContent)
      ) {
        topicResources += 1;
      }
    }
  }

  return {
    title: course?.title?.rendered ?? "Unknown",
    featuredMedia: course?.featured_media ?? null,
    excerpt: htmlHasMeaningfulContent(course?.excerpt?.rendered ?? ""),
    content: htmlHasMeaningfulContent(course?.content?.rendered ?? ""),
    lessons,
    topics,
    lessonBodies,
    topicBodies,
    lessonVideos,
    topicVideos,
    lessonResources,
    topicResources,
  };
}

async function maybeFixCover(importedCourse, sourceAudit) {
  if (!shouldFixMissingCover || importedCourse.cover_image_url || !sourceAudit.featuredMedia) {
    return null;
  }

  const sourceUrl = await getWpMediaUrl(sourceAudit.featuredMedia);
  if (!sourceUrl) return null;

  const { error } = await supabase
    .from("course")
    .update({ cover_image_url: sourceUrl })
    .eq("id", importedCourse.id);

  if (error) throw error;

  return sourceUrl;
}

function buildImportedAudit(importedCourse) {
  const modules = importedCourse.course_module ?? [];
  const lessons = modules.flatMap((module) => module.course_lesson ?? []);
  const sessions = lessons.flatMap((lesson) => lesson.course_session ?? []);

  return {
    modules: modules.length,
    lessons: lessons.length,
    topics: sessions.length,
    description: !!importedCourse.description,
    coverImageUrl: importedCourse.cover_image_url,
    lessonBodies: lessons.filter((lesson) => htmlHasMeaningfulContent(lesson.body)).length,
    topicBodies: sessions.filter((session) => htmlHasMeaningfulContent(session.body)).length,
    lessonVideos: lessons.filter((lesson) => !!lesson.video_url).length,
    topicVideos: sessions.filter((session) => !!session.video_url).length,
    lessonResources: lessons.filter((lesson) => !!lesson.resources).length,
    topicResources: sessions.filter((session) => !!session.resources).length,
  };
}

const importedCourses = await getImportedCourses();
const report = [];

for (const importedCourse of importedCourses) {
  const learnDashCourseId = parseLearnDashId(importedCourse.admin_notes);
  if (!learnDashCourseId) continue;

  const sourceAudit = await buildSourceAudit(learnDashCourseId);
  const importedAudit = buildImportedAudit(importedCourse);
  const fixedCoverImageUrl = await maybeFixCover(importedCourse, sourceAudit);

  report.push({
    courseId: importedCourse.id,
    title: importedCourse.title,
    slug: importedCourse.slug,
    learnDashCourseId,
    source: sourceAudit,
    imported: {
      ...importedAudit,
      coverImageUrl: fixedCoverImageUrl ?? importedAudit.coverImageUrl,
    },
    mismatches: {
      lessonCount:
        importedAudit.lessons === sourceAudit.lessons
          ? null
          : `${importedAudit.lessons} imported vs ${sourceAudit.lessons} source`,
      topicCount:
        importedAudit.topics === sourceAudit.topics
          ? null
          : `${importedAudit.topics} imported vs ${sourceAudit.topics} source`,
      missingCoverImage:
        !fixedCoverImageUrl &&
        !importedAudit.coverImageUrl &&
        !!sourceAudit.featuredMedia,
      lessonBodyCoverage:
        importedAudit.lessonBodies === sourceAudit.lessonBodies
          ? null
          : `${importedAudit.lessonBodies} imported vs ${sourceAudit.lessonBodies} source`,
      topicBodyCoverage:
        importedAudit.topicBodies === sourceAudit.topicBodies
          ? null
          : `${importedAudit.topicBodies} imported vs ${sourceAudit.topicBodies} source`,
      lessonVideoCoverage:
        importedAudit.lessonVideos >= sourceAudit.lessonVideos
          ? null
          : `${importedAudit.lessonVideos} imported vs ${sourceAudit.lessonVideos} source`,
      topicVideoCoverage:
        importedAudit.topicVideos >= sourceAudit.topicVideos
          ? null
          : `${importedAudit.topicVideos} imported vs ${sourceAudit.topicVideos} source`,
    },
    fixedCoverImageUrl,
  });
}

console.log(JSON.stringify(report, null, 2));
