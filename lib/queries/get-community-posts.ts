import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import type {
  CommunityModerationStatus,
  CommunityNotificationEventType,
  CommunityPostType,
  CommunityReportReason,
  CommunityReportStatus,
  CommunityThreadSourceType,
} from "@/lib/community/shared";

type CommunityAuthor = {
  name: string | null;
  avatar_url: string | null;
  subscription_tier: string | null;
} | null;

type RawCommunityThread = {
  id: string;
  member_id: string;
  source_type: CommunityThreadSourceType;
  content_id: string | null;
  title: string | null;
  body: string;
  post_type: CommunityPostType;
  moderation_status: CommunityModerationStatus;
  is_pinned: boolean;
  is_featured: boolean;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  member: CommunityAuthor | CommunityAuthor[];
};

type RawCommunityReply = {
  id: string;
  thread_id: string;
  member_id: string;
  parent_id: string | null;
  depth: number;
  body: string;
  moderation_status: CommunityModerationStatus;
  is_official_answer: boolean;
  created_at: string;
  member: CommunityAuthor | CommunityAuthor[];
};

type CommunitySavedRow = {
  id: string;
  member_id: string;
  thread_id: string | null;
  post_id: string | null;
  created_at: string;
};

type CommunityFollowRow = {
  thread_id: string;
};

type CommunityNotificationRowRaw = {
  id: string;
  member_id: string;
  thread_id: string;
  post_id: string | null;
  actor_member_id: string;
  event_type: CommunityNotificationEventType;
  read_at: string | null;
  created_at: string;
  actor: { name: string | null; avatar_url: string | null } | { name: string | null; avatar_url: string | null }[] | null;
};

type CommunityReportRowRaw = {
  id: string;
  member_id: string;
  thread_id: string | null;
  post_id: string | null;
  reason: CommunityReportReason;
  details: string | null;
  status: CommunityReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  moderator_note: string | null;
  created_at: string;
  updated_at: string;
  reporter: { name: string | null; email: string | null } | { name: string | null; email: string | null }[] | null;
  reviewer: { name: string | null; email: string | null } | { name: string | null; email: string | null }[] | null;
};

export type CommunityTagRow = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  thread_count: number;
};

export type CommunityReplyRow = {
  id: string;
  thread_id: string;
  member_id: string;
  parent_id: string | null;
  depth: number;
  body: string;
  moderation_status: CommunityModerationStatus;
  is_official_answer: boolean;
  created_at: string;
  member: CommunityAuthor;
  like_count: number;
  is_liked: boolean;
  is_saved: boolean;
  replies: CommunityReplyRow[];
};

export type CommunityThreadRow = {
  id: string;
  member_id: string;
  source_type: CommunityThreadSourceType;
  content_id: string | null;
  title: string | null;
  body: string;
  post_type: CommunityPostType;
  moderation_status: CommunityModerationStatus;
  is_pinned: boolean;
  is_featured: boolean;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  member: CommunityAuthor;
  tags: CommunityTagRow[];
  like_count: number;
  reply_count: number;
  is_liked: boolean;
  is_saved: boolean;
  is_following: boolean;
  unread_reply_count: number;
  replies: CommunityReplyRow[];
};

export type CommunityNotificationRow = {
  id: string;
  member_id: string;
  thread_id: string;
  post_id: string | null;
  actor_member_id: string;
  event_type: CommunityNotificationEventType;
  read_at: string | null;
  created_at: string;
  actor: { name: string | null; avatar_url: string | null } | null;
  thread: Pick<CommunityThreadRow, "id" | "title" | "post_type" | "source_type"> | null;
};

export type CommunitySavedItem = {
  id: string;
  created_at: string;
  type: "thread" | "post";
  thread: CommunityThreadRow | null;
  post: (CommunityReplyRow & { thread: Pick<CommunityThreadRow, "id" | "title" | "source_type" | "content_id"> | null }) | null;
};

export type AdminCommunityReportRow = {
  id: string;
  member_id: string;
  thread_id: string | null;
  post_id: string | null;
  reason: CommunityReportReason;
  details: string | null;
  status: CommunityReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  moderator_note: string | null;
  created_at: string;
  updated_at: string;
  reporter: { name: string | null; email: string | null } | null;
  reviewer: { name: string | null; email: string | null } | null;
  thread: Pick<CommunityThreadRow, "id" | "title" | "body" | "source_type" | "content_id" | "moderation_status"> | null;
  post: Pick<CommunityReplyRow, "id" | "body" | "depth" | "moderation_status" | "thread_id"> | null;
};

function normalizeJoined<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function countRowsByKey<T extends string>(rows: Array<Record<T, string>>, key: T) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[key];
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

async function getMemberSavedMaps(memberId: string | null | undefined) {
  if (!memberId) {
    return { savedThreadIds: new Set<string>(), savedPostIds: new Set<string>() };
  }

  const supabase = asLooseSupabaseClient(await createClient());
  const { data, error } = await supabase
    .from("community_saved_item")
    .select<Pick<CommunitySavedRow, "thread_id" | "post_id">[]>("thread_id, post_id")
    .eq("member_id", memberId);

  if (error) {
    console.error("[community] saved map lookup failed:", error.message);
    return { savedThreadIds: new Set<string>(), savedPostIds: new Set<string>() };
  }

  return {
    savedThreadIds: new Set((data ?? []).flatMap((row) => (row.thread_id ? [row.thread_id] : []))),
    savedPostIds: new Set((data ?? []).flatMap((row) => (row.post_id ? [row.post_id] : []))),
  };
}

async function getMemberLikedMaps(memberId: string | null | undefined, threadIds: string[], postIds: string[]) {
  if (!memberId) {
    return { likedThreadIds: new Set<string>(), likedPostIds: new Set<string>() };
  }

  const supabase = asLooseSupabaseClient(await createClient());

  const [threadLikesResult, postLikesResult] = await Promise.all([
    threadIds.length
      ? supabase
          .from("community_thread_like")
          .select<{ thread_id: string }[]>("thread_id")
          .eq("member_id", memberId)
          .in("thread_id", threadIds)
      : Promise.resolve({ data: [], error: null }),
    postIds.length
      ? supabase
          .from("community_post_like")
          .select<{ post_id: string }[]>("post_id")
          .eq("member_id", memberId)
          .in("post_id", postIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (threadLikesResult.error) {
    console.error("[community] thread like map lookup failed:", threadLikesResult.error.message);
  }
  if (postLikesResult.error) {
    console.error("[community] post like map lookup failed:", postLikesResult.error.message);
  }

  return {
    likedThreadIds: new Set((threadLikesResult.data ?? []).map((row) => row.thread_id)),
    likedPostIds: new Set((postLikesResult.data ?? []).map((row) => row.post_id)),
  };
}

async function getMemberFollowMap(memberId: string | null | undefined) {
  if (!memberId) {
    return new Set<string>();
  }

  const supabase = asLooseSupabaseClient(await createClient());
  const { data, error } = await supabase
    .from("community_follow")
    .select<CommunityFollowRow[]>("thread_id")
    .eq("member_id", memberId);

  if (error) {
    console.error("[community] follow map lookup failed:", error.message);
    return new Set<string>();
  }

  return new Set((data ?? []).map((row) => row.thread_id));
}

async function getMemberUnreadNotificationMaps(memberId: string | null | undefined) {
  if (!memberId) {
    return { unreadCount: 0, unreadByThread: new Map<string, number>() };
  }

  const supabase = asLooseSupabaseClient(await createClient());
  const { data, error } = await supabase
    .from("community_notification")
    .select<Array<{ thread_id: string }>>("thread_id")
    .eq("member_id", memberId)
    .is("read_at", null);

  if (error) {
    console.error("[community] unread notification lookup failed:", error.message);
    return { unreadCount: 0, unreadByThread: new Map<string, number>() };
  }

  const unreadByThread = countRowsByKey(data ?? [], "thread_id");

  return {
    unreadCount: (data ?? []).length,
    unreadByThread,
  };
}

async function getTagMapForThreads(
  threadIds: string[],
  admin = false
): Promise<Map<string, CommunityTagRow[]>> {
  const client = admin ? getAdminClient() : await createClient();
  const supabase = asLooseSupabaseClient(client);

  if (threadIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("community_thread_tag")
    .select<Array<{ thread_id: string; tag: CommunityTagRow | CommunityTagRow[] | null }>>(
      "thread_id, tag:tag_id ( id, slug, label, description, is_active, sort_order )"
    )
    .in("thread_id", threadIds);

  if (error) {
    console.error("[community] thread tag lookup failed:", error.message);
    return new Map();
  }

  const map = new Map<string, CommunityTagRow[]>();
  for (const row of data ?? []) {
    const tag = Array.isArray(row.tag) ? row.tag[0] ?? null : row.tag;
    if (!tag) continue;
    map.set(row.thread_id, [...(map.get(row.thread_id) ?? []), { ...tag, thread_count: 0 }]);
  }
  return map;
}

async function getRepliesForThreads(
  threadIds: string[],
  memberId?: string | null,
  admin = false
): Promise<Map<string, CommunityReplyRow[]>> {
  if (threadIds.length === 0) return new Map();

  const client = admin ? getAdminClient() : await createClient();
  const supabase = asLooseSupabaseClient(client);

  let query = supabase
    .from("community_post")
    .select<RawCommunityReply[]>(
      `
      id,
      thread_id,
      member_id,
      parent_id,
      depth,
      body,
      moderation_status,
      is_official_answer,
      created_at,
      member:member_id ( name, avatar_url, subscription_tier )
    `
    )
    .in("thread_id", threadIds)
    .order("created_at", { ascending: true });

  if (!admin) {
    query = query.eq("moderation_status", "visible");
  }

  const { data: replies, error } = await query;
  if (error) {
    console.error("[community] replies lookup failed:", error.message);
    return new Map();
  }

  const replyIds = (replies ?? []).map((reply) => reply.id);
  const [postLikeResult, savedMaps, likedMaps] = await Promise.all([
    replyIds.length
      ? supabase
          .from("community_post_like")
          .select<{ post_id: string }[]>("post_id")
          .in("post_id", replyIds)
      : Promise.resolve({ data: [], error: null }),
    getMemberSavedMaps(memberId),
    getMemberLikedMaps(memberId, [], replyIds),
  ]);

  if (postLikeResult.error) {
    console.error("[community] reply like counts failed:", postLikeResult.error.message);
  }

  const likeCounts = countRowsByKey(postLikeResult.data ?? [], "post_id");
  const repliesByThread = new Map<string, CommunityReplyRow[]>();

  for (const reply of replies ?? []) {
    const normalized: CommunityReplyRow = {
      ...reply,
      parent_id: null,
      depth: 1,
      member: normalizeJoined(reply.member),
      like_count: likeCounts.get(reply.id) ?? 0,
      is_liked: likedMaps.likedPostIds.has(reply.id),
      is_saved: savedMaps.savedPostIds.has(reply.id),
      replies: [],
    };

    repliesByThread.set(reply.thread_id, [...(repliesByThread.get(reply.thread_id) ?? []), normalized]);
  }

  return repliesByThread;
}

async function getThreadRows(
  {
    memberId,
    sourceType,
    contentId,
    limit = 24,
    ids,
    tagSlug,
    lane,
    admin = false,
  }: {
    memberId?: string | null;
    sourceType?: CommunityThreadSourceType;
    contentId?: string | null;
    limit?: number;
    ids?: string[];
    tagSlug?: string;
    lane?: CommunityPostType;
    admin?: boolean;
  }
): Promise<CommunityThreadRow[]> {
  const client = admin ? getAdminClient() : await createClient();
  const supabase = asLooseSupabaseClient(client);

  let filteredIds = ids ?? null;

  if (tagSlug) {
    const { data: tag } = await supabase
      .from("community_tag")
      .select<{ id: string }>("id")
      .eq("slug", tagSlug)
      .maybeSingle();

    if (!tag?.id) return [];

    const { data: joinRows, error: joinError } = await supabase
      .from("community_thread_tag")
      .select<{ thread_id: string }[]>("thread_id")
      .eq("tag_id", tag.id);

    if (joinError) {
      console.error("[community] topic filter lookup failed:", joinError.message);
      return [];
    }

    filteredIds = joinRows?.map((row) => row.thread_id) ?? [];
  }

  if (filteredIds && filteredIds.length === 0) return [];

  let query = supabase
    .from("community_thread")
    .select<RawCommunityThread[]>(
      `
      id,
      member_id,
      source_type,
      content_id,
      title,
      body,
      post_type,
      moderation_status,
      is_pinned,
      is_featured,
      last_activity_at,
      created_at,
      updated_at,
      member:member_id ( name, avatar_url, subscription_tier )
    `
    )
    .order("is_pinned", { ascending: false })
    .order("is_featured", { ascending: false })
    .order("last_activity_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!admin) {
    query = query.eq("moderation_status", "visible");
  }
  if (sourceType) {
    query = query.eq("source_type", sourceType);
  }
  if (lane) {
    query = query.eq("post_type", lane);
  }
  if (contentId) {
    query = query.eq("content_id", contentId);
  }
  if (filteredIds) {
    query = query.in("id", filteredIds);
  }

  const { data: threads, error } = await query;

  if (error || !threads) {
    if (error) console.error("[community] thread lookup failed:", error.message);
    return [];
  }

  const threadIds = threads.map((thread) => thread.id);
  const [threadLikeResult, tagMap, repliesByThread, savedMaps, likedMaps, followedThreadIds, unreadMaps] = await Promise.all([
    threadIds.length
      ? supabase
          .from("community_thread_like")
          .select<{ thread_id: string }[]>("thread_id")
          .in("thread_id", threadIds)
      : Promise.resolve({ data: [], error: null }),
    getTagMapForThreads(threadIds, admin),
    getRepliesForThreads(threadIds, memberId, admin),
    getMemberSavedMaps(memberId),
    getMemberLikedMaps(memberId, threadIds, []),
    getMemberFollowMap(memberId),
    getMemberUnreadNotificationMaps(memberId),
  ]);

  if (threadLikeResult.error) {
    console.error("[community] thread like counts failed:", threadLikeResult.error.message);
  }

  const likeCounts = countRowsByKey(threadLikeResult.data ?? [], "thread_id");

  return threads.map((thread) => {
    const replies = repliesByThread.get(thread.id) ?? [];
    const replyCount = replies.length;

    return {
      ...thread,
      member: normalizeJoined(thread.member),
      tags: tagMap.get(thread.id) ?? [],
      like_count: likeCounts.get(thread.id) ?? 0,
      reply_count: replyCount,
      is_liked: likedMaps.likedThreadIds.has(thread.id),
      is_saved: savedMaps.savedThreadIds.has(thread.id),
      is_following: followedThreadIds.has(thread.id),
      unread_reply_count: unreadMaps.unreadByThread.get(thread.id) ?? 0,
      replies,
    };
  });
}

export async function getCommunityTags(): Promise<CommunityTagRow[]> {
  const supabase = asLooseSupabaseClient(await createClient());

  const { data: tags, error } = await supabase
    .from("community_tag")
    .select<CommunityTagRow[]>("id, slug, label, description, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error || !tags) {
    if (error) console.error("[community] tag lookup failed:", error.message);
    return [];
  }

  const tagIds = tags.map((tag) => tag.id);
  const { data: joins, error: joinError } = await supabase
    .from("community_thread_tag")
    .select<Array<{ tag_id: string; thread: { moderation_status: CommunityModerationStatus } | { moderation_status: CommunityModerationStatus }[] | null }>>(
      "tag_id, thread:thread_id ( moderation_status )"
    )
    .in("tag_id", tagIds);

  if (joinError) {
    console.error("[community] tag count lookup failed:", joinError.message);
  }

  const counts = new Map<string, number>();
  for (const row of joins ?? []) {
    const thread = Array.isArray(row.thread) ? row.thread[0] ?? null : row.thread;
    if (!thread || thread.moderation_status !== "visible") continue;
    counts.set(row.tag_id, (counts.get(row.tag_id) ?? 0) + 1);
  }

  return tags.map((tag) => ({ ...tag, thread_count: counts.get(tag.id) ?? 0 }));
}

export async function getWeeklyCommunityThreads(
  contentId: string,
  memberId?: string | null,
  limit = 16
) {
  return getThreadRows({ memberId, sourceType: "weekly_principle", contentId, limit });
}

export async function getStandaloneCommunityThreads(
  memberId?: string | null,
  {
    limit = 24,
    tagSlug,
  }: {
    limit?: number;
    tagSlug?: string;
  } = {}
) {
  return getThreadRows({ memberId, sourceType: "standalone", limit, tagSlug });
}

export async function getCommunityFeedThreads(
  memberId?: string | null,
  {
    limit = 24,
    lane,
  }: {
    limit?: number;
    lane?: CommunityPostType;
  } = {}
) {
  return getThreadRows({ memberId, limit, lane });
}

export async function getFollowingCommunityThreads(
  memberId: string,
  {
    limit = 24,
  }: {
    limit?: number;
  } = {}
) {
  const supabase = asLooseSupabaseClient(await createClient());
  const { data, error } = await supabase
    .from("community_follow")
    .select<CommunityFollowRow[]>("thread_id")
    .eq("member_id", memberId)
    .limit(limit);

  if (error) {
    console.error("[community] following thread lookup failed:", error.message);
    return [];
  }

  const threadIds = [...new Set((data ?? []).map((row) => row.thread_id))];
  if (threadIds.length === 0) return [];

  const threads = await getThreadRows({
    memberId,
    ids: threadIds,
    limit: Math.max(threadIds.length, limit),
  });

  return threads.sort((a, b) => {
    if (b.unread_reply_count !== a.unread_reply_count) {
      return b.unread_reply_count - a.unread_reply_count;
    }
    return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
  });
}

export async function getCommunityUnreadCount(memberId: string) {
  const unreadMaps = await getMemberUnreadNotificationMaps(memberId);
  return unreadMaps.unreadCount;
}

export async function getCommunityNotifications(
  memberId: string,
  {
    limit = 8,
    unreadOnly = true,
  }: {
    limit?: number;
    unreadOnly?: boolean;
  } = {}
): Promise<CommunityNotificationRow[]> {
  const supabase = asLooseSupabaseClient(await createClient());

  let query = supabase
    .from("community_notification")
    .select<CommunityNotificationRowRaw[]>(
      `
      id,
      member_id,
      thread_id,
      post_id,
      actor_member_id,
      event_type,
      read_at,
      created_at,
      actor:actor_member_id ( name, avatar_url )
    `
    )
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;
  if (error || !data) {
    if (error) console.error("[community] notification lookup failed:", error.message);
    return [];
  }

  const threadIds = [...new Set(data.map((row) => row.thread_id))];
  const threads = threadIds.length
    ? await getThreadRows({ memberId, ids: threadIds, limit: threadIds.length })
    : [];
  const threadMap = new Map(threads.map((thread) => [thread.id, thread]));

  const notifications = data
    .map((row): CommunityNotificationRow | null => {
      const thread = threadMap.get(row.thread_id);
      if (!thread) return null;

      return {
        ...row,
        actor: normalizeJoined(row.actor),
        thread: {
          id: thread.id,
          title: thread.title,
          post_type: thread.post_type,
          source_type: thread.source_type,
        },
      };
    })
    .filter((row): row is CommunityNotificationRow => Boolean(row));

  return notifications;
}

export async function getSavedCommunityItems(
  memberId: string,
  limit = 24
): Promise<CommunitySavedItem[]> {
  const supabase = asLooseSupabaseClient(await createClient());
  const { data: savedRows, error } = await supabase
    .from("community_saved_item")
    .select<CommunitySavedRow[]>("id, member_id, thread_id, post_id, created_at")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !savedRows?.length) {
    if (error) console.error("[community] saved item lookup failed:", error.message);
    return [];
  }

  const savedThreadIds = [...new Set(savedRows.flatMap((row) => (row.thread_id ? [row.thread_id] : [])))];
  const savedPostIds = [...new Set(savedRows.flatMap((row) => (row.post_id ? [row.post_id] : [])))];

  const threads = await getThreadRows({
    memberId,
    ids: savedThreadIds,
    limit: Math.max(savedThreadIds.length, 1),
  });
  const threadMap = new Map(threads.map((thread) => [thread.id, thread]));

  const { data: rawPosts, error: postError } = savedPostIds.length
    ? await supabase
        .from("community_post")
        .select<RawCommunityReply[]>(
          `
          id,
          thread_id,
          member_id,
          parent_id,
          depth,
          body,
          moderation_status,
          is_official_answer,
          created_at,
          member:member_id ( name, avatar_url, subscription_tier )
        `
        )
        .in("id", savedPostIds)
    : { data: [], error: null };

  if (postError) {
    console.error("[community] saved post lookup failed:", postError.message);
  }

  const postRows = rawPosts ?? [];
  const savedPostThreadIds = [...new Set(postRows.map((post) => post.thread_id).filter((id) => !threadMap.has(id)))];
  const extraThreads = savedPostThreadIds.length
    ? await getThreadRows({
        memberId,
        ids: savedPostThreadIds,
        limit: savedPostThreadIds.length,
      })
    : [];

  for (const thread of extraThreads) {
    threadMap.set(thread.id, thread);
  }

  const [postLikeResult, likedMaps, savedMaps] = await Promise.all([
    savedPostIds.length
      ? supabase
          .from("community_post_like")
          .select<{ post_id: string }[]>("post_id")
          .in("post_id", savedPostIds)
      : Promise.resolve({ data: [], error: null }),
    getMemberLikedMaps(memberId, [], savedPostIds),
    getMemberSavedMaps(memberId),
  ]);

  if (postLikeResult.error) {
    console.error("[community] saved post likes failed:", postLikeResult.error.message);
  }

  const postLikeCounts = countRowsByKey(postLikeResult.data ?? [], "post_id");
  const postMap = new Map(
    postRows.map((post) => [
      post.id,
      {
        ...post,
        member: normalizeJoined(post.member),
        like_count: postLikeCounts.get(post.id) ?? 0,
        is_liked: likedMaps.likedPostIds.has(post.id),
        is_saved: savedMaps.savedPostIds.has(post.id),
        replies: [],
      } satisfies CommunityReplyRow,
    ])
  );

  return savedRows.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    type: row.thread_id ? "thread" : "post",
    thread: row.thread_id ? threadMap.get(row.thread_id) ?? null : null,
    post: row.post_id
      ? (() => {
          const post = postMap.get(row.post_id);
          if (!post) return null;
          const thread = threadMap.get(post.thread_id);
          return {
            ...post,
            thread: thread
              ? {
                  id: thread.id,
                  title: thread.title,
                  source_type: thread.source_type,
                  content_id: thread.content_id,
                }
              : null,
          };
        })()
      : null,
  }));
}

export async function getAdminCommunityTags(): Promise<CommunityTagRow[]> {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("community_tag")
    .select<CommunityTagRow[]>("id, slug, label, description, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error || !data) {
    if (error) console.error("[community/admin] tags lookup failed:", error.message);
    return [];
  }

  return data.map((tag) => ({ ...tag, thread_count: 0 }));
}

export async function getAdminCommunityThreads(limit = 32) {
  return getThreadRows({ admin: true, limit });
}

export async function getAdminCommunityReports(limit = 40): Promise<AdminCommunityReportRow[]> {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: reports, error } = await supabase
    .from("community_report")
    .select<CommunityReportRowRaw[]>(
      `
      id,
      member_id,
      thread_id,
      post_id,
      reason,
      details,
      status,
      reviewed_by,
      reviewed_at,
      moderator_note,
      created_at,
      updated_at,
      reporter:member_id ( name, email ),
      reviewer:reviewed_by ( name, email )
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !reports) {
    if (error) console.error("[community/admin] report lookup failed:", error.message);
    return [];
  }

  const threadIds = [...new Set(reports.flatMap((row) => (row.thread_id ? [row.thread_id] : [])))];
  const postIds = [...new Set(reports.flatMap((row) => (row.post_id ? [row.post_id] : [])))];

  const [threads, postResult] = await Promise.all([
    threadIds.length ? getThreadRows({ admin: true, ids: threadIds, limit: threadIds.length }) : [],
    postIds.length
      ? supabase
          .from("community_post")
          .select<Array<Pick<CommunityReplyRow, "id" | "thread_id" | "body" | "depth" | "moderation_status">>>(
            "id, thread_id, body, depth, moderation_status"
          )
          .in("id", postIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (postResult.error) {
    console.error("[community/admin] report post lookup failed:", postResult.error.message);
  }

  const threadMap = new Map(threads.map((thread) => [thread.id, thread]));
  const postMap = new Map((postResult.data ?? []).map((post) => [post.id, post]));

  return reports.map((report) => ({
    ...report,
    reporter: normalizeJoined(report.reporter),
    reviewer: normalizeJoined(report.reviewer),
    thread: report.thread_id
      ? (() => {
          const thread = threadMap.get(report.thread_id);
          return thread
            ? {
                id: thread.id,
                title: thread.title,
                body: thread.body,
                source_type: thread.source_type,
                content_id: thread.content_id,
                moderation_status: thread.moderation_status,
              }
            : null;
        })()
      : null,
    post: report.post_id ? postMap.get(report.post_id) ?? null : null,
  }));
}
