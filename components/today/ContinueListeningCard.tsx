"use client";

import Link from "next/link";
import { useMemberAudio } from "@/components/member/audio/MemberAudioProvider";
import { TypeBadge } from "@/components/member/TypeBadge";
import { Button } from "@/components/ui/Button";

interface ContinueListeningCardProps {
  contentId: string;
  contentType: string;
  title: string;
  description: string | null;
  audioUrl: string | null;
  durationLabel: string;
}

export function ContinueListeningCard({
  contentId,
  contentType,
  title,
  description,
  audioUrl,
  durationLabel,
}: ContinueListeningCardProps) {
  const {
    isCurrentTrack,
    isPlaying,
    playTrack,
    togglePlayback,
  } = useMemberAudio();

  const isCurrent = isCurrentTrack(contentId);

  function handlePlayback() {
    if (!audioUrl) return;

    if (isCurrent) {
      togglePlayback();
      return;
    }

    playTrack({
      id: contentId,
      src: audioUrl,
      title,
      subtitle: contentType === "daily_audio" ? "Continue your practice" : "Continue listening",
      durationLabel,
      onCompleteAction:
        contentType === "daily_audio"
          ? {
              kind: "daily_listened",
              contentId,
            }
          : undefined,
    });
  }

  return (
    <article className="surface-card surface-card--tint p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ui-section-eyebrow mb-2">Continue Listening</p>
          <h2 className="heading-balance font-heading text-xl font-semibold tracking-[-0.02em] text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-body text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <TypeBadge type={contentType} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {audioUrl ? (
          <Button type="button" onClick={handlePlayback}>
            {isCurrent && isPlaying ? "Pause audio" : "Resume audio"}
          </Button>
        ) : null}
        <Link
          href={`/library/${contentId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Open practice
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
        <span className="text-xs text-muted-foreground">{durationLabel}</span>
      </div>
    </article>
  );
}
