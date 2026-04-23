"use client";

import { useMemo, useState, useTransition } from "react";
import { createCommunityPost } from "@/app/(member)/community/actions";
import {
  COMMUNITY_POST_TYPE_OPTIONS,
  getCommunityComposerLabel,
  getCommunityLaneDescription,
  getCommunityLaneLabel,
  getCommunityLaneShortLabel,
  type CommunityPostType,
} from "@/lib/community/shared";

export function CommunityComposerCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<CommunityPostType>("reflection");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const placeholder = useMemo(() => {
    if (postType === "share") {
      return "Share the shift, small win, or moment you want someone else to feel with you.";
    }
    if (postType === "question") {
      return "Ask the question you’d actually want a thoughtful room to respond to.";
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
      setIsOpen(false);
      setFeedback({ type: "success", message: "Your post is live for the community." });
      window.setTimeout(() => setFeedback(null), 2800);
    });
  }

  return (
    <section className="surface-card surface-card--editorial p-5 md:p-6" id="community-composer">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="ui-section-eyebrow mb-2">Start Here</p>
          <h2 className="heading-balance text-2xl font-semibold tracking-[-0.035em] text-foreground">
            Start a post when you have something real to share.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-[1.75] text-muted-foreground">
            Share something true, let people reply, and follow the discussions you care about.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(46,196,182,0.24)] transition-transform hover:translate-y-[-1px]"
        >
          {isOpen ? "Close composer" : "Start a post"}
        </button>
      </div>

      {feedback && !isOpen ? (
        <p className={`mt-4 text-sm ${feedback.type === "error" ? "text-red-500" : "text-primary"}`}>
          {feedback.message}
        </p>
      ) : null}

      {isOpen ? (
        <div className="mt-5 border-t border-border/80 pt-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Choose what kind of post this is
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_POST_TYPE_OPTIONS.map((option) => {
              const active = postType === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPostType(option.value)}
                  className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-white text-muted-foreground hover:border-primary/20 hover:text-foreground"
                  }`}
                >
                  {getCommunityComposerLabel(option.value)}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            {getCommunityLaneDescription(postType)}
          </p>

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

          <div className="mt-4">
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

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setIsOpen(false);
                  setFeedback(null);
                }}
                className="rounded-full border border-border bg-white px-4 py-3 text-sm font-semibold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || body.trim().length < 8}
                className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(46,196,182,0.24)] transition-transform hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Posting..." : `Post to ${getCommunityLaneLabel(postType)}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
