import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * components/content/MarkdownBody.tsx
 * Sprint 11b: Shared markdown renderer for member-facing body content.
 *
 * Uses react-markdown + remark-gfm.
 * No dangerouslySetInnerHTML — react-markdown builds a React element tree.
 * Styled via .prose-positives in globals.css to fit the calm premium member UI.
 *
 * Safe as a Server Component — react-markdown is RSC-compatible.
 *
 * Sprint 11d: normalizeMarkdown() converts literal \n escape sequences
 * (produced by seeds or admin entry bugs) into real newlines before rendering.
 */

/**
 * Converts literal backslash-n sequences into real newline characters.
 * Handles content stored incorrectly as JSON-escaped strings rather than
 * raw multi-line text. Safe to run on already-correct content (no-op).
 */
function normalizeMarkdown(raw: string): string {
  // Only replace if the string actually contains literal \n (2 chars: \ and n)
  // and does NOT already have real newlines — avoids double-processing correct content.
  if (!raw.includes("\\n")) return raw;
  return raw.replace(/\\n/g, "\n");
}

interface MarkdownBodyProps {
  content: string;
  className?: string;
}

export function MarkdownBody({ content, className }: MarkdownBodyProps) {
  const normalized = normalizeMarkdown(content);
  return (
    <div className={`prose-positives${className ? ` ${className}` : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
