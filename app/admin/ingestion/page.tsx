/**
 * app/admin/ingestion/page.tsx
 *
 * Placeholder for the future AI content ingestion review pipeline.
 * Will be replaced with a real UI once the audio → S3 → transcription
 * → title/description approval workflow is wired.
 */
export const metadata = {
  title: "Ingestion — Positives Admin",
};

export default function AdminIngestionPage() {
  return (
    <div style={{ maxWidth: "42rem" }}>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">Ingestion Review</h1>
          <p className="admin-page-header__subtitle">
            Review and approve AI-generated content before it is published to members.
          </p>
        </div>
      </div>

      <div className="surface-card" style={{ padding: "2.5rem 2rem", textAlign: "center" }}>
        <div
          style={{
            width: "2.75rem",
            height: "2.75rem",
            borderRadius: "0.75rem",
            background: "var(--color-surface-tint, rgba(18,20,23,0.04))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}
          aria-hidden="true"
        >
          <svg
            width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor"
            strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: "var(--color-text-subtle)" }}
          >
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 8v4l3 3" />
          </svg>
        </div>

        <p
          className="font-heading font-semibold mb-2"
          style={{ fontSize: "1rem", letterSpacing: "-0.02em", color: "var(--color-text-default)" }}
        >
          Not yet activated
        </p>
        <p className="text-sm mb-4" style={{ color: "var(--color-text-subtle)", lineHeight: 1.7 }}>
          The ingestion review queue will appear here once the audio pipeline is connected.
        </p>

        <div
          className="rounded-xl border border-dashed text-left"
          style={{
            borderColor: "var(--color-border)",
            padding: "1rem 1.25rem",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[0.1em] mb-2"
            style={{ color: "var(--color-text-subtle)" }}
          >
            Planned pipeline
          </p>
          <ol
            className="text-xs space-y-1"
            style={{ color: "var(--color-text-subtle)", lineHeight: 1.7, paddingLeft: "1rem" }}
          >
            <li>Audio uploaded → Google Drive / S3 staging bucket</li>
            <li>Transcription via Whisper / Deepgram</li>
            <li>AI generates title, summary, and tags</li>
            <li>Admin reviews and approves here</li>
            <li>Published to member library</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
