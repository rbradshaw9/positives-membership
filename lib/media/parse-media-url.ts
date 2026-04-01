/**
 * lib/media/parse-media-url.ts
 * Auto-detect media provider from a pasted URL and extract the normalized ID.
 *
 * Used by admin content actions to map a single "media URL" input into the
 * correct DB column (vimeo_video_id, youtube_video_id, castos_episode_url).
 *
 * Server-only — never import in client components.
 */

export type MediaProvider = "vimeo" | "youtube" | "castos" | "direct_audio" | "unknown";

export interface ParsedMedia {
  provider: MediaProvider;
  /** The extracted ID (Vimeo/YouTube) or the cleaned URL (audio) */
  value: string;
}

/**
 * Parse a media URL and return the detected provider + extracted value.
 *
 * Supports:
 * - Vimeo:    vimeo.com/12345, player.vimeo.com/video/12345
 * - YouTube:  youtube.com/watch?v=xxx, youtu.be/xxx, youtube.com/embed/xxx
 * - Castos:   castos.com or feeds.castos domain URLs
 * - Direct:   .mp3, .m4a, .wav, .ogg file extensions
 *
 * Returns { provider: "unknown", value: url } for unrecognized URLs.
 */
export function parseMediaUrl(url: string): ParsedMedia {
  const trimmed = url.trim();
  if (!trimmed) return { provider: "unknown", value: "" };

  // ── Vimeo ──────────────────────────────────────────────────────────────────
  const vimeoMatch = trimmed.match(
    /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i
  );
  if (vimeoMatch) {
    return { provider: "vimeo", value: vimeoMatch[1] };
  }

  // ── YouTube ────────────────────────────────────────────────────────────────
  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/i
  );
  if (youtubeMatch) {
    return { provider: "youtube", value: youtubeMatch[1] };
  }

  // ── Castos ─────────────────────────────────────────────────────────────────
  if (/castos\.com|feeds\.castos/i.test(trimmed)) {
    return { provider: "castos", value: trimmed };
  }

  // ── Direct audio ───────────────────────────────────────────────────────────
  if (/\.(mp3|m4a|wav|ogg|aac)(\?.*)?$/i.test(trimmed)) {
    return { provider: "direct_audio", value: trimmed };
  }

  return { provider: "unknown", value: trimmed };
}

/**
 * Build the DB column updates from a parsed media result.
 * Returns an object ready to spread into a Supabase .update() / .insert() call.
 *
 * Clears the columns that don't apply so a content item never has conflicting
 * media references (e.g. both a Vimeo ID and a YouTube ID from a previous edit).
 */
export function mediaColumnsFromParsed(parsed: ParsedMedia) {
  // Start with all media columns cleared
  const columns: Record<string, string | null> = {
    vimeo_video_id: null,
    youtube_video_id: null,
    // Don't clear castos/s3 for daily — those are managed by the daily-specific fields
  };

  switch (parsed.provider) {
    case "vimeo":
      columns.vimeo_video_id = parsed.value;
      break;
    case "youtube":
      columns.youtube_video_id = parsed.value;
      break;
    case "castos":
      columns.castos_episode_url = parsed.value;
      break;
    case "direct_audio":
      columns.castos_episode_url = parsed.value; // reuse castos column for direct URLs
      break;
    // "unknown" — don't write anything
  }

  return columns;
}
