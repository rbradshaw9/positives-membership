"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

const ACTIVE_CAMPAIGN_ACCOUNT_ID = "613469526";

const ACTIVE_CAMPAIGN_INIT = `
  (function(e,t,o,n,p,r,i){
    e.visitorGlobalObjectAlias=n;
    e[e.visitorGlobalObjectAlias]=e[e.visitorGlobalObjectAlias]||function(){
      (e[e.visitorGlobalObjectAlias].q=e[e.visitorGlobalObjectAlias].q||[]).push(arguments)
    };
    e[e.visitorGlobalObjectAlias].l=(new Date).getTime();
    r=t.createElement("script");
    r.src=o;
    r.async=true;
    i=t.getElementsByTagName("script")[0];
    i.parentNode.insertBefore(r,i)
  })(window,document,"https://diffuser-cdn.app-us1.com/diffuser/diffuser.js","vgo");
  vgo('setAccount', '${ACTIVE_CAMPAIGN_ACCOUNT_ID}');
  vgo('setTrackByDefault', true);
  vgo('process');
`;

function buildRouteKey(pathname: string | null, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query ? `${pathname ?? "/"}?${query}` : pathname ?? "/";
}

export function ActiveCampaignTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialRouteRef = useRef<string | null>(null);

  useEffect(() => {
    const routeKey = buildRouteKey(pathname, searchParams);

    if (initialRouteRef.current === null) {
      initialRouteRef.current = routeKey;
      return;
    }

    if (initialRouteRef.current === routeKey || typeof window.vgo !== "function") {
      return;
    }

    window.vgo("process");
  }, [pathname, searchParams]);

  return (
    <Script id="activecampaign-tracking" strategy="afterInteractive">
      {ACTIVE_CAMPAIGN_INIT}
    </Script>
  );
}
