"use client";

import { useState, useCallback } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

type Props = {
  feedUrl: string;
};

const APPS = [
  {
    id: "apple",
    name: "Apple Podcasts",
    icon: "🎵",
    getUrl: (feedUrl: string) =>
      `podcast://${feedUrl.replace(/^https?:\/\//, "")}`,
  },
  {
    id: "overcast",
    name: "Overcast",
    icon: "🌤",
    getUrl: (feedUrl: string) =>
      `https://overcast.fm/itpc/${encodeURIComponent(feedUrl)}`,
  },
  {
    id: "pocketcasts",
    name: "Pocket Casts",
    icon: "🎧",
    getUrl: (feedUrl: string) =>
      `pktc://subscribe/${feedUrl.replace(/^https?:\/\//, "")}`,
  },
  {
    id: "castro",
    name: "Castro",
    icon: "📻",
    getUrl: (feedUrl: string) =>
      `castro://subscribe/${feedUrl.replace(/^https?:\/\//, "")}`,
  },
];

export function PodcastFeedSection({ feedUrl }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [feedUrl]);

  return (
    <SurfaceCard elevated className="surface-card--editorial">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="member-detail-kicker">Daily Practice Podcast</p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-foreground">
            Listen in any podcast app
          </h2>
          <p className="mt-1.5 text-sm leading-body text-muted-foreground">
            Your personal private feed. Add it once and new daily practices
            appear automatically in your podcast app.
          </p>
        </div>
        <span className="text-2xl flex-shrink-0" aria-hidden="true">🎙</span>
      </div>

      {/* Feed URL */}
      <div className="mt-4 rounded-xl border border-border bg-surface-tint/40 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Your private feed URL
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs text-foreground break-all leading-relaxed font-mono">
            {feedUrl}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: copied
                ? "rgba(22,163,74,0.1)"
                : "rgba(47,111,237,0.08)",
              color: copied ? "#15803D" : "#2F6FED",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* App buttons */}
      <div className="mt-4">
        <p className="text-xs text-muted-foreground mb-3">Add directly to your app:</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {APPS.map((app) => (
            <a
              key={app.id}
              href={app.getUrl(feedUrl)}
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              rel="noreferrer"
            >
              <span aria-hidden="true">{app.icon}</span>
              <span className="truncate">{app.name}</span>
            </a>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
        Keep this URL private — it gives access to your feed without a password.
        If you need a new URL, contact support.
      </p>
    </SurfaceCard>
  );
}
