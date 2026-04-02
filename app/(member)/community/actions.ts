"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { config } from "@/lib/config";

/**
 * app/(member)/community/actions.ts
 * Server actions for the Community Q&A section.
 *
 * All actions require authenticated user. Admin-only actions
 * additionally check the ADMIN_EMAILS config list.
 */

// ── Helper: get current user or throw ────────────────────────────────────────

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");
  return { user, supabase };
}

function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return config.app.adminEmails.includes(email);
}

// ── Create a new post or question ────────────────────────────────────────────

export async function createPost(
  contentId: string,
  body: string,
  postType: "reflection" | "question" | "share" = "reflection"
): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser();

  const trimmed = body.trim();
  if (!trimmed || trimmed.length < 3) {
    return { error: "Your post needs at least a few words." };
  }

  if (trimmed.length > 4000) {
    return { error: "Please keep your post under 4,000 characters." };
  }

  const { error } = await supabase.from("community_post").insert({
    member_id: user.id,
    content_id: contentId,
    body: trimmed,
    post_type: postType,
  });

  if (error) {
    console.error("[createPost] insert error:", error.message);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath("/community");
  return {};
}

// ── Create a reply to a post ─────────────────────────────────────────────────

export async function createReply(
  parentId: string,
  body: string
): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser();

  const trimmed = body.trim();
  if (!trimmed || trimmed.length < 2) {
    return { error: "Your reply needs at least a couple of words." };
  }

  if (trimmed.length > 2000) {
    return { error: "Please keep replies under 2,000 characters." };
  }

  // Get the parent post to inherit content_id
  const { data: parent } = await supabase
    .from("community_post")
    .select("content_id")
    .eq("id", parentId)
    .single();

  if (!parent) {
    return { error: "The post you're replying to was not found." };
  }

  const { error } = await supabase.from("community_post").insert({
    member_id: user.id,
    content_id: parent.content_id,
    parent_id: parentId,
    body: trimmed,
    post_type: "reflection",
  });

  if (error) {
    console.error("[createReply] insert error:", error.message);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath("/community");
  return {};
}

// ── Delete a post ────────────────────────────────────────────────────────────

export async function deletePost(postId: string): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser();

  // Admins can delete any post; members can only delete their own
  const isAdmin = isAdminEmail(user.email);

  if (isAdmin) {
    const { error } = await supabase
      .from("community_post")
      .delete()
      .eq("id", postId);

    if (error) {
      console.error("[deletePost] admin delete error:", error.message);
      return { error: "Failed to delete this post." };
    }
  } else {
    const { error } = await supabase
      .from("community_post")
      .delete()
      .eq("id", postId)
      .eq("member_id", user.id);

    if (error) {
      console.error("[deletePost] delete error:", error.message);
      return { error: "Failed to delete this post." };
    }
  }

  revalidatePath("/community");
  return {};
}

// ── Toggle like ──────────────────────────────────────────────────────────────

export async function toggleLike(postId: string): Promise<{ liked: boolean; error?: string }> {
  const { user, supabase } = await requireUser();

  // Check if already liked
  const { data: existing } = await supabase
    .from("community_post_like")
    .select("id")
    .eq("post_id", postId)
    .eq("member_id", user.id)
    .maybeSingle();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from("community_post_like")
      .delete()
      .eq("id", existing.id);

    if (error) {
      console.error("[toggleLike] delete error:", error.message);
      return { liked: true, error: "Failed to unlike." };
    }

    revalidatePath("/community");
    return { liked: false };
  } else {
    // Like
    const { error } = await supabase.from("community_post_like").insert({
      post_id: postId,
      member_id: user.id,
    });

    if (error) {
      console.error("[toggleLike] insert error:", error.message);
      return { liked: false, error: "Failed to like." };
    }

    revalidatePath("/community");
    return { liked: true };
  }
}

// ── Admin: toggle pin ────────────────────────────────────────────────────────

export async function pinPost(
  postId: string,
  pinned: boolean
): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser();

  if (!isAdminEmail(user.email)) {
    return { error: "Only admins can pin posts." };
  }

  const { error } = await supabase
    .from("community_post")
    .update({ is_pinned: pinned })
    .eq("id", postId);

  if (error) {
    console.error("[pinPost] update error:", error.message);
    return { error: "Failed to update pin status." };
  }

  revalidatePath("/community");
  return {};
}

// ── Admin: mark as official answer ──────────────────────────────────────────

export async function markAsAdminAnswer(
  postId: string,
  isAnswer: boolean
): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser();

  if (!isAdminEmail(user.email)) {
    return { error: "Only admins can mark official answers." };
  }

  const { error } = await supabase
    .from("community_post")
    .update({ is_admin_answer: isAnswer })
    .eq("id", postId);

  if (error) {
    console.error("[markAsAdminAnswer] update error:", error.message);
    return { error: "Failed to update answer status." };
  }

  revalidatePath("/community");
  return {};
}
