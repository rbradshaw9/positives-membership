"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  FIRST_PROMOTER_QUERY_PARAM,
  persistFirstPromoterRefId,
} from "@/lib/firstpromoter/referral";

export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const refId = searchParams.get(FIRST_PROMOTER_QUERY_PARAM);
    if (!refId) return;

    persistFirstPromoterRefId(refId);
  }, [searchParams]);

  return null;
}
