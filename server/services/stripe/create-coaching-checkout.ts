import { config } from "@/lib/config";
import { getStripe } from "@/lib/stripe/config";

export type CoachingPackType = "single" | "punch_pass";

type CreateCoachingCheckoutOptions = {
  packType: CoachingPackType;
  userId?: string | null;
  customerId?: string | null;
  customerEmail?: string | null;
  sourcePath?: string | null;
};

function assertAppUrl(appUrl: string) {
  try {
    const parsed = new URL(appUrl);
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("invalid protocol");
  } catch {
    throw new Error(
      `[Stripe] NEXT_PUBLIC_APP_URL is not a valid absolute URL: "${appUrl}".`
    );
  }
}

function coachingPriceId(packType: CoachingPackType) {
  return packType === "single"
    ? config.stripe.prices.coachingSingle
    : config.stripe.prices.coachingPunchPass;
}

function packLabel(packType: CoachingPackType) {
  return packType === "single" ? "Single Coaching Session" : "Private Coaching Pass";
}

export async function createCoachingCheckoutSession({
  packType,
  userId,
  customerId,
  customerEmail,
  sourcePath,
}: CreateCoachingCheckoutOptions): Promise<{ url: string }> {
  const priceId = coachingPriceId(packType);

  if (!priceId) {
    throw new Error(
      `[Stripe] Missing coaching Stripe price for pack type: ${packType}.`
    );
  }

  const stripe = getStripe();
  const appUrl = config.app.url;
  assertAppUrl(appUrl);

  const normalizedSourcePath =
    sourcePath?.startsWith("/") && !sourcePath.startsWith("//")
      ? sourcePath
      : "/coaching-options";
  const isGuestCheckout = !userId;
  const accountCoachingPath = `/account/coaching?purchase=success&pack=${packType}`;
  const successUrl = isGuestCheckout
    ? `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}&next=${encodeURIComponent(
        accountCoachingPath
      )}`
    : `${appUrl}${accountCoachingPath}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customerId || undefined,
    customer_email: !customerId && customerEmail ? customerEmail : undefined,
    customer_creation: customerId ? undefined : "always",
    client_reference_id: userId ?? undefined,
    metadata: {
      purchase_type: "coaching_pack",
      pack_type: packType,
      priceId,
      sourcePath: normalizedSourcePath,
      ...(userId ? { member_id: userId, userId } : { guest: "true" }),
      ...(customerEmail ? { buyer_email: customerEmail } : {}),
    },
    payment_intent_data: {
      metadata: {
        purchase_type: "coaching_pack",
        pack_type: packType,
        ...(userId ? { member_id: userId, userId } : { guest: "true" }),
        ...(customerEmail ? { buyer_email: customerEmail } : {}),
      },
    },
    success_url: successUrl,
    cancel_url: `${appUrl}${normalizedSourcePath}`,
    allow_promotion_codes: true,
    locale: "auto",
    phone_number_collection: { enabled: true },
    name_collection: {
      individual: {
        enabled: true,
        optional: false,
      },
    },
    branding_settings: {
      background_color: "#FAFAFA",
      border_style: "rounded",
      button_color: "#2EC4B6",
      display_name: "Positives",
      font_family: "montserrat",
      icon: {
        type: "url",
        url: `${appUrl}/logos/png/positives-logos_positives-icon-square.png`,
      },
      logo: {
        type: "url",
        url: `${appUrl}/logos/png/positives-logos_Positives-logo-full.png`,
      },
    },
    custom_text: {
      after_submit: {
        message:
          packType === "punch_pass"
            ? "Your 10-session Private Coaching Pass will be added to your Positives account after checkout."
            : "Your coaching session will be added to your Positives account after checkout.",
      },
      submit: {
        message: `${packLabel(packType)} is a one-time coaching purchase through Positives.`,
      },
    },
  });

  if (!session.url) {
    throw new Error("[Stripe] Coaching checkout session was created but has no URL.");
  }

  return { url: session.url };
}
