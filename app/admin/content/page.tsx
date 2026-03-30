/**
 * app/admin/content/page.tsx
 * Admin content management placeholder — Milestone 01.
 * Will be replaced with real CMS in a later milestone.
 */
export const metadata = {
  title: "Content — Positives Admin",
};

export default function AdminContentPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em] mb-2">
        Content
      </h1>
      <p className="text-muted-foreground text-sm mb-8">
        Manage daily audio, weekly principles, and monthly themes.
      </p>

      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground text-sm">
          Content management will be implemented in a later milestone.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Planned: audio library, principle editor, theme management.
        </p>
      </div>
    </div>
  );
}
