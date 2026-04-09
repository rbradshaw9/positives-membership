import { createHash } from "crypto";
import { config } from "@/lib/config";

type MeasurementProtocolValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | MeasurementProtocolValue[]
  | { [key: string]: MeasurementProtocolValue };

type MeasurementProtocolParams = Record<string, MeasurementProtocolValue>;

interface TrackServerEventOptions {
  name: string;
  params?: MeasurementProtocolParams;
  userId?: string | null;
  clientSeed: string;
}

function buildClientId(seed: string) {
  const hash = createHash("sha256").update(seed).digest("hex");
  const left = BigInt(`0x${hash.slice(0, 12)}`).toString();
  const right = BigInt(`0x${hash.slice(12, 24)}`).toString();
  return `${left}.${right}`;
}

export async function trackServerEvent({
  name,
  params = {},
  userId,
  clientSeed,
}: TrackServerEventOptions) {
  const measurementId = config.analytics.measurementId;
  const apiSecret = config.analytics.measurementProtocolApiSecret;

  if (!measurementId || !apiSecret) {
    return;
  }

  const response = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: buildClientId(clientSeed),
        ...(userId ? { user_id: userId } : {}),
        non_personalized_ads: true,
        events: [
          {
            name,
            params: {
              engagement_time_msec: 1,
              ...params,
            },
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `[GA4] Measurement Protocol request failed (${response.status}): ${body || response.statusText}`
    );
  }
}
