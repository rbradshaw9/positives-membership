/**
 * app/admin/page.tsx
 * Admin overview shell — Milestone 01.
 */
export const metadata = {
  title: "Admin Overview — Positives",
};

export default function AdminPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em] mb-2">
        Admin Overview
      </h1>
      <p className="text-muted-foreground text-sm mb-8">
        Manage content, ingestion, and member data.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          {
            href: "/admin/content",
            title: "Content Management",
            description: "Review and publish daily audio, principles, and themes.",
            status: "Placeholder",
          },
          {
            href: "/admin/ingestion",
            title: "Ingestion Review",
            description:
              "Review AI-generated titles and descriptions for incoming audio.",
            status: "Placeholder",
          },
        ].map(({ href, title, description, status }) => (
          <a
            key={href}
            href={href}
            className="block bg-card border border-border rounded-lg p-5 hover:shadow-soft transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-base text-foreground">{title}</h2>
              <span className="text-xs text-muted-foreground border border-border rounded-pill px-2 py-0.5">
                {status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
