/**
 * lib/media/resolve-audio-url.ts
 * Server-side audio URL resolver for content rows.
 *
 * Priority order:
 * 1. castos_episode_url — direct MP3 URL from Castos (no auth required)
 * 2. s3_audio_key       — S3 object key (signed URL generation, Milestone 06+)
 *
 * Returns a playable URL string, or null if no source is available.
 *
 * Keeping S3 resolution as a clean documented stub rather than a hack in the
 * component. When AWS credentials are available, replace the stub with a call
 * to @aws-sdk/s3-request-presigner or a proxy endpoint.
 *
 * Server-only — never import in client components.
 */

export type AudioSource =
  | { kind: "castos"; url: string }
  | { kind: "s3_pending"; key: string } // S3 key exists but no signed URL yet
  | { kind: "none" };

/**
 * Resolve the best available playable URL for a content row.
 *
 * @param castosUrl - castos_episode_url from the content row
 * @param s3Key     - s3_audio_key from the content row
 * @returns A playable URL string, or null if no source can be resolved.
 */
export async function resolveAudioUrl(
  castosUrl: string | null,
  s3Key: string | null
): Promise<string | null> {
  // 1. Prefer Castos — direct public MP3, no auth needed.
  if (castosUrl) {
    return castosUrl;
  }

  // 2. S3 — stub for now. Requires AWS_REGION + AWS_ACCESS_KEY_ID +
  //    AWS_SECRET_ACCESS_KEY + S3_BUCKET_NAME env vars.
  //    Implement signed URL generation in Milestone 06 when S3 creds are available.
  if (s3Key) {
    const bucket = process.env.S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    if (bucket && region) {
      // Bucket is public-read — construct a direct URL (no signing needed).
      // When member-only protection is required, swap this for a presigned URL
      // using @aws-sdk/s3-request-presigner (expiresIn: 3600).
      return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
    }
  }

  return null;
}

/**
 * Structured source resolver — returns a typed AudioSource discriminated union.
 * Useful for rendering decisions (e.g. "show 'coming via S3' vs 'no source'").
 */
export function describeAudioSource(
  castosUrl: string | null,
  s3Key: string | null
): AudioSource {
  if (castosUrl) return { kind: "castos", url: castosUrl };
  if (s3Key) return { kind: "s3_pending", key: s3Key };
  return { kind: "none" };
}
