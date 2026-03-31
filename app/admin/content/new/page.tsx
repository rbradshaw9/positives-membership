import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import Link from "next/link";

/**
 * app/admin/content/new/page.tsx
 * Admin form to manually create a daily audio content record.
 * Milestone 04 — operational setup tool, not a polished CMS.
 *
 * Fixed to type=daily_audio for this flow.
 * All audio source fields are optional — a record can be created before
 * the audio file is ready, then edited directly in Supabase until the
 * ingestion pipeline is built.
 */
export const metadata = {
  title: "Add Daily Audio — Positives Admin",
};

export default async function AdminContentNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  // Server Action — creates the content row and redirects.
  async function createContent(formData: FormData) {
    "use server";

    // Use the service role client (untyped) for the insert.
    // The manually maintained Database scaffold doesn't satisfy the SDK's
    // Insert overloads — this matches the pattern in handle-subscription.ts.
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const title = formData.get("title")?.toString().trim() ?? "";
    const description = formData.get("description")?.toString().trim() || null;
    const durationRaw = formData.get("duration_seconds")?.toString().trim();
    const duration_seconds = durationRaw ? parseInt(durationRaw, 10) : null;
    const published_at = formData.get("published_at")?.toString().trim() || null;
    const is_active = formData.get("is_active") === "true";
    const castos_episode_url =
      formData.get("castos_episode_url")?.toString().trim() || null;
    const s3_audio_key =
      formData.get("s3_audio_key")?.toString().trim() || null;

    if (!title) {
      redirect("/admin/content/new?error=title_required");
    }

    const { error } = await supabase.from("content").insert({
      title,
      description,
      type: "daily_audio",
      duration_seconds,
      published_at: published_at ? new Date(published_at).toISOString() : new Date().toISOString(),
      is_active,
      castos_episode_url,
      s3_audio_key,
    });

    if (error) {
      console.error("[admin/content/new] Insert error:", error.message);
      redirect("/admin/content/new?error=insert_failed");
    }

    redirect("/admin/content?success=created");
  }

  const hasError = !!params.error;

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Link
          href="/admin/content"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block"
        >
          ← Back to content
        </Link>
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em] mb-1">
          Add daily audio
        </h1>
        <p className="text-muted-foreground text-sm">
          Creates a new daily_audio record. Audio source fields are optional —
          add them once the file is ready.
        </p>
      </div>

      {hasError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-4 mb-6">
          {params.error === "title_required"
            ? "Title is required."
            : "Failed to save record. Check server logs."}
        </div>
      )}

      <form action={createContent} className="bg-card border border-border rounded-lg p-6 flex flex-col gap-5">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium text-foreground">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Morning Grounding"
            className="px-3 py-2 rounded border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="A short audio practice to start your day…"
            className="px-3 py-2 rounded border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
          />
        </div>

        {/* Duration + Published row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="duration_seconds" className="text-sm font-medium text-foreground">
              Duration (seconds)
            </label>
            <input
              id="duration_seconds"
              name="duration_seconds"
              type="number"
              min="0"
              step="1"
              placeholder="480"
              className="px-3 py-2 rounded border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">e.g. 480 = 8 min</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="published_at" className="text-sm font-medium text-foreground">
              Publish date
            </label>
            <input
              id="published_at"
              name="published_at"
              type="date"
              className="px-3 py-2 rounded border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">Defaults to today</p>
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="is_active" className="text-sm font-medium text-foreground">
            Status
          </label>
          <select
            id="is_active"
            name="is_active"
            className="px-3 py-2 rounded border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          >
            <option value="true">Active — visible on /today</option>
            <option value="false">Draft — hidden from members</option>
          </select>
        </div>

        {/* Audio sources */}
        <div className="border-t border-border pt-4 flex flex-col gap-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Audio source (optional — add once file is ready)
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="castos_episode_url" className="text-sm font-medium text-foreground">
              Castos episode URL
            </label>
            <input
              id="castos_episode_url"
              name="castos_episode_url"
              type="url"
              placeholder="https://feeds.castos.com/…/episode.mp3"
              className="px-3 py-2 rounded border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">Preferred playback source</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="s3_audio_key" className="text-sm font-medium text-foreground">
              S3 object key
            </label>
            <input
              id="s3_audio_key"
              name="s3_audio_key"
              type="text"
              placeholder="audio/daily/2026-03-31-morning-grounding.mp3"
              className="px-3 py-2 rounded border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">Fallback if no Castos URL</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 rounded bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover transition-colors shadow-soft"
          >
            Save content
          </button>
          <Link
            href="/admin/content"
            className="px-4 py-2.5 rounded border border-border text-muted-foreground font-medium text-sm hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
