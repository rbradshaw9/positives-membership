/**
 * lib/content/strip-cms-preamble.ts
 *
 * The CMS (Google Drive import) redundantly includes the content title and
 * excerpt as the first 1–2 lines of the body field. This utility strips those
 * duplicates so they don't appear twice alongside the card heading and excerpt.
 *
 * Algorithm:
 *   1. Escape the title and (if present) excerpt for use in a regex.
 *   2. Build a pattern that matches either or both at the START of the body.
 *   3. Strip leading/trailing whitespace from the result.
 *
 * This is intentionally lenient — it only removes text that exactly matches
 * title/excerpt at position 0 (case-insensitive), so it can't accidentally
 * delete real body content that happens to share a few words with the title.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripCmsPreamble(
  bodyText: string,
  title?: string | null,
  excerpt?: string | null
): string {
  let text = bodyText;

  // Strip title (first line)
  if (title?.trim()) {
    text = text
      .replace(new RegExp(`^${escapeRegex(title.trim())}\\s*\\n?`, "i"), "")
      .trimStart();
  }

  // Strip excerpt (now first line, after title was removed)
  if (excerpt?.trim()) {
    text = text
      .replace(new RegExp(`^${escapeRegex(excerpt.trim())}\\s*\\n?`, "i"), "")
      .trimStart();
  }

  return text.trim();
}
