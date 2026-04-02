"use client";

import { useState, useTransition } from "react";
import { createPost } from "@/app/(member)/community/actions";

/**
 * components/community/CommunityComposerCard.tsx
 * A real posting form for community Q&A.
 * Members can write a reflection, ask a question, or share.
 */

type CommunityComposerCardProps = {
  contentId: string;
};

const POST_TYPES = [
  { value: "reflection" as const, label: "Reflection", emoji: "💭" },
  { value: "question" as const, label: "Question", emoji: "❓" },
  { value: "share" as const, label: "Share", emoji: "💡" },
];

export function CommunityComposerCard({ contentId }: CommunityComposerCardProps) {
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<"reflection" | "question" | "share">("reflection");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await createPost(contentId, body, postType);
      if (result.error) {
        setError(result.error);
      } else {
        setBody("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <div className="surface-card surface-card--editorial p-5 md:p-6" id="community-composer">
      <p className="ui-section-eyebrow mb-3">Share Your Thoughts</p>
      <h2 className="heading-balance font-heading text-xl font-semibold tracking-[-0.02em] text-foreground mb-4">
        How is this principle showing up for&nbsp;you?
      </h2>

      {/* Post type selector */}
      <div className="flex gap-2 mb-4">
        {POST_TYPES.map((pt) => (
          <button
            key={pt.value}
            type="button"
            onClick={() => setPostType(pt.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              postType === pt.value
                ? "bg-accent/12 text-accent ring-1 ring-accent/25"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {pt.emoji} {pt.label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          postType === "question"
            ? "Ask the community a question about this principle..."
            : postType === "share"
              ? "Share something that resonated with you..."
              : "How did this principle land for you this week?"
        }
        rows={4}
        maxLength={4000}
        className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground leading-[1.7] placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
      />

      {/* Character count + submit */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[10px] text-muted-foreground">
          {body.length} / 4,000
        </span>

        <div className="flex items-center gap-3">
          {success && (
            <span className="text-xs font-medium text-accent animate-in fade-in">
              ✓ Posted successfully
            </span>
          )}
          {error && (
            <span className="text-xs font-medium text-red-500">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || body.trim().length < 3}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
