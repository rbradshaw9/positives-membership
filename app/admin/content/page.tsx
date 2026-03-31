import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { Tables } from "@/types/supabase";

/**
 * app/admin/content/page.tsx
 * Admin content list — Milestone 05.
 * Uses typed Supabase server client for the read query.
 * Active/inactive toggle via Server Action with service role client.
 */
export const metadata = {
  title: "Content — Positives Admin",
};

type ContentRow = Pick<
  Tables<"content">,
  | "id"
  | "title"
  | "type"
  | "is_active"
  | "published_at"
  | "duration_seconds"
  | "castos_episode_url"
  | "s3_audio_key"
>;

function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;

  // Toggle active status — Server Action using service role to bypass RLS.
  async function toggleActive(formData: FormData) {
    "use server";
    const id = formData.get("id")?.toString();
    const current = formData.get("current") === "true";
    if (!id) return;

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    await supabase
      .from("content")
      .update({ is_active: !current })
      .eq("id", id);

    redirect("/admin/content");
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("content")
    .select(
      "id, title, type, is_active, published_at, duration_seconds, castos_episode_url, s3_audio_key"
    )
    .order("published_at", { ascending: false })
    .limit(50);

  const content = (rows ?? []) as ContentRow[];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em] mb-1">
            Content
          </h1>
          <p className="text-muted-foreground text-sm">
            {content.length} record{content.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/content/new"
          className="px-4 py-2 rounded bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover transition-colors shadow-soft"
        >
          + Add daily audio
        </Link>
      </div>

      {params.success === "created" && (
        <div className="bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm rounded-lg p-4 mb-6">
          Content created successfully.
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-4 mb-6">
          Failed to load content: {error.message}
        </div>
      )}

      {content.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-10 text-center">
          <p className="text-muted-foreground text-sm mb-1">No content yet</p>
          <p className="text-xs text-muted-foreground">
            Add your first daily audio to populate the member experience.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Title
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">
                  Published
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">
                  Duration
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">
                  Source
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Toggle
                </th>
              </tr>
            </thead>
            <tbody>
              {content.map((row, i) => {
                const audioSource = row.castos_episode_url
                  ? "Castos"
                  : row.s3_audio_key
                    ? "S3"
                    : "—";

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                      i % 2 === 0 ? "" : "bg-muted/10"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground line-clamp-1">
                        {row.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                      {formatType(row.type)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${
                          row.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {row.is_active ? "Active" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                      {formatDate(row.published_at)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell tabular-nums">
                      {formatDuration(row.duration_seconds)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      {audioSource}
                    </td>
                    <td className="px-4 py-3">
                      <form action={toggleActive}>
                        <input type="hidden" name="id" value={row.id} />
                        <input
                          type="hidden"
                          name="current"
                          value={String(row.is_active)}
                        />
                        <button
                          type="submit"
                          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                        >
                          {row.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
