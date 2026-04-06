import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourseLesson } from "@/lib/queries/get-courses";
import { LessonViewer } from "@/components/courses/LessonViewer";
import type { Metadata } from "next";

/**
 * app/(member)/library/courses/[slug]/[lessonId]/page.tsx
 *
 * Lesson viewer — renders video, body, resources, mark-complete, and prev/next nav.
 */

interface Props {
  params: Promise<{ slug: string; lessonId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonId } = await params;
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

  if (!member || member.subscription_status !== "active") redirect("/account");

  const lesson = await getCourseLesson(lessonId, member.id);

  if (!lesson) notFound();

  return <LessonViewer lesson={lesson} memberId={member.id} />;
}
