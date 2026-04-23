"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createReply,
  deleteReply,
  deleteThread,
  reportPost,
  reportThread,
  toggleFollowThread,
  togglePostLike,
  toggleSaveThread,
  toggleThreadLike,
} from "@/app/(member)/community/actions";
import {
  getCommunityContextLabel,
  COMMUNITY_REPORT_REASON_OPTIONS,
  getCommunityDisplayName,
  getCommunityLaneLabel,
  getCommunityThreadDisplayTitle,
  type CommunityReportReason,
} from "@/lib/community/shared";
import type { CommunityReplyRow, CommunityThreadRow } from "@/lib/queries/get-community-posts";

type CommunityThreadCardProps = {
  thread: CommunityThreadRow;
  currentMemberId: string;
};

function getInitials(name: string | null | undefined) {
  const displayName = getCommunityDisplayName(name);
  if (displayName === "Positives member") return "P";
  return displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function ReportPanel({
  onSubmit,
  onCancel,
  isPending,
}: {
  onSubmit: (reason: CommunityReportReason, details: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState<CommunityReportReason>("other");
  const [details, setDetails] = useState("");

  return (
    <div className="mt-3 rounded-2xl border border-border bg-muted/35 p-3">
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Report reason
      </label>
      <select
        value={reason}
        onChange={(event) => setReason(event.target.value as CommunityReportReason)}
        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground"
      >
        {COMMUNITY_REPORT_REASON_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Optional note
      </label>
      <textarea
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        rows={3}
        maxLength={1500}
        placeholder="A little context helps moderators understand what feels off."
        className="mt-2 w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/55"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSubmit(reason, details)}
          disabled={isPending}
          className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {isPending ? "Sending..." : "Send report"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ReplyComposer({
  threadId,
  onDone,
}: {
  threadId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = await createReply({ threadId, body });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setBody("");
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-muted/35 p-3">
      <p className="mb-2 text-xs leading-6 text-muted-foreground">
        Your reply joins the shared thread so everyone following this conversation can stay in one place.
      </p>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Write a grounded reply..."
        className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/55"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={isPending || body.trim().length < 2}
          className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-4 py-2 text-xs font-semibold text-white shadow-[0_18px_42px_rgba(46,196,182,0.2)] disabled:opacity-50"
        >
          {isPending ? "Sending..." : "Send reply"}
        </button>
        <button type="button" onClick={onDone} className="text-xs font-semibold text-muted-foreground">
          Cancel
        </button>
        {message ? <span className="text-xs text-red-500">{message}</span> : null}
      </div>
    </div>
  );
}

function ReplyItem({
  reply,
  currentMemberId,
}: {
  reply: CommunityReplyRow;
  currentMemberId: string;
}) {
  const router = useRouter();
  const [showReport, setShowReport] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isOwn = reply.member_id === currentMemberId;

  function run(action: () => Promise<{ error?: string } | { active?: boolean; error?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      setShowReport(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-[1.25rem] border border-border/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-primary">
          {getInitials(reply.member?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {getCommunityDisplayName(reply.member?.name)}
            </span>
            {reply.is_official_answer ? (
              <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                Helpful reply
              </span>
            ) : null}
            <span className="ml-auto text-xs text-muted-foreground">{formatRelativeTime(reply.created_at)}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-[1.75] text-muted-foreground">{reply.body}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
        <button
          type="button"
          onClick={() => run(() => togglePostLike(reply.id))}
          className={`rounded-full px-3 py-1.5 transition-colors ${
            reply.is_liked
              ? "bg-accent/10 text-accent"
              : "bg-muted/45 text-muted-foreground hover:bg-accent/10 hover:text-accent"
          }`}
        >
          {reply.is_liked ? "Appreciated" : "Appreciate"} · {reply.like_count}
        </button>
        <button
          type="button"
          onClick={() => setShowReport((value) => !value)}
          className="rounded-full bg-muted/45 px-3 py-1.5 text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
        >
          Report
        </button>
        {isOwn ? (
          <button
            type="button"
            onClick={() => run(() => deleteReply(reply.id))}
            className="ml-auto rounded-full bg-red-50 px-3 py-1.5 text-red-500"
          >
            Delete
          </button>
        ) : null}
      </div>

      {message ? <p className="mt-2 text-xs text-red-500">{message}</p> : null}
      {showReport ? (
        <ReportPanel
          isPending={isPending}
          onCancel={() => setShowReport(false)}
          onSubmit={(reason, details) => run(() => reportPost(reply.id, reason, details))}
        />
      ) : null}
    </div>
  );
}

export function CommunityThreadCard({ thread, currentMemberId }: CommunityThreadCardProps) {
  const router = useRouter();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isOwn = thread.member_id === currentMemberId;
  const hasExplicitTitle = Boolean(thread.title?.trim());
  const displayTitle = getCommunityThreadDisplayTitle({
    title: thread.title,
    body: thread.body,
    postType: thread.post_type,
    maxLength: 88,
  });

  function run(action: () => Promise<{ error?: string } | { active?: boolean; error?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      setShowReport(false);
      router.refresh();
    });
  }

  return (
    <article className="surface-card p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          {getCommunityLaneLabel(thread.post_type)}
        </span>
        {thread.is_pinned ? (
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
            Pinned guidance
          </span>
        ) : null}
        {thread.is_featured ? (
          <span className="rounded-full bg-foreground px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            Featured post
          </span>
        ) : null}
        {thread.unread_reply_count > 0 ? (
          <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
            {thread.unread_reply_count} new {thread.unread_reply_count === 1 ? "reply" : "replies"}
          </span>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">{formatRelativeTime(thread.last_activity_at)}</span>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-semibold text-primary">
          {getInitials(thread.member?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {getCommunityDisplayName(thread.member?.name)}
            </span>
            <span className="text-xs text-muted-foreground">{getCommunityContextLabel(thread.post_type)}</span>
          </div>

          {hasExplicitTitle ? (
            <h3 className="heading-balance mt-3 text-[1.35rem] font-semibold tracking-[-0.03em] text-foreground">
              {displayTitle}
            </h3>
          ) : null}

          <p className={`${hasExplicitTitle ? "mt-3" : "mt-2"} whitespace-pre-wrap text-sm leading-[1.8] text-muted-foreground`}>
            {thread.body}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/80 pt-4">
        <button
          type="button"
          onClick={() => setShowReplyBox((value) => !value)}
          className="rounded-full bg-muted/55 px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          {showReplyBox ? "Close reply" : `Reply${thread.reply_count > 0 ? ` · ${thread.reply_count}` : ""}`}
        </button>
        <button
          type="button"
          onClick={() => run(() => toggleFollowThread(thread.id))}
          className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
            thread.is_following
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-transparent bg-muted/55 text-muted-foreground hover:bg-primary/10 hover:text-primary"
          }`}
        >
          {thread.is_following ? "Following" : "Follow updates"}
        </button>
        <button
          type="button"
          onClick={() => run(() => toggleSaveThread(thread.id))}
          className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
            thread.is_saved
              ? "border-secondary/20 bg-secondary/10 text-secondary"
              : "border-transparent bg-muted/55 text-muted-foreground hover:bg-secondary/10 hover:text-secondary"
          }`}
        >
          {thread.is_saved ? "Saved" : "Save for later"}
        </button>
        <button
          type="button"
          onClick={() => run(() => toggleThreadLike(thread.id))}
          className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
            thread.is_liked
              ? "border-accent/25 bg-accent/10 text-accent"
              : "border-transparent bg-muted/55 text-muted-foreground hover:bg-accent/10 hover:text-accent"
          }`}
        >
          {thread.is_liked ? `Appreciated · ${thread.like_count}` : `Appreciate · ${thread.like_count}`}
        </button>
        <button
          type="button"
          onClick={() => setShowReport((value) => !value)}
          className="rounded-full bg-muted/55 px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
        >
          Report
        </button>
        {isOwn ? (
          <button
            type="button"
            onClick={() => run(() => deleteThread(thread.id))}
            className="ml-auto rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-500"
          >
            Delete
          </button>
        ) : null}
      </div>

      {message ? <p className="mt-2 text-xs text-red-500">{message}</p> : null}
      {showReplyBox ? <ReplyComposer threadId={thread.id} onDone={() => setShowReplyBox(false)} /> : null}
      {showReport ? (
        <ReportPanel
          isPending={isPending}
          onCancel={() => setShowReport(false)}
          onSubmit={(reason, details) => run(() => reportThread(thread.id, reason, details))}
        />
      ) : null}

      {thread.replies.length > 0 ? (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>{thread.reply_count} {thread.reply_count === 1 ? "reply" : "replies"}</span>
            {thread.unread_reply_count > 0 ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-primary">
                {thread.unread_reply_count} new to you
              </span>
            ) : null}
          </div>
          {thread.replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} currentMemberId={currentMemberId} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.25rem] border border-dashed border-border bg-muted/20 px-4 py-5 text-sm leading-[1.75] text-muted-foreground">
          No replies yet. A thoughtful response is enough to help this conversation feel alive.
        </div>
      )}
    </article>
  );
}
