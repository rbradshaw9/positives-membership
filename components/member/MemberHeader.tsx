import Image from "next/image";

/**
 * components/member/MemberHeader.tsx
 * Sprint 7: branded top header for the member area.
 *
 * Scrolls with content (NOT sticky) to keep the UI calm.
 * Shows the Positives wordmark (left) and streak chip (right).
 */

interface MemberHeaderProps {
  streak?: number;
}

export function MemberHeader({ streak = 0 }: MemberHeaderProps) {
  return (
    <header className="w-full bg-card border-b border-border">
      <div className="max-w-2xl mx-auto px-5 h-12 flex items-center justify-between">
        <Image
          src="/logos/positives-wordmark-dark.png"
          alt="Positives"
          width={88}
          height={20}
          style={{ height: 18, width: "auto", opacity: 0.55 }}
          priority
        />
        {streak > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
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
              className={streak >= 7 ? "text-secondary" : "text-muted-foreground"}
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
            </svg>
            Day {streak}
          </span>
        )}
      </div>
    </header>
  );
}
