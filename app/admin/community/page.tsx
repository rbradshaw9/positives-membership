import { requireAdminPermission } from "@/lib/auth/require-admin";
import {
  COMMUNITY_MODERATION_STATUS_OPTIONS,
  COMMUNITY_POST_TYPE_OPTIONS,
  COMMUNITY_REPORT_STATUS_OPTIONS,
  getCommunityDisplayName,
  getCommunityLaneLabel,
} from "@/lib/community/shared";
import {
  getAdminCommunityReports,
  getAdminCommunityThreads,
} from "@/lib/queries/get-community-posts";
import {
  updateCommunityPostModeration,
  updateCommunityReportReview,
  updateCommunityThreadModeration,
} from "./actions";

export default async function AdminCommunityPage() {
  await requireAdminPermission("community.moderate");

  const [reports, threads] = await Promise.all([
    getAdminCommunityReports(40),
    getAdminCommunityThreads(24),
  ]);

  const openReports = reports.filter((report) => report.status === "open").length;
  const featuredThreads = threads.filter((thread) => thread.is_featured).length;
  const helpfulReplies = threads.flatMap((thread) => thread.replies).filter((reply) => reply.is_official_answer).length;
  const laneCounts = COMMUNITY_POST_TYPE_OPTIONS.map((option) => ({
    label: option.label,
    count: threads.filter((thread) => thread.post_type === option.value).length,
  }));

  return (
    <section className="space-y-8">
      <div className="rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(46,196,182,0.12),rgba(61,182,231,0.1),rgba(255,255,255,0.96))] p-6 shadow-[0_30px_100px_rgba(15,23,42,0.06)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-600">
          Community moderation
        </p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="heading-balance text-[2.6rem] font-semibold tracking-[-0.06em] text-slate-950">
              Keep the room warm, useful, and easy to trust.
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              The member experience is now one calm feed with three lanes: Wins, Support, and
              Questions. Use this surface to review reports, pin guidance, feature strong posts,
              and mark especially helpful replies.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Open reports</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{openReports}</p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Featured posts</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{featuredThreads}</p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Helpful replies</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{helpfulReplies}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {laneCounts.map((lane) => (
            <div
              key={lane.label}
              className="rounded-full border border-white/70 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-700"
            >
              {lane.label}: {lane.count}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
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
                        {report.reporter?.email ?? getCommunityDisplayName(report.reporter?.name)}
                      </span>
                    </div>

                    {report.thread ? (
                      <div className="mt-3 rounded-2xl bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Post</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {report.thread.title ?? getCommunityLaneLabel("reflection")}
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
        </section>

        <section className="space-y-5">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recent posts and replies</p>
            <h2 className="heading-balance mt-2 text-[1.8rem] font-semibold tracking-[-0.04em] text-slate-950">
              Guide the conversation without over-running it.
            </h2>
            <div className="mt-5 space-y-5">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {getCommunityLaneLabel(thread.post_type)}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {thread.moderation_status}
                    </span>
                    {thread.source_type === "weekly_principle" ? (
                      <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
                        Legacy
                      </span>
                    ) : null}
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
                    <p className="text-xs text-slate-500">
                      {getCommunityDisplayName(thread.member?.name)}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {thread.title ?? getCommunityLaneLabel(thread.post_type)}
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
                        {thread.is_pinned ? "Unpin" : "Pin guidance"}
                      </button>
                    </form>

                    <form action={updateCommunityThreadModeration}>
                      <input type="hidden" name="threadId" value={thread.id} />
                      <input type="hidden" name="feature" value={String(!thread.is_featured)} />
                      <button
                        type="submit"
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        {thread.is_featured ? "Remove feature" : "Feature post"}
                      </button>
                    </form>
                  </div>

                  {thread.replies.length > 0 ? (
                    <div className="mt-4 space-y-3 border-l border-slate-200 pl-4">
                      {thread.replies.map((reply) => (
                        <div key={reply.id} className="rounded-2xl bg-white p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {getCommunityDisplayName(reply.member?.name)}
                            </span>
                            {reply.is_official_answer ? (
                              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                                Helpful
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
                                {reply.is_official_answer ? "Clear helpful" : "Mark helpful"}
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
