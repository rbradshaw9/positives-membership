"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  markAllCommunityNotificationsRead,
  markCommunityNotificationRead,
  markCommunityThreadNotificationsRead,
} from "@/app/(member)/community/actions";
import {
  getCommunityDisplayName,
  getCommunityNotificationEventLabel,
} from "@/lib/community/shared";
import type { CommunityNotificationRow } from "@/lib/queries/get-community-posts";

type Props = {
  notifications: CommunityNotificationRow[];
};

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

export function CommunityNotificationStrip({ notifications }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (notifications.length === 0) return null;

  function openThread(threadId: string) {
    startTransition(async () => {
      const result = await markCommunityThreadNotificationsRead(threadId);
      if (!result.error) {
        router.push(`/community?view=feed#thread-${threadId}`);
        router.refresh();
      }
    });
  }

  function markRead(notificationId: string) {
    startTransition(async () => {
      const result = await markCommunityNotificationRead(notificationId);
      if (!result.error) {
        router.refresh();
      }
    });
  }

  function markAllRead() {
    startTransition(async () => {
      const result = await markAllCommunityNotificationsRead();
      if (!result.error) {
        router.refresh();
      }
    });
  }

  return (
    <section className="surface-card surface-card--editorial border border-primary/15 bg-primary/[0.04] p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="ui-section-eyebrow mb-2">New replies</p>
          <h2 className="heading-balance text-[clamp(1.5rem,1.3rem+0.6vw,2rem)] font-semibold tracking-[-0.035em] text-foreground">
            You have {notifications.length} new {notifications.length === 1 ? "reply" : "replies"} to check.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-[1.75] text-muted-foreground">
            These updates come from your own posts and the discussions you chose to follow.
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={isPending}
          className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-muted-foreground"
        >
          Mark all read
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="rounded-[1.25rem] border border-border/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                New reply
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatRelativeTime(notification.created_at)}
              </span>
            </div>

            <p className="mt-3 text-sm leading-[1.75] text-foreground">
              <span className="font-semibold">{getCommunityDisplayName(notification.actor?.name)}</span>{" "}
              {getCommunityNotificationEventLabel(notification.event_type)}.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {notification.thread?.title ?? "Community discussion"}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openThread(notification.thread_id)}
                disabled={isPending}
                className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-4 py-2 text-xs font-semibold text-white shadow-[0_18px_42px_rgba(46,196,182,0.18)]"
              >
                Open thread
              </button>
              <button
                type="button"
                onClick={() => markRead(notification.id)}
                disabled={isPending}
                className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-muted-foreground"
              >
                Mark read
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
