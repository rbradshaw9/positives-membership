"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

const FP_INIT = `(function(w){w.fpr=w.fpr||function(){w.fpr.q=w.fpr.q||[];w.fpr.q[arguments[0]==='set'?'unshift':'push'](arguments);}})(window);fpr("init",{cid:"7nn3rxov"});fpr("click");`;

function shouldLoadFirstPromoter(pathname: string | null) {
  if (!pathname) return false;

  return (
    pathname === "/" ||
    pathname === "/join" ||
    pathname === "/about" ||
    pathname === "/faq" ||
    pathname === "/support" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/affiliate-program" ||
    pathname === "/contact" ||
    pathname === "/subscribe/success"
  );
}

export function FirstPromoterScripts() {
  const pathname = usePathname();

  if (!shouldLoadFirstPromoter(pathname)) {
    return null;
  }

  return (
    <>
      <Script id="fp-init" strategy="afterInteractive">
        {FP_INIT}
      </Script>
      <Script
        id="fp-sdk"
        src="https://cdn.firstpromoter.com/fpr.js"
        strategy="afterInteractive"
      />
    </>
  );
}
