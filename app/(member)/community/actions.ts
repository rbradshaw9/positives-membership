"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { hasAdminPermission } from "@/lib/auth/require-admin";
import {
  type CommunityNotificationEventType,
  isCommunityPostType,
  isCommunityReportReason,
} from "@/lib/community/shared";
import { POINT_VALUES, awardMemberPoints } from "@/lib/points/award";

type ActionResult = { error?: string; success?: string };
type ToggleResult = { error?: string; active?: boolean };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return { user, supabase: asLooseSupabaseClient(supabase) };
}

async function canModerateCommunity(memberId: string, email?: string | null) {
  return hasAdminPermission(memberId, "community.moderate", email);
}

async function writeCommunityActivity(params: {
  memberId: string;
  eventType: "community_post_created" | "community_reply_created";
  contentId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = asLooseSupabaseClient(await createClient());
  const { error } = await supabase.from("activity_event").insert({
    member_id: params.memberId,
    event_type: params.eventType,
    content_id: params.contentId ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("[community] activity insert failed:", error.message);
  }
}

async function touchThreadActivity(threadId: string) {
  const supabase = asLooseSupabaseClient(await createClient());
  const { error } = await supabase
    .from("community_thread")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", threadId);

  if (error) {
    console.error("[community] thread activity touch failed:", error.message);
  }
}

async function ensureThreadFollow(memberId: string, threadId: string) {
  const supabase = asLooseSupabaseClient(await createClient());
  const { error } = await supabase
    .from("community_follow")
    .upsert(
      {
        member_id: memberId,
        thread_id: threadId,
      },
      {
        onConflict: "member_id,thread_id",
        ignoreDuplicates: true,
      }
    );

  if (error) {
    console.error("[community] thread follow upsert failed:", error.message);
  }
}

async function createReplyNotifications(params: {
  threadId: string;
  replyId: string;
  actorMemberId: string;
}) {
  const supabase = asLooseSupabaseClient(getAdminClient());

  const [{ data: thread, error: threadError }, { data: follows, error: followError }] = await Promise.all([
    supabase
      .from("community_thread")
      .select<{ id: string; member_id: string }>("id, member_id")
      .eq("id", params.threadId)
      .maybeSingle(),
    supabase
      .from("community_follow")
      .select<Array<{ member_id: string }>>("member_id")
      .eq("thread_id", params.threadId),
  ]);

  if (threadError || !thread) {
    console.error("[community] notification thread lookup failed:", threadError?.message);
    return;
  }

  if (followError) {
    console.error("[community] notification follow lookup failed:", followError.message);
    return;
  }

  const recipients = new Map<string, CommunityNotificationEventType>();

  if (thread.member_id && thread.member_id !== params.actorMemberId) {
    recipients.set(thread.member_id, "reply_to_my_post");
  }

  for (const row of follows ?? []) {
    if (!row.member_id || row.member_id === params.actorMemberId) continue;
    if (!recipients.has(row.member_id)) {
      recipients.set(row.member_id, "reply_in_followed_thread");
    }
  }

  if (recipients.size === 0) return;

  const payload = [...recipients.entries()].map(([memberId, eventType]) => ({
    member_id: memberId,
    thread_id: params.threadId,
    post_id: params.replyId,
    actor_member_id: params.actorMemberId,
    event_type: eventType,
  }));

  const { error } = await supabase.from("community_notification").insert(payload);

  if (error) {
    console.error("[community] notification insert failed:", error.message);
  }
}

export async function createWeeklyThread(
  contentId: string,
  body: string,
  postType: string
): Promise<ActionResult> {
  const { user, supabase } = await requireUser();
  const trimmedBody = body.trim();

  if (!contentId) return { error: "Missing weekly thread context." };
  if (!isCommunityPostType(postType)) return { error: "Choose a valid post type." };
  if (trimmedBody.length < 3) return { error: "Share at least a few words." };
  if (trimmedBody.length > 4000) return { error: "Please keep your post under 4,000 characters." };

  const { data: created, error } = await supabase
    .from("community_thread")
    .insert({
      member_id: user.id,
      source_type: "weekly_principle",
      content_id: contentId,
      body: trimmedBody,
      post_type: postType,
    })
    .select<{ id: string }>("id")
    .single();

  if (error || !created) {
    console.error("[community] createWeeklyThread failed:", error?.message);
    return { error: "Something interrupted that post. Please try again." };
  }

  await ensureThreadFollow(user.id, created.id);

  void writeCommunityActivity({
    memberId: user.id,
    eventType: "community_post_created",
    contentId,
    metadata: { thread_id: created.id, source_type: "weekly_principle", post_type: postType },
  });

  void awardMemberPoints({
    memberId: user.id,
    delta: POINT_VALUES.communityPost,
    reason: "community_post",
    description: "Community thread created",
    contentId,
    idempotencyKey: `community_thread:${created.id}`,
    metadata: { thread_id: created.id, source_type: "weekly_principle", post_type: postType },
  });

  revalidatePath("/community");
  revalidatePath("/admin/community");
  return { success: "Posted to this week’s conversation." };
}

export async function createCommunityPost(input: {
  title?: string;
  body: string;
  postType: string;
}): Promise<ActionResult> {
  const { user, supabase } = await requireUser();
  const title = input.title?.trim() ?? "";
  const body = input.body.trim();

  if (!isCommunityPostType(input.postType)) return { error: "Choose a valid post type." };
  if (title.length > 120) return { error: "Keep the headline under 120 characters." };
  if (body.length < 8) return { error: "Share a little more so the room knows how to meet you." };
  if (body.length > 4000) return { error: "Please keep your post under 4,000 characters." };

  const { data: created, error } = await supabase
    .from("community_thread")
    .insert({
      member_id: user.id,
      source_type: "standalone",
      title: title || null,
      body,
      post_type: input.postType,
    })
    .select<{ id: string }>("id")
    .single();

  if (error || !created) {
    console.error("[community] createCommunityPost failed:", error?.message);
    return { error: "Something interrupted that post. Please try again." };
  }

  await ensureThreadFollow(user.id, created.id);

  void writeCommunityActivity({
    memberId: user.id,
    eventType: "community_post_created",
    metadata: { thread_id: created.id, source_type: "standalone", post_type: input.postType },
  });

  void awardMemberPoints({
    memberId: user.id,
    delta: POINT_VALUES.communityPost,
    reason: "community_post",
    description: "Community post created",
    idempotencyKey: `community_thread:${created.id}`,
    metadata: { thread_id: created.id, source_type: "standalone", post_type: input.postType },
  });

  revalidatePath("/community");
  revalidatePath("/admin/community");
  return { success: "Your post is now live." };
}

export async function createReply(input: {
  threadId: string;
  body: string;
  parentId?: string | null;
}): Promise<ActionResult> {
  const { user, supabase } = await requireUser();
  const body = input.body.trim();

  if (!input.threadId) return { error: "Missing discussion context." };
  if (body.length < 2) return { error: "Your reply needs at least a couple of words." };
  if (body.length > 2000) return { error: "Please keep replies under 2,000 characters." };

  const { data: thread, error: threadError } = await supabase
    .from("community_thread")
    .select<{ id: string; content_id: string | null }>("id, content_id")
    .eq("id", input.threadId)
    .maybeSingle();

  if (threadError || !thread) {
    console.error("[community] reply thread lookup failed:", threadError?.message);
    return { error: "That discussion could not be found." };
  }

  const { data: created, error } = await supabase
    .from("community_post")
    .insert({
      member_id: user.id,
      thread_id: input.threadId,
      parent_id: null,
      depth: 1,
      body,
      content_id: thread.content_id,
      post_type: "reflection",
    })
    .select<{ id: string }>("id")
    .single();

  if (error || !created) {
    console.error("[community] createReply failed:", error?.message);
    return { error: "Something interrupted that reply. Please try again." };
  }

  await ensureThreadFollow(user.id, input.threadId);
  await touchThreadActivity(input.threadId);
  await createReplyNotifications({
    threadId: input.threadId,
    replyId: created.id,
    actorMemberId: user.id,
  });

  void writeCommunityActivity({
    memberId: user.id,
    eventType: "community_reply_created",
    contentId: thread.content_id,
    metadata: { post_id: created.id, thread_id: input.threadId, parent_id: null, depth: 1 },
  });

  void awardMemberPoints({
    memberId: user.id,
    delta: POINT_VALUES.communityReply,
    reason: "community_reply",
    description: "Community reply created",
    contentId: thread.content_id,
    idempotencyKey: `community_reply:${created.id}`,
    metadata: { post_id: created.id, thread_id: input.threadId, parent_id: null, depth: 1 },
  });

  revalidatePath("/community");
  revalidatePath("/admin/community");
  return { success: "Reply added." };
}

export async function deleteThread(threadId: string): Promise<ActionResult> {
  const { user, supabase } = await requireUser();
  const moderator = await canModerateCommunity(user.id, user.email);

  const { data: thread, error: lookupError } = await supabase
    .from("community_thread")
    .select<{ id: string; member_id: string }>("id, member_id")
    .eq("id", threadId)
    .maybeSingle();

  if (lookupError || !thread) {
    return { error: "That discussion could not be found." };
  }

  if (!moderator && thread.member_id !== user.id) {
    return { error: "You can only delete your own discussions." };
  }

  const { error } = await supabase.from("community_thread").delete().eq("id", threadId);
  if (error) {
    console.error("[community] deleteThread failed:", error.message);
    return { error: "That discussion could not be deleted." };
  }

  revalidatePath("/community");
  revalidatePath("/admin/community");
  return { success: "Discussion deleted." };
}

export async function deleteReply(postId: string): Promise<ActionResult> {
  const { user, supabase } = await requireUser();
  const moderator = await canModerateCommunity(user.id, user.email);

  const { data: reply, error: lookupError } = await supabase
    .from("community_post")
    .select<{ id: string; member_id: string; thread_id: string }>("id, member_id, thread_id")
    .eq("id", postId)
    .maybeSingle();

  if (lookupError || !reply) {
    return { error: "That reply could not be found." };
  }

  if (!moderator && reply.member_id !== user.id) {
    return { error: "You can only delete your own replies." };
  }

  const { error } = await supabase.from("community_post").delete().eq("id", postId);
  if (error) {
    console.error("[community] deleteReply failed:", error.message);
    return { error: "That reply could not be deleted." };
  }

  await touchThreadActivity(reply.thread_id);
  revalidatePath("/community");
  revalidatePath("/admin/community");
  return { success: "Reply deleted." };
}

async function toggleUniqueRow(params: {
  table: "community_thread_like" | "community_post_like" | "community_saved_item" | "community_follow";
  match: Record<string, string>;
}): Promise<ToggleResult> {
  const { user, supabase } = await requireUser();
  const conditions = Object.entries({ ...params.match, member_id: user.id });

  let lookup = supabase.from(params.table).select<{ id: string }[]>("id");
  for (const [key, value] of conditions) {
    lookup = lookup.eq(key, value);
  }

  const { data: existingRows, error: lookupError } = await lookup.limit(1);
  if (lookupError) {
    console.error(`[community] ${params.table} lookup failed:`, lookupError.message);
    return { error: "Please try again." };
  }

  const existing = existingRows?.[0];
  if (existing?.id) {
    const { error } = await supabase.from(params.table).delete().eq("id", existing.id);
    if (error) {
      console.error(`[community] ${params.table} delete failed:`, error.message);
      return { error: "Please try again." };
    }
    revalidatePath("/community");
    return { active: false };
  }

  const { error } = await supabase.from(params.table).insert({ ...params.match, member_id: user.id });
  if (error) {
    console.error(`[community] ${params.table} insert failed:`, error.message);
    return { error: "Please try again." };
  }

  revalidatePath("/community");
  return { active: true };
}

export async function toggleThreadLike(threadId: string) {
  return toggleUniqueRow({
    table: "community_thread_like",
    match: { thread_id: threadId },
  });
}

export async function togglePostLike(postId: string) {
  return toggleUniqueRow({
    table: "community_post_like",
    match: { post_id: postId },
  });
}

export async function toggleSaveThread(threadId: string) {
  const result = await toggleUniqueRow({
    table: "community_saved_item",
    match: { thread_id: threadId },
  });
  revalidatePath("/community");
  return result;
}

export async function toggleSavePost(postId: string) {
  const result = await toggleUniqueRow({
    table: "community_saved_item",
    match: { post_id: postId },
  });
  revalidatePath("/community");
  return result;
}

export async function toggleFollowThread(threadId: string) {
  const result = await toggleUniqueRow({
    table: "community_follow",
    match: { thread_id: threadId },
  });
  revalidatePath("/community");
  return result;
}

export async function markCommunityNotificationRead(notificationId: string): Promise<ActionResult> {
  const { user, supabase } = await requireUser();

  const { error } = await supabase
    .from("community_notification")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("member_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("[community] mark notification read failed:", error.message);
    return { error: "That update could not be saved." };
  }

  revalidatePath("/community");
  return { success: "Notification marked read." };
}

export async function markCommunityThreadNotificationsRead(threadId: string): Promise<ActionResult> {
  const { user, supabase } = await requireUser();

  const { error } = await supabase
    .from("community_notification")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("member_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("[community] mark thread notifications read failed:", error.message);
    return { error: "That update could not be saved." };
  }

  revalidatePath("/community");
  return { success: "Discussion notifications cleared." };
}

export async function markAllCommunityNotificationsRead(): Promise<ActionResult> {
  const { user, supabase } = await requireUser();

  const { error } = await supabase
    .from("community_notification")
    .update({ read_at: new Date().toISOString() })
    .eq("member_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("[community] mark all notifications read failed:", error.message);
    return { error: "Those notifications could not be cleared." };
  }

  revalidatePath("/community");
  return { success: "All notifications marked read." };
}

async function createReport(params: {
  threadId?: string;
  postId?: string;
  reason: string;
  details?: string;
}): Promise<ActionResult> {
  const { user, supabase } = await requireUser();
  const details = params.details?.trim() ?? "";

  if (!params.threadId && !params.postId) return { error: "Missing report context." };
  if (!isCommunityReportReason(params.reason)) return { error: "Choose a valid report reason." };
  if (details.length > 1500) return { error: "Please keep the note under 1,500 characters." };

  const { error } = await supabase.from("community_report").insert({
    member_id: user.id,
    thread_id: params.threadId ?? null,
    post_id: params.postId ?? null,
    reason: params.reason,
    details: details || null,
  });

  if (error) {
    console.error("[community] createReport failed:", error.message);
    return { error: "That report could not be sent right now." };
  }

  revalidatePath("/admin/community");
  return { success: "Thanks. We’ve queued that for review." };
}

export async function reportThread(threadId: string, reason: string, details?: string) {
  return createReport({ threadId, reason, details });
}

export async function reportPost(postId: string, reason: string, details?: string) {
  return createReport({ postId, reason, details });
}
