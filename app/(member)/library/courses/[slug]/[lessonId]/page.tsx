import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourseLesson, memberCanAccessCourse } from "@/lib/queries/get-courses";
import { LessonViewer } from "@/components/courses/LessonViewer";
import type { Metadata } from "next";
import { hasActiveMemberAccess } from "@/lib/subscription/access";

/**
 * app/(member)/library/courses/[slug]/[lessonId]/page.tsx
 *
 * Lesson viewer — renders video, body, resources, mark-complete, and prev/next nav.
 */

interface Props {
  params: Promise<{ slug: string; lessonId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params;
  return {
    title: `Lesson — Positives`,
  };
}

export default async function LessonPage({ params }: Props) {
  const { lessonId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("member")
    .select("id, subscription_tier, subscription_status")
    .eq("id", user.id)
    .single();

  if (!member) redirect("/account");

  const lesson = await getCourseLesson(lessonId, member.id);

  if (!lesson) notFound();

  const canAccess = await memberCanAccessCourse({
    memberId: member.id,
    memberTier: member.subscription_tier,
    hasSubscriptionAccess: hasActiveMemberAccess(member.subscription_status),
    courseId: lesson.course_id,
    courseTierMin: lesson.course_tier_min,
  });

  if (!canAccess) redirect("/library?upgrade=true");

  return <LessonViewer lesson={lesson} memberId={member.id} />;
}
