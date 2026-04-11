import Link from "next/link";

export const metadata = {
  title: "Offline — Positives",
  description:
    "You’re offline right now. Reconnect to get back to your Positives practice.",
};

export default function OfflinePage() {
  return (
    <main
      className="min-h-dvh px-6 py-12"
      style={{
        background:
          "radial-gradient(circle at 20% 0%, rgba(47,111,237,0.12) 0%, rgba(246,243,238,1) 42%), linear-gradient(180deg, #FAFAF8 0%, #F6F3EE 100%)",
      }}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-3xl items-center justify-center">
        <section
          className="w-full rounded-[2rem] border p-8 text-center sm:p-10"
          style={{
            background: "#FFFFFF",
            borderColor: "rgba(221,215,207,0.8)",
            boxShadow: "0 24px 80px rgba(18,20,23,0.08)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase"
            style={{ color: "#4E8C78", letterSpacing: "0.14em" }}
          >
            Offline for a moment
          </p>

          <h1
            className="mt-5 font-heading text-4xl font-bold tracking-[-0.05em] text-foreground sm:text-5xl"
            style={{ lineHeight: "1.02", textWrap: "balance" }}
          >
            Positives will be here when your connection comes back.
          </h1>

          <p
            className="mx-auto mt-5 max-w-2xl text-base sm:text-lg"
            style={{ color: "#68707A", lineHeight: "1.8", letterSpacing: "-0.01em" }}
          >
            Right now we can show the app shell, but member audio and account data still need a
            live connection. Reconnect and you can jump straight back into today&apos;s practice.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/today"
              className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                color: "#FFFFFF",
                boxShadow: "0 10px 30px rgba(47,111,237,0.24)",
              }}
            >
              Try again
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border px-6 py-3.5 text-sm font-semibold"
              style={{
                borderColor: "rgba(18,20,23,0.12)",
                color: "#121417",
                background: "#FFFFFF",
              }}
            >
              Go home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
