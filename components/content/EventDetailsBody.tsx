import { sanitizeEventHtml } from "@/lib/content/sanitize-event-html";
import { MarkdownBody } from "@/components/content/MarkdownBody";

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function EventDetailsBody({ content }: { content: string }) {
  if (!looksLikeHtml(content)) {
    return <MarkdownBody content={content} />;
  }

  const sanitized = sanitizeEventHtml(content);
  if (!sanitized) return null;

  return (
    <div
      className="prose-positives"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
