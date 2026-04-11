"use client";

import Link from "next/link";
import { Suspense, type ComponentProps } from "react";
import { useSearchParams } from "next/navigation";
import { appendPublicTrackingParamsFromEntries } from "@/lib/marketing/public-query-params";

type PublicTrackedLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

function ResolvedPublicTrackedLink({
  href,
  ...props
}: PublicTrackedLinkProps) {
  const searchParams = useSearchParams();
  const trackedHref = appendPublicTrackingParamsFromEntries(
    href,
    searchParams.entries()
  );

  return <Link href={trackedHref} {...props} />;
}

export function PublicTrackedLink(props: PublicTrackedLinkProps) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <ResolvedPublicTrackedLink {...props} />
    </Suspense>
  );
}
