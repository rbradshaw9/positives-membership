/**
 * lib/activecampaign/client.ts
 *
 * Thin typed client for the ActiveCampaign REST API v3.
 *
 * Auth: Api-Token header (not Bearer — AC's non-standard auth).
 * Base URL: https://lopcadmin.api-us1.com/api/3
 *
 * Usage:
 *   import { ac } from "@/lib/activecampaign/client";
 *   const contact = await ac.post("/contact/sync", { contact: { email } });
 */

const BASE_URL = process.env.ACTIVECAMPAIGN_API_URL ?? "https://lopcadmin.api-us1.com";
const API_KEY  = process.env.ACTIVECAMPAIGN_API_KEY ?? "";

if (!API_KEY && typeof window === "undefined") {
  // Warn at boot — not a hard throw so CI doesn't break if var is absent
  console.warn("[AC] ACTIVECAMPAIGN_API_KEY is not set. ActiveCampaign sync will be skipped.");
}

async function request<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${BASE_URL}/api/3${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Api-Token": API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`[AC] ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export const ac = {
  get:    <T>(path: string)                  => request<T>("GET",    path),
  post:   <T>(path: string, body: unknown)   => request<T>("POST",   path, body),
  put:    <T>(path: string, body: unknown)   => request<T>("PUT",    path, body),
  delete: <T>(path: string)                  => request<T>("DELETE", path),
};

/** Returns true if the AC client is configured (API key is set). */
export function acIsConfigured(): boolean {
  return Boolean(process.env.ACTIVECAMPAIGN_API_KEY);
}
