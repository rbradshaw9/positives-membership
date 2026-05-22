"use client";

import { VideoEmbed } from "@/components/media/VideoEmbed";
import { Button } from "@/components/ui/Button";

type ParsedReplay =
  | { provider: "vimeo"; id: string }
  | { provider: "youtube"; id: string }
  | { provider: "external"; url: string };

function parseReplayUrl(url: string): ParsedReplay {
  const trimmed = url.trim();
  const vimeoMatch = trimmed.match(
    /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i
  );
  if (vimeoMatch?.[1]) return { provider: "vimeo", id: vimeoMatch[1] };

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/i
  );
  if (youtubeMatch?.[1]) return { provider: "youtube", id: youtubeMatch[1] };

  return { provider: "external", url: trimmed };
}

export function EventReplayPlayer({
  replayUrl,
  replayAssetId,
  title,
}: {
  replayUrl?: string | null;
  replayAssetId?: string | null;
  title: string;
}) {
  if (replayAssetId) {
    return (
      <div className="space-y-3">
        <video
          src={`/api/media/assets/${replayAssetId}`}
          controls
          preload="metadata"
          className="aspect-video w-full rounded-2xl border border-border bg-black"
          aria-label={`${title} replay`}
        />
      </div>
    );
  }

  if (!replayUrl) return null;
  const replay = parseReplayUrl(replayUrl);

  if (replay.provider === "external") {
    return (
      <Button href={replay.url} target="_blank" rel="noopener noreferrer">
        Watch Replay
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <VideoEmbed
        vimeoId={replay.provider === "vimeo" ? replay.id : null}
        youtubeId={replay.provider === "youtube" ? replay.id : null}
        title={`${title} replay`}
        dark
      />
      <Button href={replayUrl} target="_blank" rel="noopener noreferrer" variant="ghost" size="sm">
        Open replay in a new tab
      </Button>
    </div>
  );
}
