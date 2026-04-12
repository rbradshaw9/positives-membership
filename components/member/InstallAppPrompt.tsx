"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type InstallPlatform = "ios" | "android" | null;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "positives:install-prompt-dismissed-at";
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 14;
const HIGH_INTENT_ROUTES = new Set(["/today", "/practice", "/account", "/library", "/events", "/coaching"]);

function wasDismissedRecently() {
  if (typeof window === "undefined") return false;

  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;

  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;

  return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function detectInstallPlatform(): InstallPlatform {
  if (typeof window === "undefined") return null;

  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (ua.includes("macintosh") && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";

  if (/android/.test(ua)) return "android";

  return null;
}

export function InstallAppPrompt() {
  const pathname = usePathname();
  const [platform, setPlatform] = useState<InstallPlatform>(() => {
    if (typeof window === "undefined" || isStandaloneMode()) {
      return null;
    }

    return detectInstallPlatform();
  });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined" || isStandaloneMode()) {
      return true;
    }

    if (wasDismissedRecently()) {
      return true;
    }

    return detectInstallPlatform() !== "ios";
  });
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || isStandaloneMode()) {
      return;
    }

    if (wasDismissedRecently()) {
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
      setPlatform("android");
      setDismissed(false);
    }

    function handleAppInstalled() {
      window.localStorage.removeItem(DISMISS_KEY);
      setDismissed(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const shouldRenderOnRoute = pathname
    ? [...HIGH_INTENT_ROUTES].some((route) => pathname === route || pathname.startsWith(route + "/"))
    : false;

  if (dismissed || !platform || isStandaloneMode() || !shouldRenderOnRoute) {
    return null;
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setIsInstalling(false);

    if (choice.outcome === "accepted") {
      window.localStorage.removeItem(DISMISS_KEY);
      setDismissed(true);
      setDeferredPrompt(null);
      return;
    }

    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  function handleDismiss() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  return (
    <div className="member-container pt-4 md:pt-5">
      <div
        className="rounded-[1.5rem] border px-5 py-4 md:px-6"
        style={{
          background: "linear-gradient(180deg, rgba(47,111,237,0.05) 0%, rgba(78,140,120,0.05) 100%)",
          borderColor: "rgba(47,111,237,0.14)",
          boxShadow: "0 12px 30px rgba(18,20,23,0.05)",
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p
              className="text-[11px] font-semibold uppercase"
              style={{ color: "#2F6FED", letterSpacing: "0.14em" }}
            >
              Quicker access
            </p>
            <h2
              className="mt-2 font-heading text-xl font-bold tracking-[-0.03em] text-foreground"
              style={{ lineHeight: "1.12", textWrap: "balance" }}
            >
              Put Positives on your home screen.
            </h2>
            <p className="mt-2 text-sm leading-body text-muted-foreground">
              {platform === "ios"
                ? "On iPhone or iPad, tap Share in Safari, then choose Add to Home Screen. Positives will open with a cleaner app-like feel the next time."
                : "Install Positives for faster access and an app-like launch directly into your daily practice."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {platform === "android" && deferredPrompt ? (
              <button
                type="button"
                onClick={handleInstall}
                disabled={isInstalling}
                className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                  color: "#FFFFFF",
                  boxShadow: "0 8px 24px rgba(47,111,237,0.24)",
                }}
              >
                {isInstalling ? "Opening install…" : "Install Positives"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold"
              style={{
                borderColor: "rgba(18,20,23,0.12)",
                background: "#FFFFFF",
                color: "#121417",
              }}
            >
              Not now
            </button>
          </div>
        </div>

        {platform === "ios" ? (
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            {[
              "1. Open the Share menu in Safari",
              "2. Choose Add to Home Screen",
              "3. Tap Add to keep Positives one tap away",
            ].map((step) => (
              <div
                key={step}
                className="rounded-2xl border px-4 py-3"
                style={{
                  borderColor: "rgba(18,20,23,0.08)",
                  background: "rgba(255,255,255,0.72)",
                }}
              >
                {step}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
