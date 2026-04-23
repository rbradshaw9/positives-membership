"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { markBetaFeedbackThreadViewed, replyToBetaFeedback, submitBetaFeedback } from "@/app/(member)/feedback/actions";
import type { MemberBetaFeedbackThread } from "@/lib/beta-feedback/data";
import {
  BETA_FEEDBACK_CATEGORY_LABEL,
  BETA_FEEDBACK_CATEGORY_OPTIONS,
  BETA_FEEDBACK_SEVERITY_LABEL,
  BETA_FEEDBACK_SEVERITY_OPTIONS,
  BETA_FEEDBACK_STATUS_LABEL,
} from "@/lib/beta-feedback/shared";

type Props = {
  memberEmail: string | null;
  memberName: string | null;
  surface?: "member" | "admin";
  initialThreads?: MemberBetaFeedbackThread[];
  initialUnreadCount?: number;
};

type FeedbackActionState = {
  success?: string;
  error?: string;
};

const INITIAL_STATE: FeedbackActionState = {};

function getBrowserContext() {
  if (typeof window === "undefined") {
    return {
      pageUrl: "",
      browserName: "",
      osName: "",
      deviceType: "desktop",
      viewportWidth: "",
      viewportHeight: "",
      timezone: "",
      userAgent: "",
    };
  }

  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform || "";
  const width = window.innerWidth;
  const browserName =
    userAgent.includes("Edg/") ? "Edge" :
    userAgent.includes("Chrome/") ? "Chrome" :
    userAgent.includes("Firefox/") ? "Firefox" :
    userAgent.includes("Safari/") && !userAgent.includes("Chrome/") ? "Safari" :
    "Other";
  const osName =
    /iPhone|iPad|iPod/.test(userAgent) ? "iOS" :
    /Android/.test(userAgent) ? "Android" :
    platform.includes("Mac") ? "macOS" :
    platform.includes("Win") ? "Windows" :
    platform.includes("Linux") ? "Linux" :
    "Other";
  const deviceType = width < 640 ? "mobile" : width < 1024 ? "tablet" : "desktop";

  return {
    pageUrl: window.location.href,
    browserName,
    osName,
    deviceType,
    viewportWidth: String(width),
    viewportHeight: String(window.innerHeight),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    userAgent,
  };
}

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function ThreadReplyForm({ feedbackId }: { feedbackId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction, pending] = useActionState(replyToBetaFeedback, INITIAL_STATE);

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    router.refresh();
  }, [router, state.success]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 grid gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-4">
      <input type="hidden" name="feedbackId" value={feedbackId} />
      <label className="grid gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Reply
        </span>
        <textarea
          name="body"
          rows={3}
          placeholder="Add a little more context, answer a follow-up question, or clarify what you meant."
          className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400"
        />
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(46,196,182,0.28)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Sending..." : "Send reply"}
      </button>
    </form>
  );
}

export function BetaFeedbackWidget({
  memberEmail,
  memberName,
  surface = "member",
  initialThreads = [],
  initialUnreadCount = 0,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"send" | "inbox">(initialUnreadCount > 0 ? "inbox" : "send");
  const [openThreadId, setOpenThreadId] = useState<string | null>(initialThreads[0]?.id ?? null);
  const [viewedThreadIds, setViewedThreadIds] = useState<string[]>([]);
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(submitBetaFeedback, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [browserContext, setBrowserContext] = useState(getBrowserContext);

  useEffect(() => {
    const onResize = () => setBrowserContext(getBrowserContext());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onOpen = () => {
      setBrowserContext(getBrowserContext());
      setIsOpen(true);
    };

    window.addEventListener("positives:open-beta-feedback", onOpen as EventListener);
    return () =>
      window.removeEventListener("positives:open-beta-feedback", onOpen as EventListener);
  }, []);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.success]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const memberLabel = useMemo(() => {
    if (memberName) return memberName;
    if (memberEmail) return memberEmail;
    return "there";
  }, [memberEmail, memberName]);

  const threads = useMemo(
    () =>
      initialThreads.map((thread) => ({
        ...thread,
        unreadReplyCount: viewedThreadIds.includes(thread.id) ? 0 : thread.unreadReplyCount,
      })),
    [initialThreads, viewedThreadIds]
  );

  const unreadCount = useMemo(
    () => threads.reduce((sum, thread) => sum + thread.unreadReplyCount, 0),
    [threads]
  );

  const selectedThreadId =
    openThreadId && threads.some((thread) => thread.id === openThreadId)
      ? openThreadId
      : threads[0]?.id ?? null;

  async function handleOpenThread(threadId: string, hasUnreadReplies: boolean) {
    setOpenThreadId(threadId);
    if (!hasUnreadReplies) return;
    setViewedThreadIds((current) => (current.includes(threadId) ? current : [...current, threadId]));

    startTransition(async () => {
      await markBetaFeedbackThreadViewed(threadId);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setIsOpen((open) => {
            if (!open) {
              setBrowserContext(getBrowserContext());
              if (unreadCount > 0) {
                setActiveTab("inbox");
              }
            }
            return !open;
          })
        }
        className={[
          "fixed bottom-28 right-4 z-40 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold backdrop-blur md:bottom-8",
          unreadCount > 0
            ? "border border-teal-200 bg-white text-slate-900 shadow-[0_22px_58px_rgba(46,196,182,0.22)] ring-4 ring-teal-100/70"
            : "border border-sky-200/80 bg-white/96 text-slate-700 shadow-[0_18px_48px_rgba(15,23,42,0.14)]",
        ].join(" ")}
      >
        <span>{unreadCount > 0 ? "New feedback replies" : "Share beta feedback"}</span>
        {unreadCount > 0 ? (
          <span className="inline-flex min-w-[1.4rem] items-center justify-center rounded-full bg-teal-500 px-1.5 py-0.5 text-[0.7rem] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end overflow-y-auto bg-slate-950/18 p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:p-6"
          role="presentation"
        >
          <div
            className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,250,255,0.96))] shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="beta-feedback-title"
          >
            <div className="shrink-0 border-b border-slate-200/80 bg-white/92 px-5 py-4 backdrop-blur md:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-600">
                    Beta feedback
                  </p>
                  <h2
                    id="beta-feedback-title"
                    className="mt-2 text-[1.45rem] font-semibold tracking-[-0.03em] text-slate-950"
                  >
                    Tell us what slowed you down
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    Send a report, then come back here to see replies from the team. We&apos;ll capture the page, device, and release details automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close feedback form"
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("send")}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    activeTab === "send"
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-700",
                  ].join(" ")}
                >
                  Send feedback
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("inbox")}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    activeTab === "inbox"
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-700",
                  ].join(" ")}
                >
                  <span>My feedback</span>
                  {unreadCount > 0 ? (
                    <span className="inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-teal-500 px-1.5 py-0.5 text-[0.68rem] font-semibold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>

            {activeTab === "send" ? (
              <form
                ref={formRef}
                action={formAction}
                className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6"
              >
                <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
                  Sending this as <span className="font-semibold">{memberLabel}</span>.
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-800">Category</span>
                    <select
                      name="category"
                      required
                      defaultValue="bug"
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                    >
                      {BETA_FEEDBACK_CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-800">Urgency</span>
                    <select
                      name="severity"
                      required
                      defaultValue="medium"
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                    >
                      {BETA_FEEDBACK_SEVERITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="mt-4 grid gap-2">
                  <span className="text-sm font-semibold text-slate-800">Quick summary</span>
                  <input
                    name="summary"
                    required
                    minLength={8}
                    placeholder="Example: The billing page refreshed and lost my place"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
                  />
                </label>

                <label className="mt-4 grid gap-2">
                  <span className="text-sm font-semibold text-slate-800">What happened?</span>
                  <textarea
                    name="details"
                    required
                    minLength={16}
                    rows={5}
                    placeholder="Walk us through what you clicked, what you saw, and anything that felt confusing."
                    className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400"
                  />
                </label>

                <label className="mt-4 grid gap-2">
                  <span className="text-sm font-semibold text-slate-800">What did you expect instead?</span>
                  <textarea
                    name="expectedBehavior"
                    rows={3}
                    placeholder="Optional, but really helpful."
                    className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400"
                  />
                </label>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-800">Screenshot</span>
                    <input
                      type="file"
                      name="screenshot"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-800">Loom link</span>
                    <input
                      type="url"
                      name="loomUrl"
                      placeholder="https://www.loom.com/..."
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
                    />
                  </label>
                </div>

                <input type="hidden" name="pageUrl" value={browserContext.pageUrl} />
                <input type="hidden" name="browserName" value={browserContext.browserName} />
                <input type="hidden" name="osName" value={browserContext.osName} />
                <input type="hidden" name="deviceType" value={browserContext.deviceType} />
                <input type="hidden" name="viewportWidth" value={browserContext.viewportWidth} />
                <input type="hidden" name="viewportHeight" value={browserContext.viewportHeight} />
                <input type="hidden" name="timezone" value={browserContext.timezone} />
                <input type="hidden" name="userAgent" value={browserContext.userAgent} />
                <input type="hidden" name="submittedFrom" value={surface === "admin" ? "admin_widget" : "member_widget"} />

                {state.error ? (
                  <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {state.error}
                  </p>
                ) : null}

                {state.success ? (
                  <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {state.success}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-5">
                  <p className="max-w-md text-xs leading-5 text-slate-500">
                    We automatically attach your page, device, and release context so you don&apos;t have to document all the technical details manually.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded-full bg-[linear-gradient(135deg,#2ec4b6,#3db6e7)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(46,196,182,0.28)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {pending ? "Sending..." : "Send feedback"}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
                {threads.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                    <p className="text-lg font-semibold tracking-[-0.03em] text-slate-900">
                      No feedback yet
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      When you send feedback, this tab becomes your running conversation with the team.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {unreadCount > 0 ? (
                      <div className="rounded-[22px] border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-900">
                        <p className="font-semibold">
                          You have {unreadCount} new {unreadCount === 1 ? "reply" : "replies"} from the Positives team.
                        </p>
                        <p className="mt-1 leading-6 text-teal-800">
                          Open any highlighted feedback item below to read the reply and keep the conversation moving.
                        </p>
                      </div>
                    ) : null}

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
                    <div className="space-y-3">
                      {threads.map((thread) => {
                        const isSelected = thread.id === selectedThreadId;
                        const lastTeamReply = [...thread.comments]
                          .reverse()
                          .find((comment) => comment.author_kind !== "member");
                        return (
                          <button
                            key={thread.id}
                            type="button"
                            onClick={() => handleOpenThread(thread.id, thread.unreadReplyCount > 0)}
                            className={[
                              "w-full rounded-[22px] border px-4 py-4 text-left transition-colors",
                              isSelected
                                ? "border-teal-200 bg-teal-50/70"
                                : thread.unreadReplyCount > 0
                                  ? "border-teal-200 bg-teal-50/40 hover:bg-teal-50/60"
                                : "border-slate-200 bg-white hover:bg-slate-50",
                            ].join(" ")}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                {BETA_FEEDBACK_STATUS_LABEL[thread.status]}
                              </span>
                              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                {BETA_FEEDBACK_CATEGORY_LABEL[thread.category]}
                              </span>
                              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                {BETA_FEEDBACK_SEVERITY_LABEL[thread.severity]}
                              </span>
                              {thread.unreadReplyCount > 0 ? (
                                <span className="rounded-full border border-teal-200 bg-teal-100 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-teal-700">
                                  {thread.unreadReplyCount} new {thread.unreadReplyCount === 1 ? "reply" : "replies"}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-3 text-sm font-semibold text-slate-900">{thread.summary}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Updated {formatCompactDate(thread.updated_at)}
                            </p>
                            {thread.unreadReplyCount > 0 ? (
                              <p className="mt-2 text-xs font-medium text-teal-700">
                                The team replied. Open to read the newest note.
                              </p>
                            ) : lastTeamReply ? (
                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                Latest team note: {lastTeamReply.body}
                              </p>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                      {threads.find((thread) => thread.id === selectedThreadId) ? (
                        (() => {
                          const thread = threads.find((item) => item.id === selectedThreadId)!;
                          return (
                            <div className="space-y-4">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                    {BETA_FEEDBACK_STATUS_LABEL[thread.status]}
                                  </span>
                                  {thread.approved_for_development ? (
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                      Approved for development
                                    </span>
                                  ) : null}
                                </div>
                                <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                                  {thread.summary}
                                </h3>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                  {thread.details}
                                </p>
                              </div>

                              <div className="space-y-3">
                                <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Original report
                                  </p>
                                  <p className="mt-2 text-xs text-slate-500">
                                    Sent {formatCompactDate(thread.created_at)}
                                  </p>
                                </div>

                                {thread.comments.length > 0 ? (
                                  thread.comments.map((comment) => (
                                    <div key={comment.id} className="rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-3">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold text-slate-900">
                                          {comment.author_kind === "member" ? "You" : "Positives team"}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          {formatCompactDate(comment.created_at)}
                                        </span>
                                      </div>
                                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                        {comment.body}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 text-sm text-slate-500">
                                    No replies yet. If the team needs clarification, you’ll see it here and on the feedback button.
                                  </div>
                                )}
                              </div>

                              <ThreadReplyForm feedbackId={thread.id} />
                            </div>
                          );
                        })()
                      ) : (
                        <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
                          Pick a feedback item to view the conversation.
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
