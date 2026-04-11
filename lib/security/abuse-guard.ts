import { createHash } from "node:crypto";
import { config } from "@/lib/config";
import { getAdminClient } from "@/lib/supabase/admin";

const FALLBACK_IP = "unknown";

type AbuseGuardInput = {
  scope: string;
  keyParts: Array<string | null | undefined>;
  maxHits: number;
  windowSeconds: number;
};

type AbuseGuardResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  hitCount: number;
};

type GuardRateLimitRow = {
  allowed: boolean;
  retry_after_seconds: number;
  hit_count: number;
};

function normalizeKeyParts(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .map((part) => part!.toLowerCase());
}

function hashAbuseKey(value: string) {
  return createHash("sha256")
    .update(`${config.security.abuseGuardSecret}:${value}`)
    .digest("hex");
}

export function getClientIp(headersLike: Headers) {
  const forwarded = headersLike.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || FALLBACK_IP;
  }

  return (
    headersLike.get("x-real-ip") ??
    headersLike.get("cf-connecting-ip") ??
    headersLike.get("fly-client-ip") ??
    FALLBACK_IP
  );
}

export async function checkAbuseGuard({
  scope,
  keyParts,
  maxHits,
  windowSeconds,
}: AbuseGuardInput): Promise<AbuseGuardResult> {
  const normalizedParts = normalizeKeyParts(keyParts);
  const hashedBucket = hashAbuseKey([scope, ...normalizedParts].join("|"));
  const supabase = getAdminClient();

  const { data, error } = await (supabase as never as {
    rpc: (
      fn: string,
      args: Record<string, string | number>
    ) => Promise<{ data: GuardRateLimitRow[] | GuardRateLimitRow | null; error: { message: string } | null }>;
  }).rpc("guard_rate_limit", {
    p_scope: scope,
    p_bucket: hashedBucket,
    p_window_seconds: windowSeconds,
    p_max_hits: maxHits,
  });

  if (error) {
    console.error(`[abuse-guard] ${scope} RPC failed:`, error.message);
    return {
      allowed: true,
      retryAfterSeconds: 0,
      hitCount: 0,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
      hitCount: 0,
    };
  }

  return {
    allowed: row.allowed,
    retryAfterSeconds: row.retry_after_seconds,
    hitCount: row.hit_count,
  };
}
