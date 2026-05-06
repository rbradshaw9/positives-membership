import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { getAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "@/lib/zoom/crypto";

type ZoomTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

type ZoomUser = {
  id: string;
  account_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

export function zoomConfigured() {
  return Boolean(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET && process.env.ZOOM_REDIRECT_URI);
}

function zoomClientCredentials() {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Zoom OAuth credentials are not configured.");
  }
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function buildZoomAuthorizeUrl(params: { state: string }) {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const redirectUri = process.env.ZOOM_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("Zoom OAuth environment variables are not configured.");
  }
  const url = new URL("https://zoom.us/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", params.state);
  return url.toString();
}

async function tokenRequest(body: URLSearchParams): Promise<ZoomTokenResponse> {
  const response = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${zoomClientCredentials()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Zoom token request failed: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<ZoomTokenResponse>;
}

export async function exchangeZoomCode(code: string) {
  const redirectUri = process.env.ZOOM_REDIRECT_URI;
  if (!redirectUri) throw new Error("ZOOM_REDIRECT_URI is not configured.");
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    })
  );
}

async function refreshZoomToken(connection: ZoomConnectionRow) {
  const refreshToken = decryptSecret(connection.refresh_token_ciphertext);
  if (!refreshToken) throw new Error("Zoom refresh token is missing.");
  const token = await tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })
  );
  const supabase = asLooseSupabaseClient(getAdminClient());
  await supabase
    .from("zoom_connection")
    .update({
      access_token_ciphertext: encryptSecret(token.access_token),
      refresh_token_ciphertext: encryptSecret(token.refresh_token ?? refreshToken),
      token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      scopes: token.scope ? token.scope.split(" ") : connection.scopes,
      status: "active",
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);
  return token.access_token;
}

export type ZoomConnectionRow = {
  id: string;
  label: string;
  owner_kind: "platform" | "coach";
  zoom_user_email: string | null;
  zoom_user_id: string | null;
  access_token_ciphertext: string | null;
  refresh_token_ciphertext: string | null;
  token_expires_at: string | null;
  scopes: string[] | null;
  status: "active" | "needs_reconnect" | "disabled";
};

export async function getZoomAccessToken(connectionId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("zoom_connection")
    .select<ZoomConnectionRow>(
      "id, label, owner_kind, zoom_user_email, zoom_user_id, access_token_ciphertext, refresh_token_ciphertext, token_expires_at, scopes, status"
    )
    .eq("id", connectionId)
    .maybeSingle();

  if (error || !data) throw new Error(error?.message ?? "Zoom connection not found.");
  if (data.status !== "active") throw new Error("Zoom connection is not active.");

  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) {
    const token = decryptSecret(data.access_token_ciphertext);
    if (token) return token;
  }
  return refreshZoomToken(data);
}

export async function fetchZoomMe(accessToken: string) {
  const response = await fetch("https://api.zoom.us/v2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Zoom user lookup failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<ZoomUser>;
}

export async function zoomApi<T>(connectionId: string, path: string, init: RequestInit = {}) {
  const token = await getZoomAccessToken(connectionId);
  const response = await fetch(`https://api.zoom.us/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Zoom API failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}
