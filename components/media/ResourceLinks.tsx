/**
 * components/media/ResourceLinks.tsx
 * Sprint 6: reusable resource/download rendering.
 *
 * Handles two sources:
 *   - download_url (string | null) — single primary download
 *   - resource_links (Json array) — [{label: string, url: string, type?: string}]
 *
 * Visual treatment: quiet, subordinate. Uses small text and muted colors so
 * it doesn't compete with the content title or media. Renders nothing if empty.
 *
 * Server component — no state needed.
 */

import type { Json } from "@/types/supabase";

interface ResourceLink {
  label: string;
  url: string;
  type?: string; // e.g. "pdf", "worksheet", "audio", "link"
}

interface ResourceLinksProps {
  downloadUrl?: string | null;
  resourceLinks?: Json | null;
  /** Color accent for icons/text — matches the card context */
  accentClass?: string;
}

function parseResourceLinks(raw: Json | null | undefined): ResourceLink[] {
  if (!raw || !Array.isArray(raw)) return [];
  const results: ResourceLink[] = [];
  for (const item of raw) {
    // Cast through unknown to safely inspect shape at runtime
    const obj = item as unknown as Record<string, unknown>;
    if (
      obj &&
      typeof obj === "object" &&
      typeof obj.label === "string" &&
      typeof obj.url === "string"
    ) {
      results.push({
        label: obj.label,
        url: obj.url,
        type: typeof obj.type === "string" ? obj.type : undefined,
      });
      if (results.length >= 5) break; // safety cap
    }
  }
  return results;
}

function ResourceIcon({ type }: { type?: string }) {
  // PDF / document
  if (type === "pdf" || type === "worksheet") {
    return (
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
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  }
  // Audio
  if (type === "audio") {
    return (
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
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );
  }
  // Download (default for download_url)
  if (type === "download") {
    return (
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
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    );
  }
  // External link (default)
  return (
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
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function ResourceLinks({
  downloadUrl,
  resourceLinks,
  accentClass = "text-secondary hover:text-secondary-hover",
}: ResourceLinksProps) {
  const parsed = parseResourceLinks(resourceLinks);
  const hasDownload = !!downloadUrl;
  const hasLinks = parsed.length > 0;

  if (!hasDownload && !hasLinks) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {/* Primary download */}
      {hasDownload && (
        <a
          href={downloadUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${accentClass}`}
        >
          <ResourceIcon type="download" />
          <span>Download</span>
        </a>
      )}

      {/* Additional resource links */}
      {parsed.map((link, i) => (
        <a
          key={i}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${accentClass}`}
        >
          <ResourceIcon type={link.type} />
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
}
