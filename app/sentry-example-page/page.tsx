"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export default function SentryExamplePage() {
  const [status, setStatus] = useState<"idle" | "client" | "server">("idle");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(68,168,216,0.18),_transparent_38%),linear-gradient(180deg,_#07111f_0%,_#0e1e33_58%,_#f7f5ef_58%,_#f7f5ef_100%)] px-6 py-16">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/95 shadow-[0_24px_90px_rgba(4,12,24,0.18)]">
        <section className="bg-[linear-gradient(150deg,_#081221_0%,_#112746_54%,_#18446f_100%)] px-8 py-12 text-white md:px-12">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/80">
            Sentry verification
          </p>
          <h1
            className="max-w-[12ch] text-4xl font-semibold tracking-[-0.04em] md:text-5xl"
            style={{ textWrap: "balance" }}
          >
            Make sure errors reach Sentry.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">
            Use this page during setup to trigger one client-side exception and one
            server-side exception. Once the DSN and project settings are live, both
            should appear in Sentry Issues.
          </p>
        </section>

        <section className="grid gap-6 px-8 py-10 md:grid-cols-2 md:px-12">
          <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Client error
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Sends a captured browser exception with the exact message{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs">This is a test error</code>.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus("client");
                Sentry.captureException(new Error("This is a test error"));
              }}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Capture client error
            </button>
          </article>

          <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Server error
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Hits a sample route handler that throws on the server so you can confirm
              request-level capture is working too.
            </p>
            <button
              type="button"
              onClick={async () => {
                setStatus("server");
                await fetch("/api/sentry-example-api");
              }}
              className="mt-6 inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              Trigger server error
            </button>
          </article>
        </section>

        <section className="border-t border-slate-200 px-8 py-6 text-sm text-slate-500 md:px-12">
          {status === "idle"
            ? "After setup, trigger one or both checks and then confirm the issue appears in Sentry."
            : status === "client"
              ? "Client error sent. Check your Sentry Issues dashboard."
              : "Server request triggered. Check your Sentry Issues dashboard."}
        </section>
      </div>
    </main>
  );
}
