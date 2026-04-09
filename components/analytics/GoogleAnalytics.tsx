"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { pageview, track } from "@/lib/analytics/ga";

interface GoogleAnalyticsProps {
  measurementId: string;
}

function buildCurrentUrl(
  pathname: string,
  searchParams: Pick<URLSearchParams, "toString">
) {
  const query = searchParams.toString();
  const url = new URL(pathname || "/", window.location.origin);
  if (query) {
    url.search = query;
  }
  return url.toString();
}

function shouldTrackPage(pathname: string) {
  return !pathname.startsWith("/admin");
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!measurementId || !pathname || !isReady || !shouldTrackPage(pathname)) {
      return;
    }

    const url = buildCurrentUrl(pathname, searchParams);
    pageview(url, document.title);

    const fpr = searchParams.get("fpr");
    if (!fpr) {
      return;
    }

    const dedupeKey = `positives:analytics:referral:${pathname}:${fpr}`;
    if (window.sessionStorage.getItem(dedupeKey)) {
      return;
    }

    window.sessionStorage.setItem(dedupeKey, "1");
    track("referral_visit_detected", {
      affiliate_code: fpr,
      entry_path: pathname,
      affiliate_attributed: true,
    });
  }, [isReady, measurementId, pathname, searchParams]);

  useEffect(() => {
    if (!measurementId) {
      return;
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const destination = new URL(anchor.href, window.location.origin);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname !== "/join" ||
        !shouldTrackPage(window.location.pathname)
      ) {
        return;
      }

      const label = anchor.textContent?.trim().replace(/\s+/g, " ") || "join";

      track("join_cta_clicked", {
        cta_text: label,
        cta_href: destination.pathname,
        source_path: window.location.pathname,
      });
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [measurementId]);

  return (
    <>
      <Script
        id="ga4-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
        onReady={() => setIsReady(true)}
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            send_page_view: false,
            allow_google_signals: false,
            cookie_domain: 'positives.life'
          });
        `}
      </Script>
    </>
  );
}
