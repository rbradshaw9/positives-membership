"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(68,168,216,0.18),_transparent_42%),linear-gradient(180deg,_#07111f_0%,_#0b1626_48%,_#f8f7f2_48%,_#f8f7f2_100%)] text-slate-950">
        <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
          <section className="grid w-full gap-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/95 shadow-[0_24px_90px_rgba(4,12,24,0.18)] md:grid-cols-[1.05fr_0.95fr]">
            <div className="bg-[linear-gradient(160deg,_#081221_0%,_#10233f_52%,_#163962_100%)] px-8 py-12 text-white md:px-12">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/80">
                Positives
              </p>
              <h1
                className="max-w-[12ch] text-4xl font-semibold tracking-[-0.04em] md:text-5xl"
                style={{ textWrap: "balance" }}
              >
                Something interrupted the moment.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-200">
                The page hit an unexpected error. We&apos;ve captured the details so we can
                fix it, and you can either try again or head back to a steadier place.
              </p>
            </div>

            <div className="flex flex-col justify-between px-8 py-12 md:px-12">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">
                  What you can do
                </p>
                <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
                  <li>Try the page again in case this was just a temporary hiccup.</li>
                  <li>Return to today&apos;s practice if you were already signed in.</li>
                  <li>Go back to the public site if you want to re-enter more slowly.</li>
                </ul>
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => reset()}
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Try again
                </button>
                <Link
                  href="/today"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Go to Today
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full border border-transparent px-6 py-3 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                >
                  Back to home
                </Link>
              </div>

              <p className="mt-6 text-xs leading-6 text-slate-400">
                Reference: {error.digest ?? "captured by Sentry"}
              </p>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
