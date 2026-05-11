import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";

export const IMPERSONATION_COOKIE_NAME = "positives_impersonation";
export const IMPERSONATION_MAX_AGE_SECONDS = 4 * 60 * 60;

export type ImpersonationSessionPayload = {
  version: 1;
  actorId: string;
  targetMemberId: string;
  returnTo: string;
  startedAt: number;
  expiresAt: number;
};

type VerifyResult =
  | { ok: true; payload: ImpersonationSessionPayload }
  | { ok: false; reason: "missing" | "malformed" | "expired" | "bad_signature" };

function getSecret() {
  return config.security.abuseGuardSecret || config.supabase.serviceRoleKey;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function sanitizeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin/members";
  }

  if (value.startsWith("/auth/") || value.startsWith("/api/")) {
    return "/admin/members";
  }

  return value;
}

export function createImpersonationSessionToken(params: {
  actorId: string;
  targetMemberId: string;
  returnTo: string;
}) {
  const startedAt = Date.now();
  const payload: ImpersonationSessionPayload = {
    version: 1,
    actorId: params.actorId,
    targetMemberId: params.targetMemberId,
    returnTo: sanitizeReturnTo(params.returnTo),
    startedAt,
    expiresAt: startedAt + IMPERSONATION_MAX_AGE_SECONDS * 1000,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyImpersonationSessionToken(token: string | null | undefined): VerifyResult {
  if (!token) return { ok: false, reason: "missing" };

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return { ok: false, reason: "malformed" };

  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return { ok: false, reason: "bad_signature" };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as Partial<ImpersonationSessionPayload>;

    if (
      payload.version !== 1 ||
      !payload.actorId ||
      !payload.targetMemberId ||
      typeof payload.startedAt !== "number" ||
      typeof payload.expiresAt !== "number"
    ) {
      return { ok: false, reason: "malformed" };
    }

    if (payload.expiresAt < Date.now()) {
      return { ok: false, reason: "expired" };
    }

    return {
      ok: true,
      payload: {
        version: 1,
        actorId: payload.actorId,
        targetMemberId: payload.targetMemberId,
        returnTo: sanitizeReturnTo(payload.returnTo),
        startedAt: payload.startedAt,
        expiresAt: payload.expiresAt,
      },
    };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
