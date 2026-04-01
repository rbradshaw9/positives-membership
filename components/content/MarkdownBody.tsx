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
 */

interface MarkdownBodyProps {
  content: string;
  className?: string;
}

export function MarkdownBody({ content, className }: MarkdownBodyProps) {
  return (
    <div className={`prose-positives${className ? ` ${className}` : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
