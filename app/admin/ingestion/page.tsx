/**
 * app/admin/ingestion/page.tsx
 * Admin ingestion review placeholder — Milestone 01.
 * Will be replaced with real ingestion pipeline UI in a later milestone.
 */
export const metadata = {
  title: "Ingestion — Positives Admin",
};

export default function AdminIngestionPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em] mb-2">
        Ingestion Review
      </h1>
      <p className="text-muted-foreground text-sm mb-8">
        Review and approve AI-generated content before publishing.
      </p>

      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground text-sm">
          Ingestion review will be implemented when the audio pipeline is wired.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Planned: Google Drive → S3 ingestion, transcription, AI title/description approval.
        </p>
      </div>
    </div>
  );
}
