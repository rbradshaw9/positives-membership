import { createClient } from "@/lib/supabase/server";

/**
 * lib/queries/get-community-posts.ts
 * Fetches top-level community posts for a given content_id (weekly principle).
 * Includes like count, reply count, and author info.
 */

export type CommunityPostRow = {
  id: string;
  member_id: string;
  content_id: string | null;
  parent_id: string | null;
  body: string;
  post_type: "reflection" | "question" | "share";
  is_pinned: boolean;
  is_admin_answer: boolean;
  created_at: string;
  member: {
    name: string | null;
    avatar_url: string | null;
    subscription_tier: string | null;
  } | null;
  like_count: number;
  reply_count: number;
};

/**
 * Get top-level posts for a weekly principle thread.
 * Pinned posts first, then newest first.
 */
export async function getCommunityPosts(
  contentId: string,
  limit = 30
): Promise<CommunityPostRow[]> {
  const supabase = await createClient();

  // Fetch top-level posts (no parent)
  const { data: posts, error } = await supabase
    .from("community_post")
    .select(
      `
      id,
      member_id,
      content_id,
      parent_id,
      body,
      post_type,
      is_pinned,
      is_admin_answer,
      created_at,
      member:member_id ( name, avatar_url, subscription_tier )
    `
    )
    .eq("content_id", contentId)
    .is("parent_id", null)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !posts) return [];

  // Get like counts and reply counts in batch
  const postIds = posts.map((p) => p.id);

  const [likeCounts, replyCounts] = await Promise.all([
    getLikeCounts(postIds),
    getReplyCounts(postIds),
  ]);

  return posts.map((post) => ({
    ...post,
    member: Array.isArray(post.member) ? post.member[0] ?? null : post.member,
    like_count: likeCounts.get(post.id) ?? 0,
    reply_count: replyCounts.get(post.id) ?? 0,
  })) as CommunityPostRow[];
}

/**
 * Get replies for a specific post.
 */
export async function getPostReplies(
  parentId: string,
  limit = 50
): Promise<CommunityPostRow[]> {
  const supabase = await createClient();

  const { data: replies, error } = await supabase
    .from("community_post")
    .select(
      `
      id,
      member_id,
      content_id,
      parent_id,
      body,
      post_type,
      is_pinned,
      is_admin_answer,
      created_at,
      member:member_id ( name, avatar_url, subscription_tier )
    `
    )
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !replies) return [];

  const replyIds = replies.map((r) => r.id);
  const likeCounts = replyIds.length > 0 ? await getLikeCounts(replyIds) : new Map();

  return replies.map((reply) => ({
    ...reply,
    member: Array.isArray(reply.member) ? reply.member[0] ?? null : reply.member,
    like_count: likeCounts.get(reply.id) ?? 0,
    reply_count: 0,
  })) as CommunityPostRow[];
}

/**
 * Get which post IDs the current member has liked.
 */
export async function getMemberLikedPostIds(
  memberId: string,
  postIds: string[]
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();

  const supabase = await createClient();

  const { data } = await supabase
    .from("community_post_like")
    .select("post_id")
    .eq("member_id", memberId)
    .in("post_id", postIds);

  return new Set((data ?? []).map((row) => row.post_id));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getLikeCounts(postIds: string[]): Promise<Map<string, number>> {
  if (postIds.length === 0) return new Map();
  const supabase = await createClient();

  // Use a raw count grouped by post_id
  const { data } = await supabase
    .from("community_post_like")
    .select("post_id")
    .in("post_id", postIds);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }
  return counts;
}

async function getReplyCounts(postIds: string[]): Promise<Map<string, number>> {
  if (postIds.length === 0) return new Map();
  const supabase = await createClient();

  const { data } = await supabase
    .from("community_post")
    .select("parent_id")
    .in("parent_id", postIds);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.parent_id) {
      counts.set(row.parent_id, (counts.get(row.parent_id) ?? 0) + 1);
    }
  }
  return counts;
}
