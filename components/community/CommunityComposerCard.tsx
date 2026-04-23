"use client";

import { useMemo, useState, useTransition } from "react";
import { createCommunityPost } from "@/app/(member)/community/actions";
import {
  COMMUNITY_POST_TYPE_OPTIONS,
  getCommunityLaneDescription,
  getCommunityLaneLabel,
  getCommunityLaneShortLabel,
  type CommunityPostType,
} from "@/lib/community/shared";

export function CommunityComposerCard() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<CommunityPostType>("reflection");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const placeholder = useMemo(() => {
    if (postType === "share") {
      return "Share the shift, insight, or small win you want someone else to feel with you.";
    }
    if (postType === "question") {
      return "Ask the question you would actually want a thoughtful room to respond to.";
    }
    return "Share what feels hard, tender, or real right now so the community can meet you with support.";
  }, [postType]);

  function reset() {
    setTitle("");
    setBody("");
    setPostType("reflection");
  }

  function handleSubmit() {
    setFeedback(null);

    startTransition(async () => {
      const result = await createCommunityPost({
        title,
        body,
        postType,
      });

      if (result.error) {
        setFeedback({ type: "error", message: result.error });
        return;
      }

      reset();
      setFeedback({ type: "success", message: "Your post is live for the community." });
      window.setTimeout(() => setFeedback(null), 2800);
    });
  }

  return (
    <section className="surface-card surface-card--editorial p-5 md:p-6" id="community-composer">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="ui-section-eyebrow mb-2">Start Here</p>
          <h2 className="heading-balance text-2xl font-semibold tracking-[-0.035em] text-foreground">
            Share something real without overthinking it.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-[1.75] text-muted-foreground">
            This space works best when posts feel honest, simple, and human. A short headline can
            help, but the real value is giving people enough context to respond with care.
          </p>
        </div>
        <div className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          {getCommunityLaneLabel(postType)}
        </div>
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-3">
        {COMMUNITY_POST_TYPE_OPTIONS.map((option) => {
          const active = postType === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setPostType(option.value)}
              className={`rounded-[1.25rem] border px-4 py-4 text-left transition-all ${
                active
                  ? "border-primary/25 bg-primary/8 shadow-[0_18px_42px_rgba(61,182,231,0.12)]"
                  : "border-border bg-white hover:border-primary/15 hover:bg-primary/[0.03]"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">{option.label}</p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {getCommunityLaneDescription(option.value)}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Optional headline
        </label>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder={`A short headline for your ${getCommunityLaneShortLabel(postType).toLowerCase()} post`}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/55 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Post
        </label>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={placeholder}
          rows={5}
          maxLength={4000}
          className="w-full resize-none rounded-[1.25rem] border border-border bg-background px-4 py-3 text-sm leading-[1.75] text-foreground placeholder:text-muted-foreground/55 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border/80 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{body.length} / 4,000</span>
          {feedback ? (
            <span className={feedback.type === "error" ? "text-red-500" : "text-primary"}>
              {feedback.message}
            </span>
          ) : (
            <span>Warm, specific, and honest tends to work best here.</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || body.trim().length < 8}
          className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(46,196,182,0.24)] transition-transform hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Posting..." : `Post to ${getCommunityLaneLabel(postType)}`}
        </button>
      </div>
    </section>
  );
}
