"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createStandaloneThread,
  createWeeklyThread,
} from "@/app/(member)/community/actions";
import {
  COMMUNITY_POST_TYPE_OPTIONS,
  getCommunityPostTypeLabel,
  type CommunityPostType,
} from "@/lib/community/shared";
import type { CommunityTagRow } from "@/lib/queries/get-community-posts";

type WeeklyComposerProps = {
  mode: "weekly";
  contentId: string;
};

type StandaloneComposerProps = {
  mode: "standalone";
  tags: CommunityTagRow[];
};

type CommunityComposerCardProps = WeeklyComposerProps | StandaloneComposerProps;

export function CommunityComposerCard(props: CommunityComposerCardProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<CommunityPostType>("reflection");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const composerId = props.mode === "weekly" ? "community-weekly-composer" : "community-standalone-composer";

  const placeholder = useMemo(() => {
    if (props.mode === "weekly") {
      if (postType === "question") return "Ask the community something real about this week's principle...";
      if (postType === "share") return "Share what resonated, clicked, or surprised you this week...";
      return "How is this week's principle showing up in your real life?";
    }

    if (postType === "question") return "What are you trying to understand, work through, or get perspective on?";
    if (postType === "share") return "Share the story, insight, or resource you think could help someone else here.";
    return "Write a grounded reflection that gives the community enough context to meet you where you are.";
  }, [postType, props.mode]);

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((value) => value !== tagId) : [...current, tagId]
    );
  }

  function reset() {
    setTitle("");
    setBody("");
    setPostType("reflection");
    setSelectedTagIds([]);
  }

  function handleSubmit() {
    setFeedback(null);

    startTransition(async () => {
      const result =
        props.mode === "weekly"
          ? await createWeeklyThread(props.contentId, body, postType)
          : await createStandaloneThread({
              title,
              body,
              postType,
              tagIds: selectedTagIds,
            });

      if (result.error) {
        setFeedback({ type: "error", message: result.error });
        return;
      }

      reset();
      setFeedback({
        type: "success",
        message:
          props.mode === "weekly"
            ? "Your reflection is live in this week’s conversation."
            : "Your discussion is now live for the community.",
      });
      window.setTimeout(() => setFeedback(null), 2800);
    });
  }

  return (
    <section className="surface-card surface-card--editorial p-5 md:p-6" id={composerId}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="ui-section-eyebrow mb-2">
            {props.mode === "weekly" ? "This Week" : "Start A Discussion"}
          </p>
          <h3 className="heading-balance text-2xl font-semibold tracking-[-0.035em] text-foreground">
            {props.mode === "weekly"
              ? "Add your voice without overthinking it."
              : "Open a thoughtful conversation for the community."}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-[1.75] text-muted-foreground">
            {props.mode === "weekly"
              ? "Short reflections, honest questions, and small shares are all enough. We want this to feel grounded, not performative."
              : "Give your thread a clear title, choose the topics it belongs in, and share enough context that support, coaches, and members can respond well."}
          </p>
        </div>
        <div className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          {getCommunityPostTypeLabel(postType)}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {COMMUNITY_POST_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPostType(option.value)}
            className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
              postType === option.value
                ? "bg-accent/12 text-accent ring-1 ring-accent/25"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {props.mode === "standalone" ? (
        <div className="mt-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Thread title
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="What would help someone immediately understand this discussion?"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/55 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
          />
        </div>
      ) : null}

      <div className="mt-5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {props.mode === "weekly" ? "Post" : "Opening post"}
        </label>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={placeholder}
          rows={props.mode === "weekly" ? 4 : 5}
          maxLength={4000}
          className="w-full resize-none rounded-[1.25rem] border border-border bg-background px-4 py-3 text-sm leading-[1.75] text-foreground placeholder:text-muted-foreground/55 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
      </div>

      {props.mode === "standalone" ? (
        <div className="mt-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Topics
          </label>
          <div className="flex flex-wrap gap-2">
            {props.tags.map((tag) => {
              const active = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-border bg-white text-muted-foreground hover:border-primary/20 hover:text-foreground"
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            Choose the lanes that make the thread easiest for members and coaches to find later.
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-border/80 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{body.length} / 4,000</span>
          {props.mode === "standalone" ? <span>{selectedTagIds.length} topic{selectedTagIds.length === 1 ? "" : "s"} selected</span> : null}
          {feedback ? (
            <span className={feedback.type === "error" ? "text-red-500" : "text-primary"}>
              {feedback.message}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            isPending
            || body.trim().length < (props.mode === "weekly" ? 3 : 8)
            || (props.mode === "standalone" && title.trim().length < 4)
          }
          className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(46,196,182,0.24)] transition-transform hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Posting..." : props.mode === "weekly" ? "Post To This Week" : "Start Discussion"}
        </button>
      </div>
    </section>
  );
}
