"use client";

import { useState, useTransition } from "react";
import { toggleLike, deletePost, createReply, pinPost, markAsAdminAnswer } from "@/app/(member)/community/actions";
import type { CommunityPostRow } from "@/lib/queries/get-community-posts";

/**
 * components/community/CommunityPostCard.tsx
 * A single community post with like, reply, and admin controls.
 * Supports optimistic updates for likes.
 */

type CommunityPostCardProps = {
  post: CommunityPostRow;
  currentMemberId: string;
  isLiked: boolean;
  isAdmin?: boolean;
  replies?: CommunityPostRow[];
  repliedPostIds?: Set<string>;
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(dateStr)
  );
}

export function CommunityPostCard({
  post,
  currentMemberId,
  isLiked: initialIsLiked,
  isAdmin = false,
  replies = [],
  repliedPostIds = new Set(),
}: CommunityPostCardProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isOwn = post.member_id === currentMemberId;
  const authorName = post.member?.name || "Anonymous";
  const initials = getInitials(post.member?.name);

  function handleLike() {
    // Optimistic update
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));

    startTransition(async () => {
      const result = await toggleLike(post.id);
      if (result.error) {
        // Revert on error
        setIsLiked((prev) => !prev);
        setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
      }
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this post?")) return;
    startTransition(async () => {
      await deletePost(post.id);
    });
  }

  function handleReply() {
    if (!replyText.trim()) return;
    startTransition(async () => {
      const result = await createReply(post.id, replyText);
      if (!result.error) {
        setReplyText("");
        setShowReplyInput(false);
        setShowReplies(true);
      }
    });
  }

  function handlePin() {
    startTransition(async () => {
      await pinPost(post.id, !post.is_pinned);
    });
  }

  function handleMarkAnswer() {
    startTransition(async () => {
      await markAsAdminAnswer(post.id, !post.is_admin_answer);
    });
  }

  const postTypeBadge =
    post.post_type === "question"
      ? "Question"
      : post.post_type === "share"
        ? "Share"
        : "Reflection";

  return (
    <article
      className={`surface-card surface-card--editorial p-5 md:p-6 transition-all${
        post.is_pinned ? " ring-2 ring-accent/30" : ""
      }${post.is_admin_answer ? " border-accent/40" : ""}`}
    >
      {/* Pinned badge */}
      {post.is_pinned && (
        <div className="mb-3 flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
            📌 Pinned
          </span>
        </div>
      )}

      {/* Admin answer badge */}
      {post.is_admin_answer && (
        <div className="mb-3 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent ring-1 ring-accent/20">
            ⭐ Official Answer
          </span>
        </div>
      )}

      {/* Header: avatar + name + type + time */}
      <div className="mb-4 flex gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold text-primary flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{authorName}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {postTypeBadge}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {relativeTime(post.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <p className="text-sm leading-[1.75] text-muted-foreground whitespace-pre-wrap">
        {post.body}
      </p>

      {/* Actions row */}
      <div className="mt-5 flex items-center gap-4 border-t border-border pt-4 text-xs font-medium text-muted-foreground">
        <button
          type="button"
          onClick={handleLike}
          disabled={isPending}
          className={`inline-flex items-center gap-1 transition-colors hover:text-foreground${
            isLiked ? " text-accent" : ""
          }`}
        >
          {isLiked ? "♥" : "♡"} {likeCount}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowReplyInput((prev) => !prev);
            if (!showReplyInput) setShowReplies(true);
          }}
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          💬 {post.reply_count > 0 ? post.reply_count : ""} Reply
        </button>

        {post.reply_count > 0 && !showReplies && (
          <button
            type="button"
            onClick={() => setShowReplies(true)}
            className="transition-colors hover:text-foreground"
          >
            Show {post.reply_count} {post.reply_count === 1 ? "reply" : "replies"}
          </button>
        )}

        {/* Delete (own posts or admin) */}
        {(isOwn || isAdmin) && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="ml-auto transition-colors hover:text-red-500"
          >
            Delete
          </button>
        )}

        {/* Admin controls */}
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={handlePin}
              disabled={isPending}
              className="transition-colors hover:text-foreground"
            >
              {post.is_pinned ? "Unpin" : "Pin"}
            </button>
            <button
              type="button"
              onClick={handleMarkAnswer}
              disabled={isPending}
              className="transition-colors hover:text-foreground"
            >
              {post.is_admin_answer ? "Remove ⭐" : "Mark as Answer"}
            </button>
          </>
        )}
      </div>

      {/* Reply input */}
      {showReplyInput && (
        <div className="mt-4 flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a thoughtful reply..."
            rows={2}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
            maxLength={2000}
          />
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={handleReply}
              disabled={isPending || !replyText.trim()}
              className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              Send
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReplyInput(false);
                setReplyText("");
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Replies thread */}
      {showReplies && replies.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 border-l-2 border-border pl-4">
          {replies.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              currentMemberId={currentMemberId}
              isLiked={repliedPostIds.has(reply.id)}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </article>
  );
}

// ── Inline Reply Card ────────────────────────────────────────────────────────

function ReplyCard({
  reply,
  currentMemberId,
  isLiked: initialIsLiked,
  isAdmin,
}: {
  reply: CommunityPostRow;
  currentMemberId: string;
  isLiked: boolean;
  isAdmin: boolean;
}) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(reply.like_count);
  const [isPending, startTransition] = useTransition();

  const isOwn = reply.member_id === currentMemberId;
  const authorName = reply.member?.name || "Anonymous";
  const initials = getInitials(reply.member?.name);

  function handleLike() {
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));

    startTransition(async () => {
      const result = await toggleLike(reply.id);
      if (result.error) {
        setIsLiked((prev) => !prev);
        setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this reply?")) return;
    startTransition(async () => {
      await deletePost(reply.id);
    });
  }

  return (
    <div className={`rounded-xl bg-muted/40 p-3${reply.is_admin_answer ? " ring-1 ring-accent/30" : ""}`}>
      {reply.is_admin_answer && (
        <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-accent">
          ⭐ Official
        </span>
      )}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-primary">
          {initials}
        </div>
        <span className="text-xs font-semibold text-foreground">{authorName}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {relativeTime(reply.created_at)}
        </span>
      </div>
      <p className="text-sm leading-[1.65] text-muted-foreground whitespace-pre-wrap">
        {reply.body}
      </p>
      <div className="mt-2 flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
        <button
          type="button"
          onClick={handleLike}
          disabled={isPending}
          className={`inline-flex items-center gap-1 transition-colors hover:text-foreground${
            isLiked ? " text-accent" : ""
          }`}
        >
          {isLiked ? "♥" : "♡"} {likeCount > 0 ? likeCount : ""}
        </button>
        {(isOwn || isAdmin) && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="ml-auto transition-colors hover:text-red-500"
          >
            Delete
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              startTransition(async () => {
                await markAsAdminAnswer(reply.id, !reply.is_admin_answer);
              });
            }}
            disabled={isPending}
            className="transition-colors hover:text-foreground"
          >
            {reply.is_admin_answer ? "Remove ⭐" : "⭐ Answer"}
          </button>
        )}
      </div>
    </div>
  );
}
