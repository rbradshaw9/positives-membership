import { requireAdminPermission } from "@/lib/auth/require-admin";
import {
  COMMUNITY_MODERATION_STATUS_OPTIONS,
  COMMUNITY_REPORT_STATUS_OPTIONS,
} from "@/lib/community/shared";
import {
  getAdminCommunityReports,
  getAdminCommunityTags,
  getAdminCommunityThreads,
} from "@/lib/queries/get-community-posts";
import {
  saveCommunityTag,
  toggleCommunityTagActive,
  updateCommunityPostModeration,
  updateCommunityReportReview,
  updateCommunityThreadModeration,
} from "./actions";

export default async function AdminCommunityPage() {
  await requireAdminPermission("community.moderate");

  const [reports, tags, threads] = await Promise.all([
    getAdminCommunityReports(40),
    getAdminCommunityTags(),
    getAdminCommunityThreads(24),
  ]);

  const openReports = reports.filter((report) => report.status === "open").length;
  const hiddenThreads = threads.filter((thread) => thread.moderation_status !== "visible").length;
  const featuredThreads = threads.filter((thread) => thread.is_featured).length;

  return (
    <section className="space-y-8">
      <div className="rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(46,196,182,0.12),rgba(61,182,231,0.1),rgba(255,255,255,0.96))] p-6 shadow-[0_30px_100px_rgba(15,23,42,0.06)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-600">
          Community moderation
        </p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="heading-balance text-[2.6rem] font-semibold tracking-[-0.06em] text-slate-950">
              Keep the conversation warm, useful, and easy to navigate.
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              This is the moderation surface for the new community hub: reports, curated topics,
              featured discussions, and replies that need a little help staying in bounds.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Open reports</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{openReports}</p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hidden / removed</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{hiddenThreads}</p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Featured threads</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{featuredThreads}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-5">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Curated topics</p>
            <h2 className="heading-balance mt-2 text-[1.8rem] font-semibold tracking-[-0.04em] text-slate-950">
              Manage the topic lanes members can post into.
            </h2>
            <form action={saveCommunityTag} className="mt-5 grid gap-3">
              <input name="label" placeholder="Label" className="admin-input" />
              <input name="slug" placeholder="slug" className="admin-input" />
              <textarea
                name="description"
                rows={3}
                placeholder="Short description for this topic."
                className="admin-input"
              />
              <input name="sortOrder" type="number" defaultValue={0} className="admin-input" />
              <button
                type="submit"
                className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(46,196,182,0.24)]"
              >
                Add topic
              </button>
            </form>
          </div>

          <div className="space-y-3">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_16px_42px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="heading-balance text-xl font-semibold tracking-[-0.03em] text-slate-950">
                      {tag.label}
                    </h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{tag.slug}</p>
                    {tag.description ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">{tag.description}</p>
                    ) : null}
                  </div>
                  <form action={toggleCommunityTagActive}>
                    <input type="hidden" name="tagId" value={tag.id} />
                    <input type="hidden" name="isActive" value={String(tag.is_active)} />
                    <button
                      type="submit"
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${
                        tag.is_active
                          ? "bg-primary/10 text-primary"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {tag.is_active ? "Active" : "Inactive"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reports queue</p>
            <h2 className="heading-balance mt-2 text-[1.8rem] font-semibold tracking-[-0.04em] text-slate-950">
              Review what members flagged.
            </h2>
            <div className="mt-5 space-y-4">
              {reports.length === 0 ? (
                <p className="text-sm text-slate-600">No reports yet.</p>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {report.reason}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {report.status}
                      </span>
                      <span className="ml-auto text-xs text-slate-500">
                        {report.reporter?.email ?? report.reporter?.name ?? "Member"}
                      </span>
                    </div>

                    {report.thread ? (
                      <div className="mt-3 rounded-2xl bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Thread</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {report.thread.title ?? "Weekly reflection"}
                        </p>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                          {report.thread.body}
                        </p>
                      </div>
                    ) : null}

                    {report.post ? (
                      <div className="mt-3 rounded-2xl bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Reply</p>
                        <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600">{report.post.body}</p>
                      </div>
                    ) : null}

                    {report.details ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">{report.details}</p>
                    ) : null}

                    <form action={updateCommunityReportReview} className="mt-4 grid gap-3">
                      <input type="hidden" name="reportId" value={report.id} />
                      <select name="status" defaultValue={report.status} className="admin-input">
                        {COMMUNITY_REPORT_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <textarea
                        name="moderatorNote"
                        rows={2}
                        defaultValue={report.moderator_note ?? ""}
                        placeholder="Internal moderation note"
                        className="admin-input"
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        Save review
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Threads and replies</p>
            <h2 className="heading-balance mt-2 text-[1.8rem] font-semibold tracking-[-0.04em] text-slate-950">
              Moderate recent activity.
            </h2>
            <div className="mt-5 space-y-5">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {thread.source_type === "weekly_principle" ? "This week" : "Standalone"}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {thread.moderation_status}
                    </span>
                    {thread.is_pinned ? (
                      <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                        Pinned
                      </span>
                    ) : null}
                    {thread.is_featured ? (
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                        Featured
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 rounded-2xl bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {thread.title ?? "Weekly reflection"}
                    </p>
                    <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600">
                      {thread.body}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {COMMUNITY_MODERATION_STATUS_OPTIONS.map((option) => (
                      <form action={updateCommunityThreadModeration} key={`${thread.id}-${option.value}`}>
                        <input type="hidden" name="threadId" value={thread.id} />
                        <input type="hidden" name="moderationStatus" value={option.value} />
                        <button
                          type="submit"
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          {option.label}
                        </button>
                      </form>
                    ))}

                    <form action={updateCommunityThreadModeration}>
                      <input type="hidden" name="threadId" value={thread.id} />
                      <input type="hidden" name="pin" value={String(!thread.is_pinned)} />
                      <button
                        type="submit"
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        {thread.is_pinned ? "Unpin" : "Pin"}
                      </button>
                    </form>

                    <form action={updateCommunityThreadModeration}>
                      <input type="hidden" name="threadId" value={thread.id} />
                      <input type="hidden" name="feature" value={String(!thread.is_featured)} />
                      <button
                        type="submit"
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        {thread.is_featured ? "Unfeature" : "Feature"}
                      </button>
                    </form>
                  </div>

                  {thread.replies.length > 0 ? (
                    <div className="mt-4 space-y-3 border-l border-slate-200 pl-4">
                      {thread.replies.map((reply) => (
                        <div key={reply.id} className="rounded-2xl bg-white p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {reply.member?.name ?? "Member"}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Depth {reply.depth}
                            </span>
                            {reply.is_official_answer ? (
                              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                                Official
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{reply.body}</p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {COMMUNITY_MODERATION_STATUS_OPTIONS.map((option) => (
                              <form action={updateCommunityPostModeration} key={`${reply.id}-${option.value}`}>
                                <input type="hidden" name="postId" value={reply.id} />
                                <input type="hidden" name="moderationStatus" value={option.value} />
                                <button
                                  type="submit"
                                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700"
                                >
                                  {option.label}
                                </button>
                              </form>
                            ))}
                            <form action={updateCommunityPostModeration}>
                              <input type="hidden" name="postId" value={reply.id} />
                              <input type="hidden" name="official" value={String(!reply.is_official_answer)} />
                              <button
                                type="submit"
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700"
                              >
                                {reply.is_official_answer ? "Clear official" : "Mark official"}
                              </button>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
